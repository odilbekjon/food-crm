import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard, CHART_COLORS, axisProps, gridProps, moneyTick, moneyTooltip, tooltipProps } from '@/components/common/charts'
import { EmptyState } from '@/components/common/states'
import { useT } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/core'
import { cn } from '@/lib/utils'
import { groupSeries, type DailyPoint, type SeriesGrouping } from '@/utils/analytics'

const GROUPINGS: Array<{ id: SeriesGrouping; labelKey: MessageKey }> = [
  { id: 'day', labelKey: 'chart.group.day' },
  { id: 'week', labelKey: 'chart.group.week' },
  { id: 'month', labelKey: 'chart.group.month' },
]

export function SalesChart({ points }: { points: DailyPoint[] }) {
  const t = useT()
  const [grouping, setGrouping] = useState<SeriesGrouping>('day')
  const data = useMemo(() => groupSeries(points, grouping), [points, grouping])
  const hasData = data.some((point) => point.salesAmount > 0 || point.revenue > 0)

  return (
    <ChartCard
      title={t('chart.sales.title')}
      description={t('chart.sales.desc')}
      actions={
        <div role="group" aria-label={t('chart.group.label')} className="inline-flex rounded-lg bg-muted p-[3px]">
          {GROUPINGS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={grouping === item.id}
              onClick={() => setGrouping(item.id)}
              className={cn(
                'rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                grouping === item.id && 'bg-background text-foreground shadow-sm dark:bg-input/40',
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      }
    >
      {!hasData ? (
        <EmptyState title={t('chart.sales.empty')} />
      ) : (
        <div className="h-72" role="img" aria-label={t('chart.sales.aria')}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} minTickGap={16} />
              <YAxis {...axisProps} tickFormatter={moneyTick} width={52} />
              <Tooltip {...tooltipProps} formatter={moneyTooltip} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="salesAmount" name={t('chart.series.sales')} stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.12} strokeWidth={2} />
              <Area type="monotone" dataKey="revenue" name={t('chart.series.revenue')} stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.06} strokeWidth={2} />
              <Area type="monotone" dataKey="grossProfit" name={t('chart.series.profit')} stroke={CHART_COLORS.amber} fill={CHART_COLORS.amber} fillOpacity={0.06} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
