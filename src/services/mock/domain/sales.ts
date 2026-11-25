import type { CancelSaleInput, SaleInput } from '@/services/api/types'
import type { Database, Debt, Payment, Sale, SaleItem } from '@/types'
import { addDaysISO, toISODate } from '@/utils/date'
import { roundMoney } from '@/utils/finance'
import { round3 } from '@/utils/format'
import { assert, nextId, nextNumber, pushMovement, requireProduct, restoreAllocations, takeStock } from './core'

/**
 * Savdoni tasdiqlaydi:
 *  - qoldiq "savdo do'koni"dan FIFO/FEFO bo'yicha kamayadi;
 *  - naqd/karta to'lovlari tushum sifatida yoziladi;
 *  - to'lanmagan qism mijoz nasiyasiga (qarzga) aylanadi.
 */
export function createSale(db: Database, now: Date, input: SaleInput): Sale {
  assert(input.items.length > 0, 'Savat bo‘sh — kamida bitta mahsulot qo‘shing')
  assert(input.discount >= 0, 'Chegirma manfiy bo‘lmasligi kerak')
  assert(input.paidCash >= 0 && input.paidCard >= 0, 'To‘lov summasi manfiy bo‘lmasligi kerak')
  assert(db.employees.some((employee) => employee.id === input.cashierId), 'Sotuvchi topilmadi')
  if (input.customerId) {
    const customer = db.customers.find((item) => item.id === input.customerId)
    assert(customer, 'Mijoz topilmadi')
    assert(customer.status === 'active', 'Arxivlangan mijozga savdo qilib bo‘lmaydi')
  }

  const seen = new Set<string>()
  const items: SaleItem[] = []
  for (const line of input.items) {
    assert(!seen.has(line.productId), 'Bir mahsulot savatda ikki marta takrorlangan')
    seen.add(line.productId)
    const product = requireProduct(db, line.productId)
    assert(product.status === 'active', `"${product.name}" arxivlangan`)
    assert(line.quantity > 0, `"${product.name}" miqdori noldan katta bo‘lishi kerak`)
    assert(line.unitPrice >= 0, `"${product.name}" narxi manfiy bo‘lmasligi kerak`)
    const unit = db.settings.units.find((u) => u.id === product.unit)
    assert(unit?.allowDecimal || Number.isInteger(line.quantity), `"${product.name}" faqat butun miqdorda sotiladi`)
    items.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      quantity: round3(line.quantity),
      unitPrice: line.unitPrice,
      costPrice: product.costPrice,
      total: roundMoney(line.quantity * line.unitPrice),
      allocations: [],
    })
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  assert(input.discount <= subtotal, 'Chegirma jami summadan oshib ketdi')
  const total = subtotal - input.discount
  const paid = input.paidCash + input.paidCard
  assert(paid <= total, 'To‘langan summa jami summadan oshib ketdi')
  const debtAmount = total - paid
  if (debtAmount > 0) assert(input.customerId, 'Nasiya yoki qisman to‘lov uchun mijozni tanlang')

  // Barcha tekshiruvlar o'tdi — endi qoldiqni kamaytiramiz (xato bo'lsa tranzaksiya bekor qilinadi).
  const saleId = nextId(db, 'sale')
  const number = nextNumber(db, 'sale')
  for (const item of items) {
    item.allocations = takeStock(db, item.productId, 'store', item.quantity, toISODate(now))
    pushMovement(db, now, {
      productId: item.productId,
      locationId: 'store',
      quantity: -item.quantity,
      type: 'sale',
      refId: saleId,
      refNumber: number,
    })
  }

  const sale: Sale = {
    id: saleId,
    number,
    date: now.toISOString(),
    customerId: input.customerId,
    cashierId: input.cashierId,
    items,
    subtotal,
    discount: input.discount,
    total,
    paidCash: input.paidCash,
    paidCard: input.paidCard,
    debtAmount,
    status: 'completed',
    note: input.note,
    cancelledAt: null,
    cancelReason: '',
  }
  db.sales.push(sale)

  const addPayment = (method: 'cash' | 'card', amount: number) => {
    if (amount <= 0) return
    const payment: Payment = {
      id: nextId(db, 'pay'),
      date: now.toISOString(),
      customerId: input.customerId,
      saleId,
      debtId: null,
      kind: 'sale',
      method,
      amount,
      note: '',
    }
    db.payments.push(payment)
  }
  addPayment('cash', input.paidCash)
  addPayment('card', input.paidCard)

  if (debtAmount > 0 && input.customerId) {
    const debt: Debt = {
      id: nextId(db, 'debt'),
      customerId: input.customerId,
      saleId,
      saleNumber: number,
      date: now.toISOString(),
      dueDate: input.dueDate ?? addDaysISO(now, db.settings.defaultDebtDays),
      amount: debtAmount,
      paid: 0,
      state: 'active',
    }
    db.debts.push(debt)
  }
  return sale
}

/**
 * Savdoni bekor qilish yoki qaytarish: qoldiq "savdo do'koni"ga tiklanadi,
 * ochiq qarz bekor qilinadi, savdo tushum/foyda hisobotlaridan chiqib ketadi.
 */
export function cancelSale(db: Database, now: Date, input: CancelSaleInput): void {
  const sale = db.sales.find((item) => item.id === input.saleId)
  assert(sale, 'Savdo topilmadi')
  assert(sale.status === 'completed', 'Bu savdo allaqachon bekor qilingan yoki qaytarilgan')
  assert(input.reason.trim().length >= 3, 'Sababni kiriting (kamida 3 ta belgi)')

  for (const item of sale.items) {
    restoreAllocations(db, now, item.productId, 'store', item.allocations)
    pushMovement(db, now, {
      productId: item.productId,
      locationId: 'store',
      quantity: item.quantity,
      type: 'sale_return',
      refId: sale.id,
      refNumber: sale.number,
      note: input.reason.trim(),
    })
  }
  for (const debt of db.debts) {
    if (debt.saleId === sale.id) debt.state = 'cancelled'
  }
  sale.status = input.kind
  sale.cancelledAt = now.toISOString()
  sale.cancelReason = input.reason.trim()
}
