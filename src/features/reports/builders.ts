import type { Database } from '@/types'
import {
  computeSummary,
  dailySeries,
  groupSeries,
  productSales,
  salesInRange,
  type SeriesGrouping,
} from '@/utils/analytics'
import { diffInDays, formatDate, isInRange, type DateRange } from '@/utils/date'
import {
  buildCustomerStats,
  debtRemaining,
  debtStatus,
  payrollCost,
  purchasePaid,
  purchaseRemaining,
  saleCost,
} from '@/utils/finance'
import { formatPercent } from '@/utils/format'
import {
  CUSTOMER_SEGMENT,
  DEBT_STATUS,
  EXPENSE_CATEGORY,
  PURCHASE_STATUS,
  STOCK_STATE,
} from '@/utils/labels'
import { EMPTY_LEVELS, buildStockIndex, stockState } from '@/utils/stock'

export type ColumnType = 'text' | 'money' | 'number' | 'qty' | 'percent' | 'date'

export interface ReportColumn {
  key: string
  label: string
  type: ColumnType
}

export type ReportRow = Record<string, string | number | null>

export interface ReportData {
  title: string
  columns: ReportColumn[]
  rows: ReportRow[]
  /** Jadval ostida ko'rsatiladigan jami qator (ustun kaliti → qiymat) */
  totals?: ReportRow
  /** Grafik uchun ma'lumot (ixtiyoriy) */
  chart?: { xKey: string; series: Array<{ key: string; label: string }> }
}

const col = (key: string, label: string, type: ColumnType = 'text'): ReportColumn => ({ key, label, type })

/* ----------------------------- Savdo ----------------------------- */

export function salesReport(db: Database, range: DateRange, grouping: SeriesGrouping): ReportData {
  const points = groupSeries(dailySeries(db, range), grouping)
  const rows = points.map((point) => ({
    period: point.label,
    count: point.count,
    sales: point.salesAmount,
    revenue: point.revenue,
    profit: point.grossProfit,
    cost: point.salesAmount - point.grossProfit,
  }))
  const sum = (key: 'count' | 'sales' | 'revenue' | 'profit' | 'cost') => rows.reduce((total, row) => total + row[key], 0)
  return {
    title: grouping === 'day' ? 'Kunlik savdo' : grouping === 'week' ? 'Haftalik savdo' : 'Oylik savdo',
    columns: [col('period', grouping === 'week' ? 'Hafta (boshlanishi)' : grouping === 'month' ? 'Oy' : 'Sana'), col('count', 'Savdolar soni', 'number'), col('sales', 'Savdo summasi', 'money'), col('revenue', 'Tushum', 'money'), col('cost', 'Tannarx', 'money'), col('profit', 'Yalpi foyda', 'money')],
    rows,
    totals: { period: 'Jami', count: sum('count'), sales: sum('sales'), revenue: sum('revenue'), cost: sum('cost'), profit: sum('profit') },
    chart: { xKey: 'period', series: [{ key: 'sales', label: 'Savdo summasi' }, { key: 'revenue', label: 'Tushum' }, { key: 'profit', label: 'Yalpi foyda' }] },
  }
}

/* ----------------------------- Mahsulotlar ----------------------------- */

export function productsReport(db: Database, range: DateRange): ReportData {
  const categories = new Map(db.categories.map((c) => [c.id, c.name]))
  const products = new Map(db.products.map((p) => [p.id, p]))
  const rows = productSales(db, range).map((row) => {
    const product = products.get(row.productId)
    return {
      name: row.name,
      category: product ? categories.get(product.categoryId) ?? '' : '',
      quantity: row.quantity,
      unit: row.unit,
      amount: row.amount,
      cost: row.amount - row.profit,
      profit: row.profit,
      margin: row.amount > 0 ? (row.profit / row.amount) * 100 : 0,
    }
  })
  return {
    title: 'Mahsulotlar bo‘yicha savdo',
    columns: [col('name', 'Mahsulot'), col('category', 'Kategoriya'), col('quantity', 'Sotilgan miqdor', 'qty'), col('unit', 'Birlik'), col('amount', 'Savdo summasi', 'money'), col('cost', 'Tannarx', 'money'), col('profit', 'Foyda', 'money'), col('margin', 'Marja', 'percent')],
    rows,
    totals: { name: 'Jami', amount: rows.reduce((s, r) => s + r.amount, 0), cost: rows.reduce((s, r) => s + r.cost, 0), profit: rows.reduce((s, r) => s + r.profit, 0) },
  }
}

/* ----------------------------- Foyda va xarajatlar ----------------------------- */

