import type { Database } from '@/types'
import { round3 } from '@/utils/format'
import { LOCATION_IDS } from '@/utils/stock'

/** Demo ma'lumotlarning ichki izchilligini tekshiradi; muammolar ro'yxatini qaytaradi. */
export function checkIntegrity(db: Database): string[] {
  const problems: string[] = []

  // 1. Qoldiq = harakatlar yig'indisi (har bir mahsulot va joy bo'yicha)
  const ledger = new Map<string, number>()
  for (const movement of db.movements) {
    const key = `${movement.productId}|${movement.locationId}`
    ledger.set(key, round3((ledger.get(key) ?? 0) + movement.quantity))
  }
  const stock = new Map<string, number>()
  for (const batch of db.batches) {
    if (batch.quantity < 0) problems.push(`Manfiy partiya: ${batch.id}`)
    const key = `${batch.productId}|${batch.locationId}`
    stock.set(key, round3((stock.get(key) ?? 0) + batch.quantity))
  }
  // Yo'lda turgan (yuborilgan, qabul qilinmagan) o'tkazmalar qoldiqdan chiqqan, lekin harakat sifatida yozilgan.
  for (const product of db.products) {
    for (const location of LOCATION_IDS) {
      const key = `${product.id}|${location}`
      const left = stock.get(key) ?? 0
      const right = ledger.get(key) ?? 0
      if (Math.abs(left - right) > 0.001) problems.push(`Qoldiq mos emas: ${product.name} / ${location}: ${left} ≠ ${right}`)
    }
  }

  // 2. Savdolar
  const salePayments = new Map<string, number>()
  const debtPayments = new Map<string, number>()
  for (const payment of db.payments) {
    if (payment.kind === 'sale') salePayments.set(payment.saleId, (salePayments.get(payment.saleId) ?? 0) + payment.amount)
    else if (payment.debtId) debtPayments.set(payment.debtId, (debtPayments.get(payment.debtId) ?? 0) + payment.amount)
  }
  for (const sale of db.sales) {
    const subtotal = sale.items.reduce((sum, item) => sum + item.total, 0)
    if (subtotal !== sale.subtotal) problems.push(`Savdo ${sale.number}: pozitsiyalar yig'indisi mos emas`)
    if (sale.subtotal - sale.discount !== sale.total) problems.push(`Savdo ${sale.number}: jami summa mos emas`)
    if (sale.paidCash + sale.paidCard + sale.debtAmount !== sale.total) problems.push(`Savdo ${sale.number}: to'lov va nasiya jami summaga teng emas`)
    if ((salePayments.get(sale.id) ?? 0) !== sale.paidCash + sale.paidCard) problems.push(`Savdo ${sale.number}: to'lov yozuvlari mos emas`)
    for (const item of sale.items) {
      const allocated = round3(item.allocations.reduce((sum, a) => sum + a.quantity, 0))
      if (allocated !== item.quantity) problems.push(`Savdo ${sale.number}: partiyalar miqdori mos emas (${item.name})`)
    }
  }

  // 3. Qarzlar
  for (const debt of db.debts) {
    const sale = db.sales.find((item) => item.id === debt.saleId)
    if (!sale) {
      problems.push(`Qarz ${debt.id}: savdo topilmadi`)
      continue
    }
    if (sale.debtAmount !== debt.amount) problems.push(`Qarz ${debt.id}: summa savdodagi nasiyaga teng emas`)
    if ((debtPayments.get(debt.id) ?? 0) !== debt.paid) problems.push(`Qarz ${debt.id}: to'langan summa to'lovlar yig'indisiga teng emas`)
    if (debt.paid > debt.amount) problems.push(`Qarz ${debt.id}: ortiqcha to'lov`)
    if (sale.status !== 'completed' && debt.state !== 'cancelled') problems.push(`Qarz ${debt.id}: bekor qilingan savdo qarzi faol`)
  }

  // 4. Xaridlar
  for (const purchase of db.purchases) {
    const total = purchase.items.reduce((sum, item) => sum + Math.round(item.quantity * item.costPrice), 0)
    if (total !== purchase.total) problems.push(`Xarid ${purchase.number}: jami summa mos emas`)
    const paid = purchase.payments.reduce((sum, payment) => sum + payment.amount, 0)
    if (paid > purchase.total) problems.push(`Xarid ${purchase.number}: ortiqcha to'lov`)
  }

  return problems
}
