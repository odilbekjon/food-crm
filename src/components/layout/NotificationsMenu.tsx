import { AlertTriangle, Bell, Clock, HandCoins, PackageX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDb, useNow } from '@/app/hooks'
import { useT } from '@/i18n/I18nProvider'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { AlertItem } from '@/types'
import { buildAlerts } from '@/utils/analytics'

const KIND_ICON = {
  low_stock: PackageX,
  expiring: Clock,
  expired: AlertTriangle,
  overdue_debt: HandCoins,
} as const

export function NotificationsMenu() {
  const db = useDb()
  const now = useNow()
  const t = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const alerts = useMemo(() => buildAlerts(db, now, t), [db, now, t])
  const dangerCount = alerts.filter((alert) => alert.severity === 'danger').length

  const open_ = (alert: AlertItem) => {
    setOpen(false)
    navigate(alert.href)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label={t('notif.aria', { n: alerts.length })} />
        }
      >
        <Bell />
        {alerts.length > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white',
              dangerCount > 0 ? 'bg-red-600' : 'bg-amber-500',
            )}
          >
            {alerts.length > 99 ? '99+' : alerts.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] gap-0 p-0">
        <div className="border-b px-3 py-2.5">
          <p className="text-sm font-medium">{t('notif.title')}</p>
          <p className="text-xs text-muted-foreground">{t('notif.subtitle')}</p>
        </div>
        {alerts.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('notif.empty')}</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto p-1">
            {alerts.slice(0, 30).map((alert) => {
              const Icon = KIND_ICON[alert.kind]
              return (
                <li key={alert.id}>
                  <button
                    type="button"
                    onClick={() => open_(alert)}
                    className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <Icon
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        alert.severity === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{alert.title}</span>
                      <span className="block text-xs text-muted-foreground">{alert.description}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
