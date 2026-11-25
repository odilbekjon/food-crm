import { addMonths, startOfMonth, startOfDay, subDays, subMonths } from 'date-fns'
import type { Database, ExpenseCategory, LocationId, Settings } from '@/types'
import { addDaysISO, periodOf, toISODate } from '@/utils/date'
import { debtRemaining, payrollPayable } from '@/utils/finance'
import { sellableStockOf, stockOf } from '@/utils/stock'
import { assert } from './domain/core'
import { createCategory, createProduct } from './domain/catalog'
import { payDebt } from './domain/debts'
import {
  cancelTransfer,
  createAudit,
  createStockReceipt,
  createStockReturn,
  createTransfer,
  receiveTransfer,
} from './domain/inventory'
import { createPurchase, createSupplier, paySupplier } from './domain/purchases'
import {
  addCustomerNote,
  approvePayroll,
  createCustomer,
  createEmployee,
  createExpense,
  generatePayroll,
  payPayroll,
  updatePayroll,
} from './domain/people'
import { cancelSale, createSale } from './domain/sales'
import {
  CATEGORY_NAMES,
  EXPENSE_NOTES,
  SEED_CUSTOMERS,
  SEED_EMPLOYEES,
  SEED_PRODUCTS,
  SEED_SUPPLIERS,
  type SeedProduct,
  type SupplierKey,
} from './seed-data'

export const DB_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  storeName: 'Baraka Market',
  storePhone: '+998 71 123 45 67',
  storeAddress: 'Toshkent sh., Chilonzor tumani, 12-kvartal',
  currency: 'UZS',
  dateFormat: 'DD.MM.YYYY',
  defaultDebtDays: 14,
  units: [
    { id: 'dona', name: 'Dona', allowDecimal: false },
    { id: 'kg', name: 'Kilogramm (kg)', allowDecimal: true },
    { id: 'litr', name: 'Litr', allowDecimal: true },
    { id: 'gramm', name: 'Gramm', allowDecimal: false },
  ],
  paymentMethods: [
    { id: 'cash', name: 'Naqd', enabled: true },
    { id: 'card', name: 'Karta', enabled: true },
    { id: 'credit', name: 'Nasiya', enabled: true },
  ],
}

export function createEmptyDatabase(now: Date): Database {
  return {
    meta: { version: DB_VERSION, seededAt: now.toISOString(), modified: false },
    counters: {},
    settings: structuredClone(DEFAULT_SETTINGS),
    categories: [],
    products: [],
    batches: [],
    movements: [],
    transfers: [],
    stockDocs: [],
    suppliers: [],
    purchases: [],
    customers: [],
    sales: [],
    payments: [],
    debts: [],
    expenses: [],
    employees: [],
    payroll: [],
  }
}

/* ----------------------------- Deterministik tasodifiylik ----------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Unit = SeedProduct['unit']

const QTY_AVG: Record<Unit, number> = { dona: 1.9, kg: 1.5, litr: 1.6, gramm: 140 }

function costOf(seed: SeedProduct): number {
  const step = seed.cost >= 1000 ? 100 : 5
  return Math.max(step, Math.round((seed.cost * COST_FACTOR) / step) * step)
}

function floorQty(unit: Unit, qty: number): number {
  return unit === 'kg' ? Math.floor(qty * 2) / 2 : Math.floor(qty)
}

function ceilQty(unit: Unit, qty: number): number {
  if (unit === 'kg') return Math.ceil(qty * 2) / 2
  if (unit === 'gramm') return Math.ceil(qty / 100) * 100
  return Math.ceil(qty)
}

const HISTORY_DAYS = 45
/** Ulgurji mijozlar tufayli real talab modeldan yuqori */
const DEMAND_FACTOR = 1.25
/** Kuniga o'rtacha savdo pozitsiyalari soni (27 ta savdo × ~3,5 pozitsiya) */
const LINES_PER_DAY = 95
/** Boshlang'ich tannarx ko'rsatkichi (sotuv narxiga nisbatan marja uchun) */
const COST_FACTOR = 0.95
/** Yetkazib beruvchilar necha kunda bir keladi */
const SUPPLIER_INTERVAL: Record<SupplierKey, number> = { dairy: 3, bakery: 2, farm: 3, meat: 3, trade: 7, home: 14 }

