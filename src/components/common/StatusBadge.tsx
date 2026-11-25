import { cn } from '@/lib/utils'
import type { LabelDef, Tone } from '@/utils/labels'

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-700 dark:text-red-400',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
}

interface StatusBadgeProps {
  status: LabelDef
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[status.tone],
        className,
      )}
    >
      {status.label}
    </span>
  )
}
