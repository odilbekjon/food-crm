import type { Database } from '@/types'
import { DB_VERSION, buildSeedDatabase } from './seed'

/**
 * Brauzer saqlash adapteri (faqat prototip uchun).
 * Demo baza hajmi localStorage chegarasidan (~5 MB) katta bo'lishi mumkin, shuning uchun
 * IndexedDB ishlatiladi; u mavjud bo'lmasa, ma'lumotlar faqat xotirada saqlanadi.
 * Backend tayyor bo'lgach asosiy ma'lumot manbai server bo'ladi.
 */
const DB_NAME = 'food-crm'
const STORE_NAME = 'kv'
const RECORD_KEY = `db-v${DB_VERSION}`

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB mavjud emas'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbRun<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openIdb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

async function readStored(): Promise<Database | null> {
  try {
    const stored = await idbRun<Database | undefined>('readonly', (store) => store.get(RECORD_KEY))
    return stored?.meta?.version === DB_VERSION ? stored : null
  } catch {
    return null
  }
}

async function persist(db: Database): Promise<void> {
  try {
    await idbRun('readwrite', (store) => store.put(db, RECORD_KEY))
  } catch (error) {
    console.warn('Demo ma’lumotlarni saqlab bo‘lmadi (IndexedDB):', error)
  }
}

function sameDay(iso: string, date: Date): boolean {
  const left = new Date(iso)
  return left.getFullYear() === date.getFullYear() && left.getMonth() === date.getMonth() && left.getDate() === date.getDate()
}

let current: Database | null = null
let loading: Promise<Database> | null = null
/** Yozishlar ketma-ket bajariladi, shunda ikkita tez amal bir-birini bosib ketmaydi. */
let queue: Promise<unknown> = Promise.resolve()

async function ensureLoaded(): Promise<Database> {
  if (current) return current
  loading ??= (async () => {
    const now = new Date()
    const stored = await readStored()
    // O'zgartirilmagan demo ma'lumotlar yangi kunda qayta yaratiladi — "bugungi" ko'rsatkichlar bo'sh qolmasligi uchun.
    if (stored && (stored.meta.modified || sameDay(stored.meta.seededAt, now))) {
      current = stored
    } else {
      current = buildSeedDatabase(now)
      await persist(current)
    }
    return current
  })()
  return loading
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function readAll(): Promise<Database> {
  const [db] = await Promise.all([ensureLoaded(), delay(200)])
  return structuredClone(db)
}

export async function resetDatabase(): Promise<void> {
  await queue
  current = buildSeedDatabase(new Date())
  loading = Promise.resolve(current)
  await persist(current)
}

/**
 * Yozish tranzaksiyasi: ma'lumotlar nusxasida o'zgartirish bajariladi va faqat xatosiz
 * tugasa saqlanadi. Biznes qoidasi buzilsa, baza o'zgarishsiz qoladi.
 */
export function transaction<T>(fn: (db: Database, now: Date) => T): Promise<T> {
  const run = async (): Promise<T> => {
    const db = await ensureLoaded()
    await delay(120)
    const draft = structuredClone(db)
    const result = fn(draft, new Date())
    draft.meta.modified = true
    current = draft
    await persist(draft)
    return result
  }
  const next = queue.then(run, run)
  queue = next.catch(() => undefined)
  return next
}
