import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { PageSkeleton } from '@/components/common/states'

/** Server sessiyani tekshirib bo'lguncha (sahifa ochilganda) qisqa kutish holati. */
function SessionLoading() {
  return (
    <div className="p-6">
      <PageSkeleton />
    </div>
  )
}

/** Kirmagan foydalanuvchini /login ga yo'naltiradi (kirgach avvalgi sahifaga qaytadi). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAppSelector((state) => state.session.user)
  const ready = useAppSelector((state) => state.session.ready)
  const location = useLocation()
  if (!ready) return <SessionLoading />
  if (!user) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={from === '/' ? undefined : { from }} />
  }
  return <>{children}</>
}

/** Allaqachon kirgan foydalanuvchi login/signup sahifalarini ko'rmaydi. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const user = useAppSelector((state) => state.session.user)
  const ready = useAppSelector((state) => state.session.ready)
  if (!ready) return <SessionLoading />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}
