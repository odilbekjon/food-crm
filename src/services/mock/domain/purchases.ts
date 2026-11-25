import type { PurchaseInput, SupplierInput } from '@/services/api/types'
import type { Database, Purchase, Supplier } from '@/types'
import { roundMoney, purchasePaid } from '@/utils/finance'
import { round3 } from '@/utils/format'
import { addBatch, assert, newBatchNo, nextId, nextNumber, pushMovement, requireProduct } from './core'

/* ----------------------------- Yetkazib beruvchilar ----------------------------- */

function validateSupplier(db: Database, input: SupplierInput, selfId?: string): void {
  assert(input.name.trim().length >= 2, 'Yetkazib beruvchi nomi kamida 2 ta belgidan iborat bo‘lishi kerak')
  assert(input.phone.replace(/\D/g, '').length >= 9, 'Telefon raqami noto‘g‘ri')
  assert(
    !db.suppliers.some((s) => s.id !== selfId && s.name.toLowerCase() === input.name.trim().toLowerCase()),
    'Bunday yetkazib beruvchi mavjud',
  )
}

export function createSupplier(db: Database, input: SupplierInput): Supplier {
  validateSupplier(db, input)
  const supplier: Supplier = { ...input, name: input.name.trim(), id: nextId(db, 'sup'), status: 'active' }
  db.suppliers.push(supplier)
  return supplier
}

export function updateSupplier(db: Database, id: string, input: SupplierInput): Supplier {
  const supplier = db.suppliers.find((item) => item.id === id)
  assert(supplier, 'Yetkazib beruvchi topilmadi')
  validateSupplier(db, input, id)
  Object.assign(supplier, input, { name: input.name.trim() })
  return supplier
}

export function setSupplierStatus(db: Database, id: string, status: Supplier['status']): void {
  const supplier = db.suppliers.find((item) => item.id === id)
  assert(supplier, 'Yetkazib beruvchi topilmadi')
  supplier.status = status
}

/* ----------------------------- Xaridlar ----------------------------- */

export function createPurchase(db: Database, now: Date, input: PurchaseInput): Purchase {
  const supplier = db.suppliers.find((item) => item.id === input.supplierId)
  assert(supplier, 'Yetkazib beruvchini tanlang')
  assert(input.items.length > 0, 'Kamida bitta mahsulot qo‘shing')
  assert(input.paid >= 0, 'To‘langan summa manfiy bo‘lmasligi kerak')
  const seen = new Set<string>()
  for (const item of input.items) {
    const product = requireProduct(db, item.productId)
    assert(!seen.has(item.productId), `"${product.name}" ro‘yxatda takrorlangan`)
    seen.add(item.productId)
    assert(item.quantity > 0, `"${product.name}" miqdori noldan katta bo‘lishi kerak`)
    assert(item.costPrice >= 0, `"${product.name}" xarid narxi manfiy bo‘lmasligi kerak`)
    const unit = db.settings.units.find((u) => u.id === product.unit)
    assert(unit?.allowDecimal || Number.isInteger(item.quantity), `"${product.name}" faqat butun miqdorda bo‘ladi`)
  }
  const total = input.items.reduce((sum, item) => sum + roundMoney(item.quantity * item.costPrice), 0)
  assert(input.paid <= total, 'To‘langan summa jami summadan oshib ketdi')

  const date = new Date(`${input.date}T${now.toTimeString().slice(0, 8)}`)
  const purchase: Purchase = {
    id: nextId(db, 'pur'),
    number: nextNumber(db, 'purchase'),
    supplierId: input.supplierId,
    date: date.toISOString(),
    items: input.items.map((item) => ({ ...item, quantity: round3(item.quantity) })),
    total,
    payments: [],
    status: 'draft',
    note: input.note.trim(),
  }
  if (input.paid > 0) {
    purchase.payments.push({ id: nextId(db, 'sp'), date: date.toISOString(), amount: input.paid, note: 'Xarid paytida' })
  }
  db.purchases.push(purchase)
  if (input.confirm) confirmPurchase(db, now, purchase.id)
  return purchase
}

/** Tasdiqlash: mahsulotlar asosiy skladga kirim qilinadi, tannarx yangilanadi. */
export function confirmPurchase(db: Database, now: Date, id: string): void {
  const purchase = db.purchases.find((item) => item.id === id)
  assert(purchase, 'Xarid topilmadi')
  assert(purchase.status === 'draft', 'Faqat qoralama xaridni tasdiqlash mumkin')
  const batchNo = newBatchNo(db, now)
  for (const item of purchase.items) {
    addBatch(db, now, {
      productId: item.productId,
      locationId: 'warehouse',
      quantity: item.quantity,
      batchNo,
      expiryDate: item.expiryDate,
    })
    pushMovement(db, now, {
      productId: item.productId,
      locationId: 'warehouse',
      quantity: item.quantity,
      type: 'purchase',
      refId: purchase.id,
      refNumber: purchase.number,
    })
    const product = requireProduct(db, item.productId)
    product.costPrice = item.costPrice
  }
  purchase.status = 'confirmed'
}

export function cancelPurchase(db: Database, id: string): void {
  const purchase = db.purchases.find((item) => item.id === id)
  assert(purchase, 'Xarid topilmadi')
  assert(purchase.status === 'draft', 'Tasdiqlangan xaridni bekor qilib bo‘lmaydi — yetkazib beruvchiga qaytarish rasmiylashtiriladi')
  purchase.status = 'cancelled'
}

export function paySupplier(db: Database, now: Date, purchaseId: string, amount: number, note: string): void {
  const purchase = db.purchases.find((item) => item.id === purchaseId)
  assert(purchase, 'Xarid topilmadi')
  assert(purchase.status === 'confirmed', 'Faqat tasdiqlangan xarid uchun to‘lov kiritiladi')
  assert(Number.isFinite(amount) && amount > 0, 'To‘lov summasi noldan katta bo‘lishi kerak')
  assert(amount <= purchase.total - purchasePaid(purchase), 'To‘lov summasi qolgan qarzdan oshib ketdi')
  purchase.payments.push({ id: nextId(db, 'sp'), date: now.toISOString(), amount: Math.round(amount), note: note.trim() })
}
