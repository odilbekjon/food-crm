import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-4 py-12 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </span>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ title = 'Xatolik yuz berdi', message, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-2 px-4 py-12 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {message && <p className="max-w-sm text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw /> Qayta urinish
        </Button>
      )}
    </div>
  )
}

/** Sahifa yuklanayotganda ko'rsatiladigan skeleton. */
export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Yuklanmoqda">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}
