import { en } from './messages/en'
import { ru } from './messages/ru'
import { uz, type MessageKey, type Messages } from './messages/uz'

export type { MessageKey }
export type Lang = 'uz' | 'ru' | 'en'
export type TParams = Record<string, string | number>
export type TFn = (key: MessageKey, params?: TParams) => string

export const LANGUAGES: Array<{ id: Lang; name: string; short: string }> = [
  { id: 'uz', name: 'O‘zbekcha', short: 'UZ' },
  { id: 'ru', name: 'Русский', short: 'RU' },
  { id: 'en', name: 'English', short: 'EN' },
]

const DICTIONARIES: Record<Lang, Messages> = { uz, ru, en }
const STORAGE_KEY = 'food-crm:lang'

function isLang(value: unknown): value is Lang {
  return value === 'uz' || value === 'ru' || value === 'en'
}

function readStoredLang(): Lang {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (isLang(value)) return value
  } catch {
    /* localStorage mavjud emas */
  }
  return 'uz'
}

/**
 * Joriy til modul darajasida saqlanadi: format.ts, date.ts kabi React'dan tashqari
 * yordamchilar ham tilga mos matn chiqara olishi uchun. Til o'zgarganda daraxt qayta
 * yaratiladi (I18nProvider), shuning uchun eskirgan matn qolmaydi.
 */
let currentLang: Lang = readStoredLang()

export function getLang(): Lang {
  return currentLang
}

export function setLang(lang: Lang): void {
  currentLang = lang
  if (typeof document !== 'undefined') document.documentElement.lang = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* ignore */
  }
}

export function translate(lang: Lang, key: MessageKey, params?: TParams): string {
  const template = DICTIONARIES[lang][key] ?? uz[key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/** Joriy tilda tarjima qiladi (React'dan tashqarida ishlatish uchun). */
export const t: TFn = (key, params) => translate(currentLang, key, params)

if (typeof document !== 'undefined') document.documentElement.lang = currentLang
