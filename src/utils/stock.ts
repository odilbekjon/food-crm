import { t as tNow, type TFn } from '@/i18n/core'
import type { Database, LocationId, Product, StockBatch } from '@/types'
import { diffInDays, toISODate } from '@/utils/date'
import { round3 } from '@/utils/format'

export const LOCATION_IDS: LocationId[] = ['warehouse', 'store']

export const LOCATION_LABELS: Record<LocationId, string> = {
  warehouse: 'Asosiy sklad',
  store: "Savdo do'koni",
}

export interface StockLevels {
  /** Jismoniy qoldiq (muddati o'tganlar ham kiradi) */
  warehouse: number
  store: number
  total: number
  /** Shundan muddati o'tgan miqdor */
  expired: number
  /** Sotishga yaroqli umumiy qoldiq = total − expired */
  sellable: number
}

export type StockState = 'ok' | 'low' | 'out'

export function isExpired(batch: Pick<StockBatch, 'expiryDate'>, onDate: string): boolean {
  return batch.expiryDate !== null && batch.expiryDate < onDate
}

/** Barcha mahsulotlar bo'yicha joylardagi qoldiqni partiyalardan yig'adi. */
export function buildStockIndex(batches: StockBatch[], onDate: string = toISODate(new Date())): Map<string, StockLevels> {
  const index = new Map<string, StockLevels>()
  for (const batch of batches) {
    const levels = index.get(batch.productId) ?? { warehouse: 0, store: 0, total: 0, expired: 0, sellable: 0 }
    levels[batch.locationId] = round3(levels[batch.locationId] + batch.quantity)
    if (isExpired(batch, onDate)) levels.expired = round3(levels.expired + batch.quantity)
    levels.total = round3(levels.warehouse + levels.store)
    levels.sellable = round3(levels.total - levels.expired)
    index.set(batch.productId, levels)
  }
  return index
}

export const EMPTY_LEVELS: StockLevels = { warehouse: 0, store: 0, total: 0, expired: 0, sellable: 0 }

/** Joydagi jismoniy qoldiq (muddati o'tganlar bilan). */
export function stockOf(batches: StockBatch[], productId: string, locationId: LocationId): number {
  let sum = 0
  for (const batch of batches) {
    if (batch.productId === productId && batch.locationId === locationId) sum += batch.quantity
  }
  return round3(sum)
}

/** Joydagi sotish/o'tkazishga yaroqli (muddati o'tmagan) qoldiq. */
export function sellableStockOf(
  batches: StockBatch[],
  productId: string,
  locationId: LocationId,
  onDate: string,
): number {
  let sum = 0
  for (const batch of batches) {
    if (batch.productId === productId && batch.locationId === locationId && !isExpired(batch, onDate)) {
      sum += batch.quantity
    }
  }
  return round3(sum)
}

export function stockState(total: number, minStock: number): StockState {
  if (total <= 0) return 'out'
  if (total <= minStock) return 'low'
  return 'ok'
}

export interface LowStockRow {
  product: Product
  levels: StockLevels
  state: StockState
}

/** Umumiy qoldig'i minimal zaxiradan oshmagan faol mahsulotlar. */
export function getLowStock(db: Database, index = buildStockIndex(db.batches)): LowStockRow[] {
  const rows: LowStockRow[] = []
  for (const product of db.products) {
    if (product.status !== 'active') continue
    const levels = index.get(product.id) ?? EMPTY_LEVELS
    const state = stockState(levels.sellable, product.minStock)
    if (state !== 'ok') rows.push({ product, levels, state })
  }
  return rows.sort((a, b) => a.levels.sellable / (a.product.minStock || 1) - b.levels.sellable / (b.product.minStock || 1))
}

export interface ExpiringRow {
  batch: StockBatch
  product: Product
  daysLeft: number
}

/**
 * "Muddati yaqin" ogohlantirish oynasi mahsulotning saqlanish muddatiga bog'liq:
 * tez buziladigan mahsulotlar uchun kam, uzoq saqlanadiganlar uchun ko'p kun.
 */
export function expiryWarningDays(product: Pick<Product, 'shelfLifeDays'>): number {
  const shelf = product.shelfLifeDays
  if (shelf === null) return 14
  if (shelf <= 7) return 2
  if (shelf <= 21) return 4
  if (shelf <= 60) return 10
  return 30
}

/**
 * Muddati tugagan yoki tugashiga yaqin partiyalar. `withinDays` berilsa, barcha
 * mahsulotlar uchun shu kun oynasi ishlatiladi; berilmasa — mahsulotga mos oyna.
 */
export function getExpiringBatches(db: Database, now: Date, withinDays?: number): ExpiringRow[] {
  const productMap = new Map(db.products.map((product) => [product.id, product]))
  const rows: ExpiringRow[] = []
  for (const batch of db.batches) {
    if (!batch.expiryDate || batch.quantity <= 0) continue
    const daysLeft = diffInDays(batch.expiryDate, now)
    const product = productMap.get(batch.productId)
    if (!product) continue
    if (daysLeft <= (withinDays ?? expiryWarningDays(product))) rows.push({ batch, product, daysLeft })
  }
  return rows.sort((a, b) => a.daysLeft - b.daysLeft)
}

export function expiryLabel(daysLeft: number, t: TFn = tNow): string {
  if (daysLeft < 0) return t('expiry.expired', { n: Math.abs(daysLeft) })
  if (daysLeft === 0) return t('expiry.today')
  return t('expiry.left', { n: daysLeft })
}
