import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { loadDb } from '@/app/slices/data'
import { ErrorState, PageSkeleton } from '@/components/common/states'
import { useT } from '@/i18n/I18nProvider'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { SidebarNav } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const dispatch = useAppDispatch()
  const status = useAppSelector((state) => state.data.status)
  const error = useAppSelector((state) => state.data.error)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const t = useT()

  useEffect(() => {
    if (status === 'idle') void dispatch(loadDb())
  }, [dispatch, status])

  useEffect(() => setMenuOpen(false), [location.pathname])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="p-6">
        <PageSkeleton />
      </div>
    )
  }
  if (status === 'error') {
    return <ErrorState title={t('layout.loadError')} message={error ?? undefined} onRetry={() => void dispatch(loadDb())} className="min-h-screen" />
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block">
        <SidebarNav />
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 gap-0 p-0 data-[side=left]:sm:max-w-64" showCloseButton={false}>
          <SheetTitle className="sr-only">{t('nav.drawerTitle')}</SheetTitle>
          <SheetDescription className="sr-only">{t('nav.drawerDesc')}</SheetDescription>
          <SidebarNav onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-60">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1500px] p-3 sm:p-4 lg:p-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
