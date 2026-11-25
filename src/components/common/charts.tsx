import type { ReactNode } from 'react'
import { formatCompactMoney, formatMoney } from '@/utils/format'

/** Recharts uchun umumiy stil va formatlovchilar (tema o'zgaruvchilari orqali light/dark ishlaydi). */
export const CHART_COLORS = {
  primary: 'var(--chart-1)',
  blue: 'var(--chart-2)',
  amber: 'var(--chart-3)',
  red: 'var(--chart-4)',
  violet: 'var(--chart-5)',
} as const

export const axisProps = {
  stroke: 'var(--muted-foreground)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

export const gridProps = {
  stroke: 'var(--border)',
  strokeDasharray: '3 3',
  vertical: false,
} as const

export const tooltipProps = {
  contentStyle: {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--popover-foreground)',
    fontSize: 12,
    boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
  },
  labelStyle: { color: 'var(--muted-foreground)', marginBottom: 4 },
  cursor: { fill: 'var(--muted)', opacity: 0.5 },
} as const

export const moneyTick = (value: number) => formatCompactMoney(value)
export const moneyTooltip = (value: unknown) => formatMoney(Number(value))

export function ChartCard({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="min-w-0 rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}
