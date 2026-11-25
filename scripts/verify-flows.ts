/**
 * Asosiy biznes jarayonlari tekshiruvi (qabul mezonlari 4–7 va qoidalar).
 * Ishga tushirish: npm run verify:flows
 */
import { checkIntegrity } from '../src/services/mock/integrity'
import { buildSeedDatabase } from '../src/services/mock/seed'
import { payDebt } from '../src/services/mock/domain/debts'
import { cancelTransfer, createTransfer, receiveTransfer, sendTransfer } from '../src/services/mock/domain/inventory'
import { cancelSale, createSale } from '../src/services/mock/domain/sales'
import { buildCustomerStats, debtRemaining, payrollPaid } from '../src/utils/finance'
import { sellableStockOf, stockOf } from '../src/utils/stock'
import { toISODate } from '../src/utils/date'

let failed = 0
function check(name: string, condition: boolean, detail = '') {
  if (!condition) failed++
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}
function throwsMessage(fn: () => void): string | null {
  try {
    fn()
    return null
  } catch (error) {
    return (error as Error).message
  }
}

const now = new Date()
const today = toISODate(now)
const db = buildSeedDatabase(now)
const cashier = db.employees.find((e) => e.role === 'cashier' && e.status === 'active')!
const customer = db.customers[0]
// Do'konda yetarli qoldig'i bor mahsulot
const product = db.products.find((p) => sellableStockOf(db.batches, p.id, 'store', today) >= 5 && p.unit === 'dona')!

/* 5. Savdo qoldiqni kamaytiradi */
const storeBefore = stockOf(db.batches, product.id, 'store')
const whBefore = stockOf(db.batches, product.id, 'warehouse')
const statsBefore = buildCustomerStats(db).get(customer.id)!
const sale = createSale(db, now, { customerId: customer.id, cashierId: cashier.id, items: [{ productId: product.id, quantity: 3, unitPrice: product.salePrice }], discount: 0, paidCash: 0, paidCard: 0, dueDate: null, note: '' })
check('savdo do‘kon qoldig‘ini kamaytiradi', stockOf(db.batches, product.id, 'store') === storeBefore - 3)
check('savdo sklad qoldig‘iga tegmaydi', stockOf(db.batches, product.id, 'warehouse') === whBefore)

/* 6. Nasiya savdo qarzni oshiradi */
const statsAfter = buildCustomerStats(db).get(customer.id)!
check('nasiya mijoz qarzini oshiradi', statsAfter.debtTotal === statsBefore.debtTotal + sale.total, `${statsBefore.debtTotal} → ${statsAfter.debtTotal}`)

/* 7. To'lov qarzni kamaytiradi */
const debt = db.debts.find((d) => d.saleId === sale.id)!
payDebt(db, now, { debtId: debt.id, amount: 1000, method: 'cash', note: '' })
check('qisman to‘lov qolgan qarzni kamaytiradi', debtRemaining(debt) === sale.total - 1000)
check('ortiqcha to‘lov rad etiladi', throwsMessage(() => payDebt(db, now, { debtId: debt.id, amount: 10_000_000, method: 'cash', note: '' })) !== null)

/* Yetarli bo'lmagan qoldiqda savdo rad etiladi va hech narsa o'zgarmaydi */
const snapshot = JSON.stringify(db.batches)
const message = throwsMessage(() => createSale(structuredClone(db), now, { customerId: null, cashierId: cashier.id, items: [{ productId: product.id, quantity: 9999, unitPrice: 1000 }], discount: 0, paidCash: 9_999_000, paidCard: 0, dueDate: null, note: '' }))
check('yetarli bo‘lmagan qoldiqda savdo rad etiladi', message !== null, message ?? '')
check('rad etilgan savdo qoldiqni o‘zgartirmaydi', JSON.stringify(db.batches) === snapshot)
check('mijozsiz nasiya rad etiladi', throwsMessage(() => createSale(structuredClone(db), now, { customerId: null, cashierId: cashier.id, items: [{ productId: product.id, quantity: 1, unitPrice: 1000 }], discount: 0, paidCash: 0, paidCard: 0, dueDate: null, note: '' })) !== null)

/* Bekor qilingan savdo: qoldiq tiklanadi, qarz bekor bo'ladi */
const sale2 = createSale(db, now, { customerId: customer.id, cashierId: cashier.id, items: [{ productId: product.id, quantity: 2, unitPrice: product.salePrice }], discount: 0, paidCash: 0, paidCard: 0, dueDate: null, note: '' })
const storeMid = stockOf(db.batches, product.id, 'store')
cancelSale(db, now, { saleId: sale2.id, kind: 'returned', reason: 'Test qaytarish' })
check('qaytarilgan savdo qoldiqni tiklaydi', stockOf(db.batches, product.id, 'store') === storeMid + 2)
check('qaytarilgan savdo qarzini bekor qiladi', debtRemaining(db.debts.find((d) => d.saleId === sale2.id)!) === 0)
check('ikki marta qaytarib bo‘lmaydi', throwsMessage(() => cancelSale(db, now, { saleId: sale2.id, kind: 'returned', reason: 'yana' })) !== null)

/* 4. O'tkazma qoldiqlarga to'g'ri ta'sir qiladi */
const wh0 = stockOf(db.batches, product.id, 'warehouse')
const st0 = stockOf(db.batches, product.id, 'store')
const moveQty = Math.min(2, Math.floor(wh0))
const transfer = createTransfer(db, now, { from: 'warehouse', to: 'store', items: [{ productId: product.id, quantity: moveQty }], note: '', send: false })
check('qoralama o‘tkazma qoldiqni o‘zgartirmaydi', stockOf(db.batches, product.id, 'warehouse') === wh0 && stockOf(db.batches, product.id, 'store') === st0)
sendTransfer(db, now, transfer.id)
check('yuborilganda sklad kamayadi, do‘kon hali o‘zgarmaydi', stockOf(db.batches, product.id, 'warehouse') === wh0 - moveQty && stockOf(db.batches, product.id, 'store') === st0)
receiveTransfer(db, now, transfer.id)
check('qabul qilinganda do‘kon oshadi', stockOf(db.batches, product.id, 'store') === st0 + moveQty)
const t2 = createTransfer(db, now, { from: 'warehouse', to: 'store', items: [{ productId: product.id, quantity: 1 }], note: '', send: true })
cancelTransfer(db, now, t2.id)
check('yuborilgan o‘tkazma bekor qilinsa, sklad tiklanadi', stockOf(db.batches, product.id, 'warehouse') === wh0 - moveQty)

/* Oylik: tasdiqlanmagan to'langan hisoblanmaydi */
const draft = db.payroll.find((r) => r.status === 'draft')!
check('tasdiqlanmagan oylik to‘langan sifatida ko‘rsatilmaydi', payrollPaid({ ...draft, paid: 123 }) === 0)

const problems = checkIntegrity(db)
check('izchillik tekshiruvi (barcha amallardan keyin)', problems.length === 0, problems.slice(0, 3).join('; '))

if (failed > 0) {
  console.error(`\n${failed} ta tekshiruv muvaffaqiyatsiz`)
  process.exit(1)
}
console.log('\nBarcha jarayonlar to‘g‘ri ishlaydi')