export function profitReport(db: Database, range: DateRange): ReportData {
  const summary = computeSummary(db, range)
  const expensesByCategory = (Object.keys(EXPENSE_CATEGORY) as Array<keyof typeof EXPENSE_CATEGORY>).map((id) => ({
    id,
    amount: db.expenses.filter((e) => e.category === id && isInRange(e.date, range)).reduce((sum, e) => sum + e.amount, 0),
  }))
  const rows: ReportRow[] = [
    { item: 'Savdo summasi', amount: summary.salesAmount, note: `${summary.salesCount} ta savdo (chegirmalar: ${summary.discountTotal.toLocaleString('ru-RU')})` },
    { item: 'Tushum (amalda kelgan to‘lovlar)', amount: summary.revenue, note: 'Nasiya to‘lovlari ham kiradi; savdo summasiga teng emas' },
    { item: 'Sotilgan mahsulotlar tannarxi', amount: -summary.cogs, note: '' },
    { item: 'Yalpi foyda', amount: summary.grossProfit, note: 'Savdo summasi − tannarx' },
    ...expensesByCategory.filter((item) => item.amount > 0).map((item) => ({ item: `Xarajat: ${EXPENSE_CATEGORY[item.id]}`, amount: -item.amount, note: '' })),
    { item: 'Xodimlar oyligi (tasdiqlangan)', amount: -summary.payrollCost, note: 'Tasdiqlanmagan hisob-kitoblar kirmaydi' },
    { item: 'Sof foyda', amount: summary.netProfit, note: 'Yalpi foyda − xarajatlar − oyliklar' },
  ]
  return {
    title: 'Foyda va xarajatlar',
    columns: [col('item', 'Ko‘rsatkich'), col('amount', 'Summa', 'money'), col('note', 'Izoh')],
    rows,
    chart: undefined,
  }
}

/* ----------------------------- Qoldiqlar ----------------------------- */

export function stockReport(db: Database): ReportData {
  const index = buildStockIndex(db.batches)
  const categories = new Map(db.categories.map((c) => [c.id, c.name]))
  const rows = db.products
    .filter((p) => p.status === 'active')
    .map((p) => {
      const levels = index.get(p.id) ?? EMPTY_LEVELS
      return {
        name: p.name,
        category: categories.get(p.categoryId) ?? '',
        warehouse: levels.warehouse,
        store: levels.store,
        total: levels.total,
        unit: p.unit,
        cost: p.costPrice,
        value: levels.total * p.costPrice,
        state: STOCK_STATE[stockState(levels.sellable, p.minStock)].label,
      }
    })
  return {
    title: 'Qoldiqlar',
    columns: [col('name', 'Mahsulot'), col('category', 'Kategoriya'), col('warehouse', 'Sklad', 'qty'), col('store', 'Do‘kon', 'qty'), col('total', 'Jami', 'qty'), col('unit', 'Birlik'), col('cost', 'Tannarx', 'money'), col('value', 'Qiymati', 'money'), col('state', 'Holat')],
    rows,
    totals: { name: 'Jami qiymat', value: rows.reduce((s, r) => s + r.value, 0) },
  }
}

/* ----------------------------- Qarzdorlik ----------------------------- */

export function debtsReport(db: Database, now: Date): ReportData {
  const customers = new Map(db.customers.map((c) => [c.id, c]))
  const rows = db.debts
    .filter((d) => debtRemaining(d) > 0)
    .map((d) => ({
      customer: customers.get(d.customerId)?.name ?? '',
      phone: customers.get(d.customerId)?.phone ?? '',
      sale: d.saleNumber,
      date: d.date.slice(0, 10),
      due: d.dueDate,
      amount: d.amount,
      paid: d.paid,
      remaining: debtRemaining(d),
      late: Math.max(0, diffInDays(now, d.dueDate)),
      status: DEBT_STATUS[debtStatus(d, now)].label,
    }))
    .sort((a, b) => b.remaining - a.remaining)
  return {
    title: 'Qarzdorlik',
    columns: [col('customer', 'Mijoz'), col('phone', 'Telefon'), col('sale', 'Chek'), col('date', 'Qarz sanasi', 'date'), col('due', 'Muddat', 'date'), col('amount', 'Dastlabki', 'money'), col('paid', 'To‘langan', 'money'), col('remaining', 'Qolgan', 'money'), col('late', 'Kechikish (kun)', 'number'), col('status', 'Holat')],
    rows,
    totals: { customer: 'Jami', amount: rows.reduce((s, r) => s + r.amount, 0), paid: rows.reduce((s, r) => s + r.paid, 0), remaining: rows.reduce((s, r) => s + r.remaining, 0) },
  }
}

/* ----------------------------- Mijozlar faolligi ----------------------------- */

