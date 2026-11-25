import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '@/services'
import { signedOut } from './session'
import type { Database } from '@/types'

export interface DataState {
  db: Database | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
}

const initialState: DataState = { db: null, status: 'idle', error: null }

/** Ma'lumotlarni servis qatlamidan (hozir mock) yuklaydi; har bir mutatsiyadan keyin ham chaqiriladi. */
export const loadDb = createAsyncThunk('data/load', () => api.loadAll())

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Chiqishda oldingi foydalanuvchi ma'lumoti xotirada qolmasligi kerak
      .addCase(signedOut, () => initialState)
      .addCase(loadDb.pending, (state) => {
        // Qayta yuklashda mavjud ma'lumot ko'rinib turadi (skeleton faqat birinchi marta)
        if (!state.db) state.status = 'loading'
      })
      .addCase(loadDb.fulfilled, (state, action) => {
        state.db = action.payload
        state.status = 'ready'
        state.error = null
      })
      .addCase(loadDb.rejected, (state, action) => {
        state.status = state.db ? 'ready' : 'error'
        state.error = action.error.message ?? 'Ma’lumotlarni yuklab bo‘lmadi'
      })
  },
})

export default dataSlice.reducer
