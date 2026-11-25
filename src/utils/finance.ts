import type {
  Customer,
  Database,
  Debt,
  Employee,
  PayrollRecord,
  Purchase,
  Sale,
  Supplier,
} from '@/types'
import { diffInDays } from '@/utils/date'

/** So'm butun son sifatida yuritiladi. */
export function roundMoney(value: number): number {
  return Math.round(value)
}

/* ----------------------------- Qarzlar ----------------------------- */

export type DebtDisplayStatus = 'open' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export function debtRemaining(debt: Debt): number {
  if (debt.state === 'cancelled') return 0
  return Math.max(0, roundMoney(debt.amount - debt.paid))
}

export function debtStatus(debt: Debt, now: Date): DebtDisplayStatus {
  if (debt.state === 'cancelled') return 'cancelled'
  const remaining = debtRemaining(debt)
  if (remaining === 0) return 'paid'
  if (diffInDays(now, debt.dueDate) > 0) return 'overdue'
  return debt.paid > 0 ? 'partial' : 'open'
}

export function totalReceivable(debts: Debt[]): number {
  return debts.reduce((sum, debt) => sum + debtRemaining(debt), 0)
}

/* ----------------------------- Savdo ----------------------------- */

export type SalePaymentType = 'cash' | 'card' | 'credit' | 'mixed'
export type SalePaymentState = 'paid' | 'partial' | 'debt'

export function salePaidAtSale(sale: Sale): number {
  return sale.paidCash + sale.paidCard
}

export function salePaymentType(sale: Sale): SalePaymentType {
  const parts = [sale.paidCash > 0, sale.paidCard > 0, sale.debtAmount > 0].filter(Boolean).length
  if (parts > 1) return 'mixed'
  if (sale.debtAmount > 0) return 'credit'
  return sale.paidCard > 0 ? 'card' : 'cash'
}

/** To'lov holati: keyinchalik kiritilgan qarz to'lovlari ham hisobga olinadi. */
export function salePaymentState(sale: Sale, debt: Debt | undefined): SalePaymentState {
  if (sale.debtAmount <= 0) return 'paid'
  const remaining = debt ? debtRemaining(debt) : sale.debtAmount
  if (remaining <= 0) return 'paid'
  return salePaidAtSale(sale) > 0 || (debt?.paid ?? 0) > 0 ? 'partial' : 'debt'
}

export function saleItemsCount(sale: Sale): number {
  return sale.items.length
}

export function saleCost(sale: Sale): number {
  return roundMoney(sale.items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0))
}

export function saleProfit(sale: Sale): number {
  return sale.total - saleCost(sale)
}

/* ----------------------------- Mijozlar ----------------------------- */

export type CustomerSegment = 'new' | 'regular' | 'vip'

export const VIP_THRESHOLD = 8_000_000
export const REGULAR_THRESHOLD = 8

export interface CustomerStats {
  purchasesTotal: number
  purchasesCount: number
  debtTotal: number
  lastPurchaseAt: string | null
  segment: CustomerSegment
}

export function segmentOf(purchasesTotal: number, purchasesCount: number): CustomerSegment {
  if (purchasesTotal >= VIP_THRESHOLD) return 'vip'
  if (purchasesCount >= REGULAR_THRESHOLD) return 'regular'
  return 'new'
}

/** Barcha mijozlar statistikasini bir o'tishda hisoblaydi. */
export function buildCustomerStats(db: Pick<Database, 'customers' | 'sales' | 'debts'>): Map<string, CustomerStats> {
  const stats = new Map<string, CustomerStats>()
  const get = (id: string): CustomerStats => {
    let entry = stats.get(id)
    if (!entry) {
      entry = { purchasesTotal: 0, purchasesCount: 0, debtTotal: 0, lastPurchaseAt: null, segment: 'new' }
      stats.set(id, entry)
    }
    return entry
  }
  for (const customer of db.customers) get(customer.id)
  for (const sale of db.sales) {
    if (sale.status !== 'completed' || !sale.customerId) continue
    const entry = get(sale.customerId)
    entry.purchasesTotal += sale.total
    entry.purchasesCount += 1
    if (!entry.lastPurchaseAt || sale.date > entry.lastPurchaseAt) entry.lastPurchaseAt = sale.date
  }
  for (const debt of db.debts) {
    get(debt.customerId).debtTotal += debtRemaining(debt)
  }
  for (const entry of stats.values()) entry.segment = segmentOf(entry.purchasesTotal, entry.purchasesCount)
  return stats
}

export function isRegularCustomer(segment: CustomerSegment): boolean {
  return segment === 'regular' || segment === 'vip'
}

export function customerName(customers: Customer[], id: string | null): string {
  if (!id) return 'Noma’lum mijoz'
  return customers.find((customer) => customer.id === id)?.name ?? 'Noma’lum mijoz'
}

/* ----------------------------- Xaridlar ----------------------------- */

export function purchasePaid(purchase: Purchase): number {
  return purchase.payments.reduce((sum, payment) => sum + payment.amount, 0)
}

export function purchaseRemaining(purchase: Purchase): number {
  if (purchase.status !== 'confirmed') return 0
  return Math.max(0, purchase.total - purchasePaid(purchase))
}

export function supplierDebt(purchases: Purchase[], supplier: Pick<Supplier, 'id'>): number {
  return purchases
    .filter((purchase) => purchase.supplierId === supplier.id)
    .reduce((sum, purchase) => sum + purchaseRemaining(purchase), 0)
}

/* ----------------------------- Oylik ----------------------------- */

/** Hisoblangan oylik: belgilangan oylik + bonus − ushlab qolish. */
export function payrollAccrued(record: PayrollRecord): number {
  return Math.max(0, record.baseSalary + record.bonus - record.deduction)
}

/** Avans ayirilgandan keyingi to'lanishi kerak bo'lgan summa. */
export function payrollPayable(record: PayrollRecord): number {
  return Math.max(0, payrollAccrued(record) - record.advance)
}

/**
 * Qolgan summa. Tasdiqlanmagan (qoralama) hisob-kitobda hali to'lov yo'q,
 * shuning uchun to'langan summa 0 deb olinadi.
 */
export function payrollRemaining(record: PayrollRecord): number {
  return Math.max(0, payrollPayable(record) - payrollPaid(record))
}

export function payrollPaid(record: PayrollRecord): number {
  return record.status === 'draft' ? 0 : record.paid
}

/** Xarajat sifatida tan olinadigan summa: faqat tasdiqlangan hisob-kitoblar. */
export function payrollCost(record: PayrollRecord): number {
  return record.status === 'draft' ? 0 : payrollAccrued(record)
}

export function employeeName(employees: Employee[], id: string): string {
  return employees.find((employee) => employee.id === id)?.name ?? '—'
}
