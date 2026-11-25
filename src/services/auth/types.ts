import type { RoleId } from '@/types'

/**
 * Autentifikatsiya kontrakti. Ikki implementatsiya: demo (brauzer localStorage, `mock.ts`) va
 * haqiqiy server (`http.ts`, cookie-sessiya). Qaysi biri ishlatilishi `services/index.ts`/`auth/index.ts` da tanlanadi.
 */
export interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  storeName: string
  role: RoleId
  createdAt: string
}

export interface SignupInput {
  name: string
  storeName: string
  phone: string
  email: string
  password: string
}

export interface ProfileUpdate {
  name: string
  phone: string
  storeName: string
}

/** UI tarjima qiladigan xato kodlari. */
export type AuthErrorCode = 'invalid_credentials' | 'email_taken' | 'wrong_password' | 'not_signed_in'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode) {
    super(code)
    this.code = code
  }
}

export interface AuthApi {
  /** Demo rejimda: sahifa ochilishida login holatini miltillamasdan (sinxron) aniqlash uchun. */
  peek?(): UserProfile | null
  /** Sahifa ochilganda mavjud sessiyani tiklaydi (server rejimida — `GET /auth/me`). */
  restore(): Promise<UserProfile | null>
  login(email: string, password: string): Promise<UserProfile>
  signup(input: SignupInput): Promise<UserProfile>
  logout(): Promise<void>
  updateProfile(update: ProfileUpdate): Promise<UserProfile>
  changePassword(current: string, next: string): Promise<void>
}

export const DEMO_ACCOUNT = { email: 'demo@foodcrm.uz', password: 'Demo1234' } as const

