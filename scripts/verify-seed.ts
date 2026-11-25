/**
 * Demo ma'lumotlar generatori va izchillik tekshiruvi.
 * Ishga tushirish: npm run verify:seed
 */
import { checkIntegrity } from '../src/services/mock/integrity'
import { buildSeedDatabase } from '../src/services/mock/seed'
import { computeSummary } from '../src/utils/analytics'
import { debtRemaining } from '../src/utils/finance'
import { buildStockIndex, getExpiringBatches, getLowStock } from '../src/utils/stock'
import { rangeForPreset } from '../src/utils/date'

const started = Date.now()
const db = buildSeedDatabase(new Date())
const now = new Date()

console.log(`Seed ${Date.now() - started} ms; JSON ${(JSON.stringify(db).length / 1024).toFixed(0)} KB`)
console.log({
  categories: db.categories.length,
  products: db.products.length,
  customers: db.customers.length,
  sales: db.sales.length,
  saleStatuses: db.sales.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }), {}),
  debts: db.debts.length,
  openDebts: db.debts.filter((d) => debtRemaining(d) > 0).length,
  payments: db.payments.length,
  movements: db.movements.length,
  transfers: db.transfers.map((t) => t.status).join(','),
  purchases: db.purchases.length,
  expenses: db.expenses.length,
  payroll: db.payroll.map((p) => `${p.period}:${p.status}`).join(' '),
})

const index = buildStockIndex(db.batches)
console.log('low stock:', getLowStock(db, index).map((r) => `${r.product.name} (${r.levels.total}/${r.product.minStock})`))
console.log('expiring:', getExpiringBatches(db, now).map((r) => `${r.product.name} ${r.daysLeft}d x${r.batch.quantity}`))
const reconcileErrors: string[] = []
for (const preset of ['today', '7d', '30d'] as const) {
  const summary = computeSummary(db, rangeForPreset(preset, now))
  console.log(preset, summary)
  // Savdo summasi = savdo vaqtida olingan pul + nasiyaga qolgan qism; tushum = savdo vaqtidagi pul + nasiya to'lovlari
  const paidAtSale = summary.revenue - summary.debtCollected
  if (summary.salesAmount !== paidAtSale + summary.creditSales) {
    reconcileErrors.push(`${preset}: savdo summasi (${summary.salesAmount}) ≠ olingan pul (${paidAtSale}) + nasiya (${summary.creditSales})`)
  }
}
if (reconcileErrors.length) {
  console.error('\nSAVDO/TUSHUM MOSLIGI BUZILGAN:')
  for (const error of reconcileErrors) console.error(' -', error)
  process.exit(1)
}

const problems = checkIntegrity(db)
if (problems.length) {
  console.error(`\nIZCHILLIK MUAMMOLARI (${problems.length}):`)
  for (const problem of problems.slice(0, 30)) console.error(' -', problem)
  process.exit(1)
}
console.log('\nIzchillik tekshiruvi: OK')
