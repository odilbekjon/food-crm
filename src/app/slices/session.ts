import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isRemote } from '@/services/config'
import { authApi, type UserProfile } from '@/services/auth'
import type { RoleId } from '@/types'

const STORAGE_KEY = 'food-crm:role'
const ROLES: RoleId[] = ['owner', 'manager', 'cashier', 'storekeeper', 'accountant']

/** Demo rejimda tanlangan rol (UI ruxsatlarini ko'rsatish uchun). Server rejimida rolni server beradi. */
function readRole(fallback: RoleId): RoleId {
  if (isRemote) return fallback
  try {
    const value = localStorage.getItem(STORAGE_KEY) as RoleId | null
    if (value && ROLES.includes(value)) return value
  } catch {
    /* ignore */
  }
  return fallback
}

function storeRole(role: RoleId) {
  if (isRemote) return
  try {
    localStorage.setItem(STORAGE_KEY, role)
  } catch {
    /* ignore */
  }
}

interface SessionState {
  /** Kirgan foydalanuvchi; `null` — tizimga kirilmagan */
  user: UserProfile | null
  /** Demo rejimda — tanlangan rol; server rejimida — serverdagi haqiqiy rol */
  role: RoleId
  /** Sessiya holati aniqlanganmi (server rejimida sahifa ochilganda `GET /auth/me` kutiladi) */
  ready: boolean
}

// Demo rejimda localStorage'dan sinxron o'qiladi (miltillamaslik uchun); server rejimida restoreSession kutiladi.
const initialUser = authApi.peek?.() ?? null
const initialState: SessionState = { user: initialUser, role: readRole(initialUser?.role ?? 'owner'), ready: !isRemote }

/** Sahifa ochilganda mavjud sessiyani tiklaydi. */
export const restoreSession = createAsyncThunk('session/restore', () => authApi.restore())

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setRole(state, action: PayloadAction<RoleId>) {
      state.role = action.payload
      storeRole(action.payload)
    },
    /** Kirish/ro'yxatdan o'tishdan keyin: rol foydalanuvchining roliga o'rnatiladi. */
    signedIn(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload
      state.role = action.payload.role
      storeRole(action.payload.role)
    },
    profileUpdated(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload
      state.role = action.payload.role
    },
    signedOut(state) {
      state.user = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.ready = true
        state.user = action.payload
        if (action.payload) state.role = action.payload.role
      })
      .addCase(restoreSession.rejected, (state) => {
        state.ready = true
        state.user = null
      })
  },
})

export const { setRole, signedIn, profileUpdated, signedOut } = sessionSlice.actions
export default sessionSlice.reducer