export function customersReport(db: Database, range: DateRange): ReportData {
  const stats = buildCustomerStats(db)
  const inRange = new Map<string, { count: number; total: number }>()
  for (const sale of salesInRange(db, range)) {
    if (!sale.customerId) continue
    const entry = inRange.get(sale.customerId) ?? { count: 0, total: 0 }
    entry.count += 1
    entry.total += sale.total
    inRange.set(sale.customerId, entry)
  }
  const rows = db.customers
    .filter((c) => c.status === 'active')
    .map((c) => {
      const period = inRange.get(c.id) ?? { count: 0, total: 0 }
      const all = stats.get(c.id)
      return {
        name: c.name,
        phone: c.phone,
        count: period.count,
        total: period.total,
        average: period.count ? Math.round(period.total / period.count) : 0,
        last: all?.lastPurchaseAt ? all.lastPurchaseAt.slice(0, 10) : null,
        debt: all?.debtTotal ?? 0,
        segment: CUSTOMER_SEGMENT[all?.segment ?? 'new'].label,
      }
    })
    .sort((a, b) => b.total - a.total)
  return {
    title: 'Mijozlar faolligi',
    columns: [col('name', 'Mijoz'), col('phone', 'Telefon'), col('count', 'Davrdagi xaridlar', 'number'), col('total', 'Davrdagi summa', 'money'), col('average', 'O‘rtacha chek', 'money'), col('last', 'Oxirgi xarid', 'date'), col('debt', 'Qarz', 'money'), col('segment', 'Segment')],
    rows,
    totals: { name: 'Jami', count: rows.reduce((s, r) => s + r.count, 0), total: rows.reduce((s, r) => s + r.total, 0), debt: rows.reduce((s, r) => s + r.debt, 0) },
  }
}

/* ----------------------------- Xodimlar faoliyati ----------------------------- */

export function employeesReport(db: Database, range: DateRange): ReportData {
  const rows = db.employees.map((employee) => {
    const sales = salesInRange(db, range).filter((s) => s.cashierId === employee.id)
    const total = sales.reduce((sum, s) => sum + s.total, 0)
    const payroll = db.payroll.filter((r) => r.employeeId === employee.id && r.approvedAt && isInRange(r.approvedAt, range))
    return {
      name: employee.name,
      position: employee.position,
      count: sales.length,
      total,
      average: sales.length ? Math.round(total / sales.length) : 0,
      profit: sales.reduce((sum, s) => sum + (s.total - saleCost(s)), 0),
      payroll: payroll.reduce((sum, r) => sum + payrollCost(r), 0),
      status: employee.status === 'active' ? 'Faol' : 'Nofaol',
    }
  })
  return {
    title: 'Xodimlar faoliyati',
    columns: [col('name', 'Xodim'), col('position', 'Lavozim'), col('count', 'Savdolar soni', 'number'), col('total', 'Savdo summasi', 'money'), col('average', 'O‘rtacha chek', 'money'), col('profit', 'Yalpi foyda', 'money'), col('payroll', 'Tasdiqlangan oylik', 'money'), col('status', 'Holat')],
    rows,
    totals: { name: 'Jami', count: rows.reduce((s, r) => s + r.count, 0), total: rows.reduce((s, r) => s + r.total, 0), profit: rows.reduce((s, r) => s + r.profit, 0), payroll: rows.reduce((s, r) => s + r.payroll, 0) },
  }
}

/* ----------------------------- Xaridlar ----------------------------- */

export function purchasesReport(db: Database, range: DateRange): ReportData {
  const suppliers = new Map(db.suppliers.map((s) => [s.id, s.name]))
  const rows = db.purchases
    .filter((p) => isInRange(p.date, range) && p.status !== 'cancelled')
    .map((p) => ({
      number: p.number,
      date: p.date.slice(0, 10),
      supplier: suppliers.get(p.supplierId) ?? '',
      items: p.items.length,
      total: p.total,
      paid: purchasePaid(p),
      remaining: purchaseRemaining(p),
      status: PURCHASE_STATUS[p.status].label,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  return {
    title: 'Xaridlar',
    columns: [col('number', 'Raqam'), col('date', 'Sana', 'date'), col('supplier', 'Yetkazib beruvchi'), col('items', 'Pozitsiyalar', 'number'), col('total', 'Jami', 'money'), col('paid', 'To‘langan', 'money'), col('remaining', 'Qolgan', 'money'), col('status', 'Holat')],
    rows,
    totals: { number: 'Jami', total: rows.reduce((s, r) => s + r.total, 0), paid: rows.reduce((s, r) => s + r.paid, 0), remaining: rows.reduce((s, r) => s + r.remaining, 0) },
  }
}

/** CSV / ekran uchun qiymatni formatlash */
export function formatCell(type: ColumnType, value: string | number | null | undefined, formatters: { money: (n: number) => string; qty: (n: number) => string; number: (n: number) => string }): string {
  if (value === null || value === undefined || value === '') return type === 'text' ? '' : '—'
  switch (type) {
    case 'money':
      return formatters.money(Number(value))
    case 'qty':
      return formatters.qty(Number(value))
    case 'number':
      return formatters.number(Number(value))
    case 'percent':
      return formatPercent(Number(value))
    case 'date':
      return formatDate(String(value))
    default:
      return String(value)
  }
}
