import { eachDayOfInterval, format } from 'date-fns'
import { t as tNow, type TFn } from '@/i18n/core'
import type { AlertItem, Database, Debt, Sale } from '@/types'
import { diffInDays, isInRange, monthKey, parseISO, toISODate, weekKey, type DateRange } from '@/utils/date'
import {
  debtRemaining,
  debtStatus,
  payrollCost,
  saleCost,
  totalReceivable,
} from '@/utils/finance'
import { formatMoney, formatQty } from '@/utils/format'
import { buildStockIndex, expiryLabel, getExpiringBatches, getLowStock } from '@/utils/stock'

/* ----------------------------- Savdo va foyda ----------------------------- */

export function salesInRange(db: Database, range: DateRange): Sale[] {
  return db.sales.filter((sale) => sale.status === 'completed' && isInRange(sale.date, range))
}

export interface PeriodSummary {
  /** Savdo summasi — sotilgan tovarlar qiymati (chegirmadan keyin) */
  salesAmount: number
  salesCount: number
  discountTotal: number
  /** Tushum — amalda kelib tushgan to'lovlar (nasiya to'lovlari ham) */
  revenue: number
  /** Davrdagi savdolarning nasiyaga (to'lanmay) qolgan qismi */
  creditSales: number
  /** Tushumning shu davrda yig'ilgan nasiya to'lovlaridan iborat qismi */
  debtCollected: number
  /** Sotilgan mahsulotlar tannarxi */
  cogs: number
  /** Yalpi foyda = savdo summasi − tannarx */
  grossProfit: number
  expenses: number
  payrollCost: number
  /** Sof foyda = yalpi foyda − xarajatlar − tasdiqlangan oyliklar */
  netProfit: number
  averageCheck: number
}

export function computeSummary(db: Database, range: DateRange): PeriodSummary {
  const sales = salesInRange(db, range)
  const salesAmount = sales.reduce((sum, sale) => sum + sale.total, 0)
  const cogs = sales.reduce((sum, sale) => sum + saleCost(sale), 0)
  const discountTotal = sales.reduce((sum, sale) => sum + sale.discount, 0)

  const completedIds = new Set(db.sales.filter((sale) => sale.status === 'completed').map((sale) => sale.id))
  const periodPayments = db.payments.filter((payment) => completedIds.has(payment.saleId) && isInRange(payment.date, range))
  const revenue = periodPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const debtCollected = periodPayments
    .filter((payment) => payment.kind === 'debt_payment')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const creditSales = sales.reduce((sum, sale) => sum + sale.debtAmount, 0)

  const expenses = db.expenses
    .filter((expense) => isInRange(expense.date, range))
    .reduce((sum, expense) => sum + expense.amount, 0)
  const payroll = db.payroll
    .filter((record) => record.approvedAt && isInRange(record.approvedAt, range))
    .reduce((sum, record) => sum + payrollCost(record), 0)

  const grossProfit = salesAmount - cogs
  return {
    salesAmount,
    salesCount: sales.length,
    discountTotal,
    revenue,
    creditSales,
    debtCollected,
    cogs,
    grossProfit,
    expenses,
    payrollCost: payroll,
    netProfit: grossProfit - expenses - payroll,
    averageCheck: sales.length ? Math.round(salesAmount / sales.length) : 0,
  }
}

export interface DailyPoint {
  date: string
  label: string
  salesAmount: number
  revenue: number
  grossProfit: number
  count: number
}

export function dailySeries(db: Database, range: DateRange): DailyPoint[] {
  const days = eachDayOfInterval({ start: range.from, end: range.to })
  const points = new Map<string, DailyPoint>(
    days.map((day) => [
      toISODate(day),
      { date: toISODate(day), label: format(day, 'dd.MM'), salesAmount: 0, revenue: 0, grossProfit: 0, count: 0 },
    ]),
  )
  const completedIds = new Set<string>()
  for (const sale of db.sales) {
    if (sale.status !== 'completed') continue
    completedIds.add(sale.id)
    const point = points.get(toISODate(new Date(sale.date)))
    if (!point) continue
    point.salesAmount += sale.total
    point.grossProfit += sale.total - saleCost(sale)
    point.count += 1
  }
  for (const payment of db.payments) {
    if (!completedIds.has(payment.saleId)) continue
    const point = points.get(toISODate(new Date(payment.date)))
    if (point) point.revenue += payment.amount
  }
  return [...points.values()]
}

export type SeriesGrouping = 'day' | 'week' | 'month'