/**
 * Demo bazani real operatsiyalarni simulyatsiya qilib yaratadi: xarid → sklad →
 * do'konga o'tkazma → savdo → nasiya to'lovlari. Hamma raqamlar bir-biriga mos.
 */
export function buildSeedDatabase(today: Date = new Date()): Database {
  const rnd = mulberry32(20261023)
  const rand = (min: number, max: number) => min + rnd() * (max - min)
  const int = (min: number, max: number) => Math.floor(rand(min, max + 1))
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rnd() * items.length)]
  const weighted = <T,>(items: readonly T[], weight: (item: T) => number): T => {
    const total = items.reduce((sum, item) => sum + weight(item), 0)
    let r = rnd() * total
    for (const item of items) {
      r -= weight(item)
      if (r <= 0) return item
    }
    return items[items.length - 1]
  }

  const db = createEmptyDatabase(today)
  const base = startOfDay(today)
  const at = (daysAgo: number, hour: number, minute = 0): Date => {
    const date = subDays(base, daysAgo)
    date.setHours(hour, minute, 0, 0)
    return date
  }

  /* ---------- Asosiy ma'lumotlar ---------- */
  const setupTime = at(HISTORY_DAYS + 30, 10)
  for (const name of CATEGORY_NAMES) createCategory(db, name)
  const categoryId = new Map(db.categories.map((category) => [category.name, category.id]))

  /* Talab modeli: kuniga taxminan LINES_PER_DAY ta savdo pozitsiyasi, ommabopligiga qarab taqsimlanadi. */
  const totalPop = SEED_PRODUCTS.reduce((sum, seed) => sum + seed.pop, 0)
  const dailyDemand = (seed: SeedProduct) => DEMAND_FACTOR * LINES_PER_DAY * (seed.pop / totalPop) * QTY_AVG[seed.unit]

  const products = SEED_PRODUCTS.map((seed, index) => {
    // Minimal zaxira — taxminan 2,5 kunlik talab
    const minStock = Math.max(seed.unit === 'kg' ? 2 : seed.unit === 'gramm' ? 300 : 3, ceilQty(seed.unit, dailyDemand(seed) * 2.5))
    const product = createProduct(db, setupTime, {
      name: seed.name,
      sku: `SKU-${String(index + 1).padStart(4, '0')}`,
      barcode: `4780${String(1_000_000 + index * 37).padStart(9, '0')}`,
      categoryId: categoryId.get(seed.category) as string,
      unit: seed.unit,
      costPrice: costOf(seed),
      salePrice: seed.price,
      minStock,
      shelfLifeDays: seed.shelfLife,
    })
    return { seed, id: product.id }
  })

  const supplierId = new Map<string, string>()
  for (const seed of SEED_SUPPLIERS) {
    const supplier = createSupplier(db, {
      name: seed.name,
      phone: seed.phone,
      address: seed.address,
      note: seed.note,
    })
    supplierId.set(seed.key, supplier.id)
  }

  const employeeIds: string[] = []
  for (const seed of SEED_EMPLOYEES) {
    employeeIds.push(createEmployee(db, { ...seed }).id)
  }
  const ownerId = employeeIds[0]
  const managerId = employeeIds[1]
  const accountantId = employeeIds[6]
  const cashiers = SEED_EMPLOYEES.map((employee, index) => ({ employee, id: employeeIds[index] }))
    .filter(({ employee }) => employee.role === 'cashier' && employee.status === 'active')
    .map(({ id }) => id)

  const customers = SEED_CUSTOMERS.map((seed, index) => {
    const created = createCustomer(db, at(HISTORY_DAYS + 25 - Math.min(index * 3, 55), 11), {
      name: seed.name,
      phone: seed.phone,
      address: seed.address,
      note: seed.note,
    })
    return { seed, id: created.id }
  })
  addCustomerNote(db, at(30, 12), customers[1].id, 'Qarz to‘lovini haftaning oxirida va’da qildi')
  addCustomerNote(db, at(12, 15), customers[5].id, 'Oylik hisob-kitob 25-sanada')

  const demand = new Map(products.map((product) => [product.id, dailyDemand(product.seed)]))

  const productById = (id: string) => db.products.find((product) => product.id === id)!
  const stock = (productId: string, location: LocationId) => stockOf(db.batches, productId, location)
  const sellable = (productId: string, location: LocationId, when: Date) =>
    sellableStockOf(db.batches, productId, location, toISODate(when))

  /* ---------- Operatsiyalar ---------- */
  const supplierPayQueue: Array<{ day: number; purchaseId: string }> = []
  const debtPayQueue: Array<{ day: number; debtId: string; amount: number; method: 'cash' | 'card' }> = []

  function restockWarehouse(daysAgo: number, initial: boolean): void {
    const when = at(daysAgo, 7, 10)
    for (const seed of SEED_SUPPLIERS) {
      const interval = SUPPLIER_INTERVAL[seed.key]
      if (!initial && (HISTORY_DAYS - daysAgo) % interval !== 0) continue
      const items: Array<{ productId: string; quantity: number; costPrice: number; expiryDate: string | null }> = []
      for (const product of products.filter((p) => p.seed.supplier === seed.key)) {
        if (product.seed.noRestockLate && daysAgo < 14) continue
        const dem = demand.get(product.id) ?? 1
        const shelf = product.seed.shelfLife
        const perishable = shelf !== null && shelf <= 21
        // Keyingi tashrifgacha yetmasa buyurtma beriladi
        const horizon = interval + 1.5
        const target = perishable ? Math.max(horizon + 0.5, Math.min((shelf ?? 6) * 0.6, 10)) : 24
        const onHand = stock(product.id, 'warehouse') + stock(product.id, 'store')
        if (!initial && onHand >= dem * horizon) continue
        const quantity = ceilQty(product.seed.unit, dem * target - onHand)
        if (quantity <= 0) continue
        const step = product.seed.cost >= 1000 ? 100 : 5
        const costPrice = Math.max(step, Math.round((product.seed.cost * COST_FACTOR * (1 + rand(-0.03, 0.04))) / step) * step)
        const expiryDate = shelf ? addDaysISO(when, Math.max(2, Math.round(shelf * rand(0.85, 1)))) : null
        items.push({ productId: product.id, quantity, costPrice, expiryDate })
      }
      if (items.length === 0) continue
      const total = items.reduce((sum, item) => sum + Math.round(item.quantity * item.costPrice), 0)
      const roll = rnd()
      const paid = initial || roll < 0.6 ? total : roll < 0.85 ? Math.round((total * rand(0.4, 0.8)) / 1000) * 1000 : 0
      const purchase = createPurchase(db, when, {
        supplierId: supplierId.get(seed.key) as string,
        date: toISODate(when),
        items,
        paid,
        note: '',
        confirm: true,
      })
      if (paid < total && rnd() < 0.7) {
        supplierPayQueue.push({ day: Math.max(0, daysAgo - int(4, 14)), purchaseId: purchase.id })
      }
    }
  }

  function topUpStore(daysAgo: number): void {
    // Tez buziladigan mahsulotlar har kuni, qolganlari 2 kunda bir marta (va bugun) do'konga to'ldiriladi
    const everyDay = daysAgo % 2 === 0 || daysAgo === 0
    const items: Array<{ productId: string; quantity: number }> = []
    for (const product of products) {
      if (!everyDay && (product.seed.shelfLife ?? 99) > 7) continue
      const dem = demand.get(product.id) ?? 1
      const inStore = stock(product.id, 'store')
      if (inStore >= dem * 2.6) continue
      const need = ceilQty(product.seed.unit, dem * 4.5 - inStore)
      const quantity = Math.min(floorQty(product.seed.unit, sellable(product.id, 'warehouse', at(daysAgo, 7, 40))), need)
      if (quantity > 0) items.push({ productId: product.id, quantity })
    }
    if (items.length === 0) return
    const transfer = createTransfer(db, at(daysAgo, 7, 40), {
      from: 'warehouse',
      to: 'store',
      items,
      note: 'Kundalik to‘ldirish',
      send: true,
    })
    receiveTransfer(db, at(daysAgo, 8, 5), transfer.id)
  }

  function qtyFor(unit: Unit, bulk: boolean): number {
    let qty: number
    switch (unit) {
      case 'dona':
        qty = pick([1, 1, 1, 2, 2, 3, 4, 6])
        break
      case 'kg':
        qty = pick([0.5, 1, 1, 1.5, 2, 2, 3])
        break
      case 'litr':
        qty = pick([1, 1, 2, 2, 3, 5])
        break
      case 'gramm':
        qty = pick([50, 100, 100, 150, 200, 300])
        break
    }
    return bulk && unit !== 'gramm' ? qty * int(2, 4) : qty
  }

  function simulateSales(daysAgo: number): void {
    const dayStart = at(daysAgo, 0)
    const weekend = dayStart.getDay() === 0 || dayStart.getDay() === 6
    let count = int(20, 30) + (weekend ? int(4, 8) : 0)
    count = Math.round(count * (1 + ((HISTORY_DAYS - daysAgo) / HISTORY_DAYS) * 0.12))
    let lastMinute = 21 * 60 - 8 * 60
    if (daysAgo === 0) {
      const elapsed = Math.max(30, today.getHours() * 60 + today.getMinutes() - 8 * 60)
      lastMinute = elapsed
      count = Math.max(4, Math.round(count * Math.min(1, elapsed / (13 * 60))))
    }
    const minutes = Array.from({ length: count }, () => int(0, lastMinute)).sort((a, b) => a - b)

    for (const offset of minutes) {
      const when = at(daysAgo, 8, offset)
      const hour = when.getHours()
      const cashierId = cashiers[(hour < 14 ? 0 : hour < 18 ? 1 : 2) % cashiers.length]
      const customer = rnd() < 0.24 ? weighted(customers, (c) => c.seed.weight) : null
      const wholesale = customer ? customer.seed.weight >= 5 && customer.seed.creditProne : false
      const lineCount = wholesale ? int(5, 9) : int(1, 6)

      const chosen = new Set<string>()
      const lines: Array<{ productId: string; quantity: number; unitPrice: number }> = []
      for (let attempt = 0; attempt < lineCount * 3 && lines.length < lineCount; attempt++) {
        const product = weighted(products, (p) => p.seed.pop)
        if (chosen.has(product.id)) continue
        chosen.add(product.id)
        const available = sellable(product.id, 'store', when)
        const wanted = qtyFor(product.seed.unit, wholesale)
        const quantity = Math.min(wanted, floorQty(product.seed.unit, available))
        if (quantity <= 0) continue
        lines.push({ productId: product.id, quantity, unitPrice: productById(product.id).salePrice })
      }
      if (lines.length === 0) continue

      const subtotal = lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPrice), 0)
      const discount = rnd() < 0.07 ? Math.min(subtotal, Math.round((subtotal * 0.05) / 500) * 500) : 0
      const total = subtotal - discount

      let paidCash = 0
      let paidCard = 0
      const method = rnd() < 0.62 ? 'cash' : 'card'
      const pay = (amount: number) => {
        if (method === 'cash') paidCash += amount
        else paidCard += amount
      }
      const roll = rnd()
      const creditChance = customer ? (customer.seed.creditProne ? 0.4 : 0.04) : 0
      if (customer && roll < creditChance * 0.7) {
        // to'liq nasiya
      } else if (customer && roll < creditChance) {
        pay(Math.max(1000, Math.round((total * rand(0.3, 0.7)) / 1000) * 1000))
      } else {
        pay(total)
      }
      if (paidCash + paidCard > total) {
        paidCash = method === 'cash' ? total : 0
        paidCard = method === 'card' ? total : 0
      }

      const dueDays = pick([7, 14, 14, 21, 30])
      const sale = createSale(db, when, {
        customerId: customer?.id ?? null,
        cashierId,
        items: lines,
        discount,
        paidCash,
        paidCard,
        dueDate: addDaysISO(when, dueDays),
        note: '',
      })

      const debt = db.debts.find((item) => item.saleId === sale.id)
      if (debt) {
        const r = rnd()
        if (r < 0.65) {
          const delay = int(3, 22)
          if (rnd() < 0.3) {
            const first = Math.round((debt.amount * rand(0.3, 0.6)) / 1000) * 1000
            debtPayQueue.push({ day: daysAgo - delay, debtId: debt.id, amount: Math.max(1000, first), method: pick(['cash', 'card'] as const) })
            debtPayQueue.push({ day: daysAgo - delay - int(2, 6), debtId: debt.id, amount: debt.amount, method: 'cash' })
          } else {
            debtPayQueue.push({ day: daysAgo - delay, debtId: debt.id, amount: debt.amount, method: pick(['cash', 'card'] as const) })
          }
        } else if (r < 0.84) {
          const part = Math.max(1000, Math.round((debt.amount * rand(0.3, 0.6)) / 1000) * 1000)
          debtPayQueue.push({ day: daysAgo - int(5, 20), debtId: debt.id, amount: Math.min(part, debt.amount), method: 'cash' })
        }
      }

      if (daysAgo > 0 && rnd() < 0.012) {
        cancelSale(db, new Date(when.getTime() + 20 * 60_000), {
          saleId: sale.id,
          kind: rnd() < 0.5 ? 'cancelled' : 'returned',
          reason: pick(['Mijoz fikrini o‘zgartirdi', 'Mahsulot sifati qoniqtirmadi', 'Noto‘g‘ri chek']),
        })
      }
    }
  }

  function processQueues(daysAgo: number): void {
    for (const item of supplierPayQueue.filter((entry) => entry.day === daysAgo)) {
      const purchase = db.purchases.find((p) => p.id === item.purchaseId)
      if (!purchase) continue
      const paid = purchase.payments.reduce((sum, payment) => sum + payment.amount, 0)
      if (purchase.total - paid > 0) paySupplier(db, at(daysAgo, 15), purchase.id, purchase.total - paid, 'Qarz to‘lovi')
    }
    for (const item of debtPayQueue.filter((entry) => entry.day === daysAgo && entry.day >= 0)) {
      const debt = db.debts.find((d) => d.id === item.debtId)
      if (!debt || debt.state !== 'active') continue
      const remaining = debtRemaining(debt)
      if (remaining <= 0) continue
      payDebt(db, at(daysAgo, int(11, 19), int(0, 59)), {
        debtId: debt.id,
        amount: Math.min(item.amount, remaining),
        method: item.method,
        note: '',
      })
    }
  }

  /* ---------- Kunlik simulyatsiya ---------- */
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    restockWarehouse(daysAgo, daysAgo === HISTORY_DAYS)
    topUpStore(daysAgo)
    simulateSales(daysAgo)
    processQueues(daysAgo)

    if (daysAgo === 11) {
      // Xarid hujjatisiz kirim (masalan, sovg'a / fermerdan to'g'ridan-to'g'ri)
      const zira = products.find((p) => p.seed.name.startsWith('Zira'))
      const choy = products.find((p) => p.seed.name.startsWith('Qora choy'))
      if (zira && choy) {
        createStockReceipt(db, at(daysAgo, 12), {
          locationId: 'warehouse',
          items: [
            { productId: zira.id, quantity: 1500, expiryDate: addDaysISO(at(daysAgo, 12), 300) },
            { productId: choy.id, quantity: 12, expiryDate: addDaysISO(at(daysAgo, 12), 600) },
          ],
          note: 'Hamkordan to‘g‘ridan-to‘g‘ri kirim',
        })
      }
    }
    if (daysAgo === 6) {
      const item = products.find((p) => p.seed.name.startsWith('Smetana'))
      if (item) {
        const quantity = Math.min(4, floorQty(item.seed.unit, stock(item.id, 'warehouse')))
        if (quantity > 0) {
          createStockReturn(db, at(daysAgo, 13), {
            locationId: 'warehouse',
            supplierId: supplierId.get('dairy') as string,
            items: [{ productId: item.id, quantity }],
            note: 'Qadoq shikastlangan',
          })
        }
      }
    }
    if (daysAgo === 5) {
      // Muddati o'tgan tovarlar hisobdan chiqariladi (inventarizatsiya tuzatishi sifatida)
      const when = at(daysAgo, 19)
      for (const location of ['warehouse', 'store'] as const) {
        const items = products.flatMap((p) => {
          const physical = stock(p.id, location)
          const good = sellable(p.id, location, when)
          return physical - good > 0 ? [{ productId: p.id, counted: good }] : []
        })
        if (items.length > 0) {
          createAudit(db, when, { locationId: location, items, note: 'Muddati o‘tgan tovarlarni hisobdan chiqarish' })
        }
      }
    }
    if (daysAgo === 4) {
      const sample = products.filter((p) => stock(p.id, 'store') > 3).slice(0, 8)
      createAudit(db, at(daysAgo, 20, 30), {
        locationId: 'store',
        items: sample.map((p, index) => {
          const expected = stock(p.id, 'store')
          const shift = [0, -1, 0, 1, 0, -2, 0, 0][index] ?? 0
          const counted = p.seed.unit === 'kg' ? Math.max(0, expected + shift * 0.5) : Math.max(0, expected + shift)
          return { productId: p.id, counted }
        }),
        note: 'Oylik inventarizatsiya',
      })
    }
  }

  /* ---------- Bugun: muddati yaqin partiya (hamkordan chegirma bilan olingan) ---------- */
  const nearExpiry: Array<[string, number, number]> = [
    ['Smetana', 8, 3],
    ['Pishloq', 3, 8],
    ['Pechenye', 10, 20],
    ['Sutli shokolad', 12, 25],
  ]
  createStockReceipt(db, at(0, 8, 20), {
    locationId: 'warehouse',
    items: nearExpiry.flatMap(([prefix, quantity, days]) => {
      const product = products.find((p) => p.seed.name.startsWith(prefix))
      return product ? [{ productId: product.id, quantity, expiryDate: addDaysISO(today, days) }] : []
    }),
    note: 'Muddati yaqin partiya (chegirma bilan)',
  })

  /* ---------- Bugungi holat: kutilayotgan hujjatlar ---------- */
  const inStock = products.filter((p) => sellable(p.id, 'warehouse', today) > 5)
  if (inStock.length >= 6) {
    const toItems = (list: typeof inStock) =>
      list.map((p) => ({ productId: p.id, quantity: Math.max(1, floorQty(p.seed.unit, Math.min(sellable(p.id, 'warehouse', today) * 0.15, 12))) }))
    const draft = inStock.slice(0, 3)
    const sent = inStock.slice(3, 6)
    createTransfer(db, at(0, 9, 15), { from: 'warehouse', to: 'store', items: toItems(draft), note: 'Ertangi to‘ldirish uchun', send: false })
    createTransfer(db, at(0, 10, 30), { from: 'warehouse', to: 'store', items: toItems(sent), note: 'Qabul qilinishi kutilmoqda', send: true })
    const cancelled = createTransfer(db, at(1, 17, 0), { from: 'warehouse', to: 'store', items: toItems(inStock.slice(6, 7)), note: 'Noto‘g‘ri tanlangan', send: false })
    cancelTransfer(db, at(1, 17, 10), cancelled.id)
  }
  const tradeItems = products.filter((p) => p.seed.supplier === 'trade').slice(0, 3)
  createPurchase(db, at(0, 9, 40), {
    supplierId: supplierId.get('trade') as string,
    date: toISODate(today),
    items: tradeItems.map((p) => ({
      productId: p.id,
      quantity: ceilQty(p.seed.unit, 40),
      costPrice: costOf(p.seed),
      expiryDate: p.seed.shelfLife ? addDaysISO(today, p.seed.shelfLife) : null,
    })),
    paid: 0,
    note: 'Ertaga yetkazib beriladi',
    confirm: false,
  })

  /* ---------- Xarajatlar ---------- */
  const windowStart = subDays(base, HISTORY_DAYS)
  const addExpense = (date: Date, category: ExpenseCategory, amount: number, employeeId: string, note?: string) => {
    if (date < windowStart || date > today) return
    createExpense(db, {
      date: toISODate(date),
      category,
      amount,
      note: note ?? pick(EXPENSE_NOTES[category]),
      employeeId,
    })
  }
  for (let m = 2; m >= 0; m--) {
    const monthStart = startOfMonth(subMonths(base, m))
    const day = (n: number) => new Date(monthStart.getFullYear(), monthStart.getMonth(), n)
    addExpense(day(1), 'rent', 3_500_000, accountantId)
    addExpense(day(10), 'utilities', Math.round(rand(620_000, 900_000) / 10_000) * 10_000, accountantId, 'Elektr energiyasi va suv')
    addExpense(day(14), 'utilities', Math.round(rand(150_000, 250_000) / 10_000) * 10_000, accountantId, 'Internet va telefon')
    for (let i = 0; i < int(3, 5); i++) {
      addExpense(day(int(2, 27)), 'transport', Math.round(rand(120_000, 380_000) / 10_000) * 10_000, pick([managerId, employeeIds[5]]))
    }
    if (rnd() < 0.8) addExpense(day(int(5, 25)), 'repair', Math.round(rand(250_000, 900_000) / 10_000) * 10_000, managerId)
    for (let i = 0; i < int(1, 3); i++) {
      addExpense(day(int(3, 28)), 'other', Math.round(rand(60_000, 320_000) / 10_000) * 10_000, pick([managerId, ownerId]))
    }
  }

  /* ---------- Oylik ---------- */
  const clamp = (date: Date) => (date > today ? today : date)
  const currentMonth = startOfMonth(base)
  const periodFor = (monthsAgo: number) => periodOf(subMonths(currentMonth, monthsAgo))
  const settle = (monthsAgo: number, leaveOneUnpaid: boolean) => {
    const period = periodFor(monthsAgo)
    generatePayroll(db, period)
    const records = db.payroll.filter((record) => record.period === period)
    records.forEach((record, index) => {
      if (index % 3 === 1) updatePayroll(db, record.id, { baseSalary: record.baseSalary, bonus: 300_000 * int(1, 3), deduction: 0, advance: 0, note: 'Reja bajarilgani uchun' })
      if (index === 4) updatePayroll(db, record.id, { baseSalary: record.baseSalary, bonus: 0, deduction: 150_000, advance: 500_000, note: 'Kechikish jarimasi, avans berilgan' })
    })
    const nextMonth = addMonths(subMonths(currentMonth, monthsAgo), 1)
    const approveAt = clamp(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 3, 10, 0))
    const payAt = clamp(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 5, 15, 0))
    records.forEach((record, index) => {
      approvePayroll(db, approveAt, record.id)
      const fresh = db.payroll.find((item) => item.id === record.id)
      if (!fresh || fresh.status === 'paid') return
      if (leaveOneUnpaid && index === records.length - 1) return
      payPayroll(db, payAt, record.id, payrollPayable(fresh) - fresh.paid)
    })
  }
  settle(1, true)
  // Joriy oy: hisob-kitob qoralama (tasdiqlanmagan), ba'zilariga avans berilgan
  generatePayroll(db, periodFor(0))
  const current = db.payroll.filter((record) => record.period === periodFor(0))
  current.forEach((record, index) => {
    if (index % 2 === 0) updatePayroll(db, record.id, { baseSalary: record.baseSalary, bonus: 0, deduction: 0, advance: 500_000, note: 'Avans' })
  })

  assert(db.sales.length > 0, 'Demo savdolar yaratilmadi')
  return db
}
