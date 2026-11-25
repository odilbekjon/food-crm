import type { RoleId } from '@/types'
import { ApiError, request } from '../http'
import { AuthError, type AuthApi, type UserProfile } from './types'

interface MeResponse {
  user: { id: string; name: string; email: string; phone: string; createdAt: string }
  current: { shopId: string; role: RoleId }
  memberships: Array<{ shopId: string; shopName: string; role: RoleId }>
}

/** Server javobini frontend profiliga o'giradi (do'kon nomi va rol — joriy a'zolikdan). */
function toProfile(me: MeResponse): UserProfile {
  const shop = me.memberships.find((membership) => membership.shopId === me.current.shopId)
  return { ...me.user, role: me.current.role, storeName: shop?.shopName ?? '' }
}

/** Cookie-sessiya bilan ishlovchi haqiqiy server. Parol va sessiya brauzerda saqlanmaydi. */
export const httpAuthApi: AuthApi = {
  async restore() {
    try {
      return toProfile(await request<MeResponse>('GET', '/auth/me', undefined, { silent401: true }))
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null
      throw error
    }
  },

  async login(email, password) {
    try {
      return toProfile(await request<MeResponse>('POST', '/auth/login', { email, password }, { silent401: true }))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_credentials') throw new AuthError('invalid_credentials')
      throw error
    }
  },

  async signup(input) {
    try {
      return toProfile(await request<MeResponse>('POST', '/auth/signup', input))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'email_taken') throw new AuthError('email_taken')
      throw error
    }
  },

  async logout() {
    try {
      await request('POST', '/auth/logout', undefined, { silent401: true })
    } catch {
      /* sessiya allaqachon tugagan bo'lishi mumkin */
    }
  },

  async updateProfile(update) {
    const me = await request<MeResponse>('PATCH', '/auth/profile', { name: update.name, phone: update.phone })
    const current = toProfile(me)
    // Do'kon nomi — do'kon sozlamasi (faqat egasi o'zgartira oladi)
    if (update.storeName.trim() !== current.storeName) {
      await request('PATCH', '/settings', { storeName: update.storeName })
      return toProfile(await request<MeResponse>('GET', '/auth/me'))
    }
    return current
  },

  async changePassword(current, next) {
    try {
      await request('POST', '/auth/change-password', { current, next })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'wrong_password') throw new AuthError('wrong_password')
      throw error
    }
  },
}