/** Kunlik nuqtalarni haftalik yoki oylik guruhlarga jamlaydi. */
export function groupSeries(points: DailyPoint[], grouping: SeriesGrouping): DailyPoint[] {
  if (grouping === 'day') return points
  const groups = new Map<string, DailyPoint>()
  for (const point of points) {
    const key = grouping === 'week' ? weekKey(point.date) : monthKey(point.date)
    const group = groups.get(key) ?? {
      date: key,
      label: grouping === 'week' ? format(parseISO(key), 'dd.MM') : format(parseISO(key), 'MM.yyyy'),
      salesAmount: 0,
      revenue: 0,
      grossProfit: 0,
      count: 0,
    }
    group.salesAmount += point.salesAmount
    group.revenue += point.revenue
    group.grossProfit += point.grossProfit
    group.count += point.count
    groups.set(key, group)
  }
  return [...groups.values()]
}

export interface TopProductRow {
  productId: string
  name: string
  unit: string
  quantity: number
  amount: number
  profit: number
}

export function productSales(db: Database, range: DateRange): TopProductRow[] {
  const rows = new Map<string, TopProductRow>()
  for (const sale of salesInRange(db, range)) {
    // Chegirma savdo bo'yicha umumiy; mahsulotlar kesimida pozitsiya summasi olinadi.
    for (const item of sale.items) {
      const row = rows.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        unit: item.unit,
        quantity: 0,
        amount: 0,
        profit: 0,
      }
      row.quantity += item.quantity
      row.amount += item.total
      row.profit += item.total - item.costPrice * item.quantity
      rows.set(item.productId, row)
    }
  }
  return [...rows.values()].sort((a, b) => b.amount - a.amount)
}

/* ----------------------------- Qarzdorlik ----------------------------- */

export function activeDebts(db: Database): Debt[] {
  return db.debts.filter((debt) => debtRemaining(debt) > 0)
}

export function overdueDebts(db: Database, now: Date): Debt[] {
  return db.debts.filter((debt) => debtStatus(debt, now) === 'overdue')
}

export function receivableSummary(db: Database, now: Date) {
  const open = activeDebts(db)
  const overdue = overdueDebts(db, now)
  return {
    total: totalReceivable(db.debts),
    openCount: open.length,
    overdueTotal: totalReceivable(overdue),
    overdueCount: overdue.length,
    debtorCount: new Set(open.map((debt) => debt.customerId)).size,
  }
}

/* ----------------------------- Ogohlantirishlar ----------------------------- */

export function buildAlerts(db: Database, now: Date, t: TFn = tNow): AlertItem[] {
  const alerts: AlertItem[] = []
  const index = buildStockIndex(db.batches)

  for (const row of getExpiringBatches(db, now, 7)) {
    const expired = row.daysLeft < 0
    alerts.push({
      id: `exp_${row.batch.id}`,
      kind: expired ? 'expired' : 'expiring',
      severity: expired || row.daysLeft <= 2 ? 'danger' : 'warning',
      title: `${row.product.name} — ${expiryLabel(row.daysLeft, t).toLowerCase()}`,
      description: t('alert.expiryDesc', {
        location: t(`location.${row.batch.locationId}`),
        qty: formatQty(row.batch.quantity, row.product.unit),
        batch: row.batch.batchNo,
      }),
      href: '/inventory?tab=expiry',
    })
  }

  for (const row of getLowStock(db, index)) {
    alerts.push({
      id: `low_${row.product.id}`,
      kind: 'low_stock',
      severity: row.state === 'out' ? 'danger' : 'warning',
      title: `${row.product.name} — ${row.state === 'out' ? t('alert.out') : t('alert.low')}`,
      description: t('alert.stockDesc', {
        qty: formatQty(row.levels.total, row.product.unit),
        min: formatQty(row.product.minStock, row.product.unit),
      }),
      href: '/inventory?tab=low',
    })
  }

  const customerName = new Map(db.customers.map((customer) => [customer.id, customer.name]))
  for (const debt of overdueDebts(db, now)) {
    alerts.push({
      id: `debt_${debt.id}`,
      kind: 'overdue_debt',
      severity: 'danger',
      title: t('alert.debtTitle', { name: customerName.get(debt.customerId) ?? t('alert.unknownCustomer') }),
      description: t('alert.debtDesc', {
        amount: formatMoney(debtRemaining(debt)),
        days: diffInDays(now, debt.dueDate),
        sale: debt.saleNumber,
      }),
      href: '/debts?status=overdue',
    })
  }

  const weight = { danger: 0, warning: 1 } as const
  return alerts.sort((a, b) => weight[a.severity] - weight[b.severity])
}
