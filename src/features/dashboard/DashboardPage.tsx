import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  PackageX,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Boxes,
} from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDb, useLookups, useNow } from '@/app/hooks'
import { DateRangeFilter, useDateRange } from '@/components/common/DateRangeFilter'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { useT } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import {
  buildAlerts,
  computeSummary,
  dailySeries,
  overdueDebts,
  productSales,
  receivableSummary,
} from '@/utils/analytics'
import { diffInDays, formatDate, formatDateTime, rangeForPreset, toISODate } from '@/utils/date'
import { buildCustomerStats, debtRemaining, isRegularCustomer, salePaymentType } from '@/utils/finance'
import { formatMoney, formatNumber, formatPercent, formatQty } from '@/utils/format'
import { buildStockIndex, getExpiringBatches, getLowStock, isExpired } from '@/utils/stock'
import { MetricsGuide } from './MetricsGuide'
import { SalesChart } from './SalesChart'
import { TopProductsChart } from './TopProductsChart'

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
        {note && <span className="ml-2 font-normal normal-case tracking-normal">{note}</span>}
      </h3>
      {children}
    </section>
  )
}

function ListCard({ title, subtitle, to, children }: { title: string; subtitle?: string; to?: string; children: ReactNode }) {
  const t = useT()
  return (
    <section className="flex min-w-0 flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{title}</h3>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {to && (
          <Link to={to} className="shrink-0 text-xs text-primary hover:underline">
            {t('common.all')}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

export default function DashboardPage() {
  const db = useDb()
  const now = useNow()
  const t = useT()
  const lookups = useLookups()
  const { state, setState, range } = useDateRange('30d')

  const today = useMemo(() => computeSummary(db, rangeForPreset('today', now)), [db, now])
  const summary = useMemo(() => computeSummary(db, range), [db, range])
  const series = useMemo(() => dailySeries(db, range), [db, range])
  const topProducts = useMemo(() => productSales(db, range), [db, range])
  const receivable = useMemo(() => receivableSummary(db, now), [db, now])
  const customerStats = useMemo(() => buildCustomerStats(db), [db])
  const stockIndex = useMemo(() => buildStockIndex(db.batches, toISODate(now)), [db.batches, now])
  const lowStock = useMemo(() => getLowStock(db, stockIndex), [db, stockIndex])
  const expiring = useMemo(() => getExpiringBatches(db, now), [db, now])
  const expiredBatches = useMemo(() => getExpiringBatches(db, now, -1), [db, now])
  const lateDebts = useMemo(
    () => overdueDebts(db, now).sort((a, b) => diffInDays(now, b.dueDate) - diffInDays(now, a.dueDate)),
    [db, now],
  )
  const alerts = useMemo(() => buildAlerts(db, now, t), [db, now, t])

  const activeCustomers = db.customers.filter((customer) => customer.status === 'active')
  const regularCount = activeCustomers.filter((customer) => {
    const stats = customerStats.get(customer.id)
    return stats && isRegularCustomer(stats.segment)
  }).length
  const activeProducts = db.products.filter((product) => product.status === 'active')
  // "Ombordagi mahsulotlar" — faol turlar ichida haqiqatan sotuvga yaroqli zaxirasi borlari.
  const inStockCount = activeProducts.filter((product) => (stockIndex.get(product.id)?.sellable ?? 0) > 0).length
  const { stockValue, expiredStockValue } = useMemo(() => {
    const cost = new Map(db.products.map((product) => [product.id, product.costPrice]))
    const onDate = toISODate(now)
    let total = 0
    let expired = 0
    for (const batch of db.batches) {
      const value = batch.quantity * (cost.get(batch.productId) ?? 0)
      total += value
      if (isExpired(batch, onDate)) expired += value
    }
    return { stockValue: total, expiredStockValue: expired }
  }, [db.products, db.batches, now])
  const expiredLoss = expiredBatches.reduce((sum, row) => sum + row.batch.quantity * row.product.costPrice, 0)
  const margin = summary.salesAmount > 0 ? (summary.grossProfit / summary.salesAmount) * 100 : 0

  const recentSales = useMemo(
    () => [...db.sales].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7),
    [db.sales],
  )
  const recentInflows = useMemo(() => {
    const purchases = db.purchases
      .filter((purchase) => purchase.status === 'confirmed')
      .map((purchase) => ({
        id: purchase.id,
        date: purchase.date,
        title: t('dash.purchase', { number: purchase.number }),
        subtitle: lookups.suppliers.get(purchase.supplierId)?.name ?? t('dash.supplier'),
        amount: formatMoney(purchase.total),
      }))
    const receipts = db.stockDocs
      .filter((doc) => doc.kind === 'receipt')
      .map((doc) => ({
        id: doc.id,
        date: doc.date,
        title: t('dash.receipt', { number: doc.number }),
        subtitle: t('dash.itemsKinds', { n: doc.items.length }),
        amount: '',
      }))
    return [...purchases, ...receipts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7)
  }, [db.purchases, db.stockDocs, lookups.suppliers, t])

  const periodNote = `${formatDate(range.from)} – ${formatDate(range.to)}`

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('dash.title')}
        description={t('dash.subtitle', { date: formatDate(now) })}
        actions={
          <>
            <MetricsGuide />
            <DateRangeFilter state={state} onChange={setState} />
          </>
        }
      />

      <Section title={t('dash.section.today')}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('dash.today.sales')} value={formatMoney(today.salesAmount)} hint={t('dash.today.salesHint', { amount: formatMoney(today.creditSales) })} icon={ShoppingCart} tone="success" to="/sales" />
          <StatCard label={t('dash.today.count')} value={formatNumber(today.salesCount)} hint={t('dash.today.avg', { amount: formatMoney(today.averageCheck) })} icon={Receipt} tone="info" to="/sales" />
          <StatCard label={t('dash.today.revenue')} value={formatMoney(today.revenue)} hint={t('dash.today.revenueHint', { amount: formatMoney(today.debtCollected) })} icon={Banknote} tone="success" />
          <StatCard label={t('dash.today.profit')} value={formatMoney(today.grossProfit)} hint={t('dash.today.profitHint')} icon={TrendingUp} tone="info" />
        </div>
      </Section>

      <Section title={t('dash.section.period')} note={periodNote}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label={t('dash.period.sales')} value={formatMoney(summary.salesAmount)} hint={t('dash.period.salesHint', { count: formatNumber(summary.salesCount), amount: formatMoney(summary.creditSales) })} icon={ShoppingCart} tone="success" />
          <StatCard label={t('dash.period.revenue')} value={formatMoney(summary.revenue)} hint={t('dash.period.revenueHint', { amount: formatMoney(summary.debtCollected) })} icon={Banknote} tone="info" />
          <StatCard label={t('dash.period.cogs')} value={formatMoney(summary.cogs)} hint={t('dash.period.cogsHint')} icon={CircleDollarSign} tone="neutral" />
          <StatCard label={t('dash.period.gross')} value={formatMoney(summary.grossProfit)} hint={t('dash.period.grossHint', { percent: formatPercent(margin) })} icon={TrendingUp} tone="success" />
          <StatCard label={t('dash.period.expenses')} value={formatMoney(summary.expenses + summary.payrollCost)} hint={t('dash.period.expensesHint', { amount: formatMoney(summary.payrollCost) })} icon={Wallet} tone="warning" to="/expenses" />
          <StatCard label={t('dash.period.net')} value={formatMoney(summary.netProfit)} hint={t('dash.period.netHint')} icon={CircleDollarSign} tone={summary.netProfit >= 0 ? 'success' : 'danger'} to="/reports" />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title={t('dash.section.customers')}>
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
            <StatCard label={t('dash.cust.count')} value={formatNumber(activeCustomers.length)} hint={t('dash.cust.countHint')} icon={Users} tone="info" to="/customers" />
            <StatCard label={t('dash.cust.regular')} value={formatNumber(regularCount)} hint={t('dash.cust.regularHint')} icon={UserCheck} tone="success" to="/customers" />
            <StatCard label={t('dash.cust.debt')} value={formatMoney(receivable.total)} hint={t('dash.cust.debtHint', { count: receivable.debtorCount })} icon={HandCoins} tone="warning" to="/debts" />
            <StatCard label={t('dash.cust.overdue')} value={formatMoney(receivable.overdueTotal)} hint={t('dash.cust.overdueHint', { count: receivable.overdueCount })} icon={CalendarClock} tone={receivable.overdueCount > 0 ? 'danger' : 'neutral'} to="/debts?status=overdue" />
          </div>
        </Section>
        <Section title={t('dash.section.stock')}>
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
            <StatCard label={t('dash.stock.inStock')} value={formatNumber(inStockCount)} hint={t('dash.stock.inStockHint', { total: activeProducts.length })} icon={Boxes} tone="info" to="/products" />
            <StatCard label={t('dash.stock.low')} value={formatNumber(lowStock.length)} hint={t('dash.stock.lowHint')} icon={PackageX} tone={lowStock.length > 0 ? 'warning' : 'success'} to="/inventory?tab=low" />
            <StatCard label={t('dash.stock.expiring')} value={formatNumber(expiring.filter((row) => row.daysLeft >= 0).length)} hint={t('dash.stock.expiringHint', { count: expiredBatches.length })} icon={AlertTriangle} tone={expiring.length > 0 ? 'warning' : 'success'} to="/inventory?tab=expiry" />
            <StatCard label={t('dash.stock.value')} value={formatMoney(stockValue)} hint={expiredStockValue > 0 ? t('dash.stock.valueExpiredHint', { amount: formatMoney(expiredStockValue) }) : t('dash.stock.valueHint')} icon={Package} tone="neutral" to="/inventory" />
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ListCard title={t('dash.overdueDebts.title')} subtitle={`${formatMoney(receivable.overdueTotal)} · ${receivable.overdueCount}`} to="/debts?status=overdue">
          {lateDebts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('dash.overdueDebts.empty')}</p>
          ) : (
            <ul className="divide-y">
              {lateDebts.slice(0, 6).map((debt) => (
                <li key={debt.id}>
                  <Link to={`/customers/${debt.customerId}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/40">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{lookups.customers.get(debt.customerId)?.name ?? t('alert.unknownCustomer')}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t('dash.overdueDebts.late', { sale: debt.saleNumber, days: diffInDays(now, debt.dueDate) })}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-red-600 dark:text-red-400">{formatMoney(debtRemaining(debt))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ListCard>

        <ListCard
          title={t('dash.expired.title')}
          subtitle={expiredBatches.length > 0 ? t('dash.expired.loss', { amount: formatMoney(expiredLoss) }) : undefined}
          to="/inventory?tab=expiry"
        >
          {expiredBatches.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('dash.expired.empty')}</p>
          ) : (
            <ul className="divide-y">
              {expiredBatches.slice(0, 6).map((row) => (
                <li key={row.batch.id}>
                  <Link to="/inventory?tab=expiry" className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/40">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{row.product.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t('dash.expired.row', { location: t(`location.${row.batch.locationId}`), batch: row.batch.batchNo })}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-medium tabular-nums">{formatQty(row.batch.quantity, row.product.unit)}</span>
                      <span className="block text-xs text-red-600 dark:text-red-400">{t('expiry.expired', { n: Math.abs(row.daysLeft) })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SalesChart points={series} />
        <TopProductsChart rows={topProducts} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ListCard title={t('dash.recentSales')} to="/sales">
          <ul className="divide-y">
            {recentSales.map((sale) => (
              <li key={sale.id}>
                <Link to={`/sales?q=${sale.number}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/40">
                  <span className="min-w-0">
                    <span className="block font-medium">{sale.number}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDateTime(sale.date)} · {t(`pay.${salePaymentType(sale)}`)}
                    </span>
                  </span>
                  <span className={cn('shrink-0 font-medium tabular-nums', sale.status !== 'completed' && 'text-muted-foreground line-through')}>
                    {formatMoney(sale.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </ListCard>

        <ListCard title={t('dash.recentInflows')} to="/purchases">
          {recentInflows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('dash.noInflows')}</p>
          ) : (
            <ul className="divide-y">
              {recentInflows.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDateTime(item.date)} · {item.subtitle}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{item.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </ListCard>

        <ListCard title={t('dash.alerts')}>
          {alerts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('dash.noAlerts')}</p>
          ) : (
            <ul className="divide-y">
              {alerts.slice(0, 7).map((alert) => (
                <li key={alert.id}>
                  <Link to={alert.href} className="flex items-start gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/40">
                    <span
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', alert.severity === 'danger' ? 'bg-red-500' : 'bg-amber-500')}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{alert.title}</span>
                      <span className="block text-xs text-muted-foreground">{alert.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
      </div>
    </div>
  )
}
