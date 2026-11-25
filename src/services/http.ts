import { t } from '@/i18n/core'
import { API_URL } from './config'

/** Server qaytargan xato: `{ error: { code, message, fields } }`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

let unauthorizedHandler: (() => void) | null = null

/** Sessiya tugaganda (401) chaqiriladi; foydalanuvchini login sahifasiga qaytarish uchun. */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export async function request<T = unknown>(method: Method, path: string, body?: unknown, options: { silent401?: boolean } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network', t('common.networkError'))
  }

  const payload = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null
  if (response.ok) return payload as T

  const error = payload?.error
  if (response.status === 401 && !options.silent401) unauthorizedHandler?.()
  throw new ApiError(response.status, error?.code ?? 'unknown', error?.message ?? t('common.unknownError'), error?.fields)
}
