import { Store } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_GROUPS } from '@/app/navigation'
import { useDb, useRole } from '@/app/hooks'
import { useT } from '@/i18n/I18nProvider'
import { canView } from '@/lib/permissions'
import { isRemote } from '@/services/config'
import { cn } from '@/lib/utils'

interface SidebarNavProps {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const db = useDb()
  const role = useRole()
  const t = useT()
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{db.settings.storeName}</p>
          <p className="text-xs leading-tight text-muted-foreground">{t('app.name')}</p>
        </div>
      </div>
      <nav aria-label={t('nav.aria')} className="flex-1 space-y-4 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => canView(role, item.module))
          if (items.length === 0) return null
          return (
            <div key={group.labelKey}>
              <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t(group.labelKey)}</p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                          isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
                        )
                      }
                    >
                      <item.icon className="size-4" aria-hidden />
                      {t(item.labelKey)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
      {!isRemote && <p className="border-t p-3 text-[11px] text-muted-foreground">{t('nav.demoNote')}</p>}
    </div>
  )
}
