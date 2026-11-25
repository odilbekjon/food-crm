import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Tone } from '@/utils/labels'
import { TONE_CLASSES } from './StatusBadge'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: Tone
  className?: string
  /** Berilsa, karta tegishli sahifaga havola bo'ladi */
  to?: string
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'neutral', className, to }: StatCardProps) {
  const card = (
    <Card className={cn('h-full py-0', to && 'transition-colors hover:bg-muted/40', className)}>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONE_CLASSES[tone])}>
            <Icon className="size-4.5" aria-hidden />
          </span>
        )}
      </CardContent>
    </Card>
  )
  if (!to) return card
  return (
    <Link to={to} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {card}
    </Link>
  )
}
