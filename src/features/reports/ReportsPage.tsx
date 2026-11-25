import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { useDb, useNow } from '@/app/hooks'
import { ChartCard, CHART_COLORS, axisProps, gridProps, moneyTick, moneyTooltip, tooltipProps } from '@/components/common/charts'
import { DateRangeFilter, useDateRange } from '@/components/common/DateRangeFilter'
import { SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SeriesGrouping } from '@/utils/analytics'
import { downloadCsv } from '@/utils/csv'
import { formatDate, toISODate } from '@/utils/date'
import { formatMoney, formatNumber, formatQty } from '@/utils/format'
import {
  customersReport,
  debtsReport,
  employeesReport,
  formatCell,
  productsReport,
  profitReport,
  purchasesReport,
  salesReport,
  stockReport,
  type ReportData,
  type ReportRow,
} from './builders'

const formatters = { money: formatMoney, qty: (n: number) => formatQty(n), number: (n: number) => formatNumber(n) }
const SERIES_COLORS = [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.amber]

function ReportView({ report, filename, note }: { report: ReportData; filename: string; note?: string }) {
  const columns: Column<ReportRow>[] = report.columns.map((column) => ({
    key: column.key,
    header: column.label,
    align: column.type === 'text' ? 'left' : 'right',
    sortValue: (row) => (column.type === 'date' ? (row[column.key] as string | null) : (row[column.key] as string | number | null)),
    cell: (row) => <span className={column.type === 'text' ? '' : 'tabular-nums'}>{formatCell(column.type, row[column.key], formatters)}</span>,
  }))

  const exportCsv = () => {
    downloadCsv(
      `${filename}-${toISODate(new Date())}`,
      report.columns.map((column) => column.label),
      report.rows.map((row) => report.columns.map((column) => (column.type === 'date' ? formatDate(row[column.key] as string | null) : (row[column.key] as string | number | null)))),
    )
    toast.success(`CSV yuklab olindi: ${report.rows.length} ta qator`)
  }

  const showChart = report.chart && report.rows.length > 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {report.title} · {formatNumber(report.rows.length)} ta qator {note && <span>· {note}</span>}
        </p>
        <Button variant="outline" onClick={exportCsv} disabled={report.rows.length === 0}>
          <Download /> CSV yuklab olish
        </Button>
      </div>
      {showChart && report.chart && (
        <ChartCard title={report.title} description="Tanlangan davr bo‘yicha">
          <div className="h-64" role="img" aria-label={`${report.title} grafigi`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey={report.chart.xKey} {...axisProps} minTickGap={12} />
                <YAxis {...axisProps} tickFormatter={moneyTick} width={52} />
                <Tooltip {...tooltipProps} formatter={moneyTooltip} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {report.chart.series.map((series, index) => (
                  <Bar key={series.key} dataKey={series.key} name={series.label} fill={SERIES_COLORS[index % SERIES_COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
      <DataTable
        data={report.rows}
        columns={columns}
        rowKey={(row) => `${report.columns.map((column) => String(row[column.key] ?? '')).join('|')}`}
        pageSize={20}
        caption={report.title}
        emptyTitle="Ma’lumot topilmadi"
        emptyDescription="Tanlangan davrda ma’lumot yo‘q."
        footer={
          report.totals ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t bg-muted/40 px-4 py-2 text-sm">
              {report.columns
                .filter((column) => column.type !== 'text' && report.totals && report.totals[column.key] !== undefined)
                .map((column) => (
                  <span key={column.key}>
                    <span className="text-muted-foreground">{column.label}: </span>
                    <span className="font-semibold tabular-nums">{formatCell(column.type, report.totals?.[column.key], formatters)}</span>
                  </span>
                ))}
            </div>
          ) : undefined
        }
      />
    </div>
  )
}

const TABS = [
  { id: 'sales', label: 'Savdo' },
  { id: 'products', label: 'Mahsulotlar' },
  { id: 'profit', label: 'Foyda va xarajatlar' },
  { id: 'stock', label: 'Qoldiqlar' },
  { id: 'debts', label: 'Qarzdorlik' },
  { id: 'customers', label: 'Mijozlar' },
  { id: 'employees', label: 'Xodimlar' },
  { id: 'purchases', label: 'Xaridlar' },
] as const

type TabId = (typeof TABS)[number]['id']
/** Sana filtri ta'sir qilmaydigan hisobotlar (joriy holat) */
const SNAPSHOT_TABS: TabId[] = ['stock', 'debts']

export default function ReportsPage() {
  const db = useDb()
  const now = useNow()
  const { state, setState, range } = useDateRange('30d')
  const [tab, setTab] = useState<TabId>('sales')
  const [grouping, setGrouping] = useState<SeriesGrouping>('day')

  const report = useMemo<ReportData>(() => {
    switch (tab) {
      case 'sales':
        return salesReport(db, range, grouping)
      case 'products':
        return productsReport(db, range)
      case 'profit':
        return profitReport(db, range)
      case 'stock':
        return stockReport(db)
      case 'debts':
        return debtsReport(db, now)
      case 'customers':
        return customersReport(db, range)
      case 'employees':
        return employeesReport(db, range)
      case 'purchases':
        return purchasesReport(db, range)
    }
  }, [db, tab, range, grouping, now])

  const snapshot = SNAPSHOT_TABS.includes(tab)

  return (
    <div className="space-y-4">
      <PageHeader title="Hisobotlar" description="Savdo, foyda, qoldiq, qarzdorlik va faollik hisobotlari. CSV formatida yuklab olish mumkin." />
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter state={state} onChange={setState} className={snapshot ? 'pointer-events-none opacity-50' : undefined} />
        {tab === 'sales' && (
          <SimpleSelect
            value={grouping}
            onChange={(value) => setGrouping(value as SeriesGrouping)}
            className="w-40"
            aria-label="Guruhlash"
            options={[{ value: 'day', label: 'Kunlik' }, { value: 'week', label: 'Haftalik' }, { value: 'month', label: 'Oylik' }]}
          />
        )}
        {snapshot && <span className="text-xs text-muted-foreground">Bu hisobot joriy holatni ko‘rsatadi — sana filtri qo‘llanmaydi</span>}
      </div>
      <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)}>
        <div className="overflow-x-auto pb-1">
          <TabsList>
            {TABS.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="px-3">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TABS.map((item) => (
          <TabsContent key={item.id} value={item.id} className="mt-1">
            {tab === item.id && <ReportView report={report} filename={`hisobot-${item.id}`} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
