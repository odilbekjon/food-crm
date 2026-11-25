import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard, CHART_COLORS, axisProps, gridProps, moneyTick, moneyTooltip, tooltipProps } from '@/components/common/charts'
import { EmptyState } from '@/components/common/states'
import { useT } from '@/i18n/I18nProvider'
import type { TopProductRow } from '@/utils/analytics'

export function TopProductsChart({ rows }: { rows: TopProductRow[] }) {
  const t = useT()
  const data = rows.slice(0, 8).map((row) => ({ ...row, short: row.name.length > 18 ? `${row.name.slice(0, 17)}…` : row.name }))
  return (
    <ChartCard title={t('chart.top.title')} description={t('chart.top.desc')}>
      {data.length === 0 ? (
        <EmptyState title={t('chart.top.empty')} />
      ) : (
        <div className="h-72" role="img" aria-label={t('chart.top.aria')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" {...axisProps} tickFormatter={moneyTick} />
              <YAxis type="category" dataKey="short" {...axisProps} width={110} />
              <Tooltip {...tooltipProps} formatter={moneyTooltip} labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''} />
              <Bar dataKey="amount" name={t('chart.series.sales')} fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
