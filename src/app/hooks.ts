import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { api, type CrmApi } from '@/services'
import type { Database } from '@/types'
import { loadDb } from './slices/data'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

/** Yuklangan demo baza. Faqat ma'lumotlar yuklangandan keyin (AppLayout ichida) ishlatiladi. */
export function useDb(): Database {
  const db = useAppSelector((state) => state.data.db)
  if (!db) throw new Error('Ma’lumotlar hali yuklanmagan')
  return db
}

/** Joriy vaqt; har daqiqada yangilanadi (muddat va kechikish hisoblari uchun). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

export function useRole() {
  return useAppSelector((state) => state.session.role)
}

export type RunResult<T> = { ok: true; value: T } | { ok: false }

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Kutilmagan xatolik yuz berdi'
}

/**
 * Mutatsiyani bajaradi: muvaffaqiyatda ma'lumotlarni yangilaydi va toast ko'rsatadi,
 * xatoda (masalan biznes qoidasi buzilganda) xato toastini chiqaradi.
 */
export function useRun() {
  const dispatch = useAppDispatch()
  return useCallback(
    async <T,>(action: (client: CrmApi) => Promise<T>, successMessage?: string): Promise<RunResult<T>> => {
      try {
        const value = await action(api)
        await dispatch(loadDb()).unwrap()
        if (successMessage) toast.success(successMessage)
        return { ok: true, value }
      } catch (error) {
        toast.error(errorMessage(error))
        return { ok: false }
      }
    },
    [dispatch],
  )
}

/** Qidiruv maydoni uchun kechiktirilgan qiymat. */
export function useDebounced<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Ma'lumotlar bazasidan hosil qilingan qidiruv lug'atlari. */
export function useLookups() {
  const db = useDb()
  return useMemo(
    () => ({
      products: new Map(db.products.map((item) => [item.id, item])),
      categories: new Map(db.categories.map((item) => [item.id, item])),
      customers: new Map(db.customers.map((item) => [item.id, item])),
      suppliers: new Map(db.suppliers.map((item) => [item.id, item])),
      employees: new Map(db.employees.map((item) => [item.id, item])),
      sales: new Map(db.sales.map((item) => [item.id, item])),
    }),
    [db],
  )
}
