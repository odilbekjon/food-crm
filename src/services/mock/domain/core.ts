import type {
  Allocation,
  Database,
  ISODate,
  LocationId,
  MovementType,
  StockBatch,
} from '@/types'
import { toISODate } from '@/utils/date'
import { round3 } from '@/utils/format'
import { LOCATION_LABELS, isExpired, sellableStockOf, stockOf } from '@/utils/stock'

/** Biznes qoidasi buzilganda tashlanadi; UI xabarni toast sifatida ko'rsatadi. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError(message)
}

/* ----------------------------- ID va raqamlar ----------------------------- */

export function nextId(db: Database, prefix: string): string {
  db.counters[prefix] = (db.counters[prefix] ?? 0) + 1
  return `${prefix}_${db.counters[prefix]}`
}

const NUMBER_FORMATS: Record<string, { prefix: string; pad: number }> = {
  sale: { prefix: 'CH-', pad: 6 },
  transfer: { prefix: 'OT-', pad: 5 },
  purchase: { prefix: 'XR-', pad: 5 },
  doc: { prefix: 'SK-', pad: 5 },
  batch: { prefix: 'P-', pad: 5 },
}

/** Hujjat raqami: CH-000123, OT-00012 ... */
export function nextNumber(db: Database, kind: keyof typeof NUMBER_FORMATS): string {
  const key = `no_${kind}`
  db.counters[key] = (db.counters[key] ?? 0) + 1
  const { prefix, pad } = NUMBER_FORMATS[kind]
  return `${prefix}${String(db.counters[key]).padStart(pad, '0')}`
}

/* ----------------------------- Qoldiq harakatlari ----------------------------- */

export interface MovementInput {
  productId: string
  locationId: LocationId
  quantity: number
  type: MovementType
  refId: string
  refNumber: string
  note?: string
}

export function pushMovement(db: Database, now: Date, input: MovementInput): void {
  db.movements.push({
    id: nextId(db, 'mv'),
    date: now.toISOString(),
    productId: input.productId,
    locationId: input.locationId,
    quantity: round3(input.quantity),
    type: input.type,
    refId: input.refId,
    refNumber: input.refNumber,
    note: input.note ?? '',
  })
}

/** Joyga partiya qo'shadi; bir xil partiya va muddat bo'lsa, mavjud partiyaga qo'shiladi. */
export function addBatch(
  db: Database,
  now: Date,
  params: {
    productId: string
    locationId: LocationId
    quantity: number
    batchNo: string
    expiryDate: ISODate | null
  },
): StockBatch {
  assert(params.quantity > 0, 'Miqdor noldan katta bo‘lishi kerak')
  const existing = db.batches.find(
    (batch) =>
      batch.productId === params.productId &&
      batch.locationId === params.locationId &&
      batch.batchNo === params.batchNo &&
      batch.expiryDate === params.expiryDate,
  )
  if (existing) {
    existing.quantity = round3(existing.quantity + params.quantity)
    return existing
  }
  const batch: StockBatch = {
    id: nextId(db, 'b'),
    productId: params.productId,
    locationId: params.locationId,
    batchNo: params.batchNo,
    quantity: round3(params.quantity),
    expiryDate: params.expiryDate,
    receivedAt: now.toISOString(),
  }
  db.batches.push(batch)
  return batch
}

/**
 * Qoldiqni FIFO/FEFO tartibida kamaytiradi: avval muddati yaqin, keyin muddatsiz
 * partiyalar (eskisi birinchi). Yetarli bo'lmasa — xato, hech narsa o'zgarmaydi.
 */
export function takeStock(
  db: Database,
  productId: string,
  locationId: LocationId,
  quantity: number,
  /** Berilsa, shu sanada muddati o'tgan partiyalar olinmaydi (savdo, o'tkazma uchun) */
  sellableOn?: ISODate,
): Allocation[] {
  assert(quantity > 0, 'Miqdor noldan katta bo‘lishi kerak')
  const available = sellableOn
    ? sellableStockOf(db.batches, productId, locationId, sellableOn)
    : stockOf(db.batches, productId, locationId)
  if (available + 1e-9 < quantity) {
    const name = db.products.find((product) => product.id === productId)?.name ?? productId
    throw new DomainError(
      `"${name}" yetarli emas: ${LOCATION_LABELS[locationId]}da ${sellableOn ? 'yaroqli ' : ''}${available} mavjud, ${quantity} kerak`,
    )
  }
  const candidates = db.batches
    .filter(
      (batch) =>
        batch.productId === productId &&
        batch.locationId === locationId &&
        batch.quantity > 0 &&
        !(sellableOn && isExpired(batch, sellableOn)),
    )
    .sort((a, b) => {
      if (a.expiryDate && b.expiryDate && a.expiryDate !== b.expiryDate) return a.expiryDate < b.expiryDate ? -1 : 1
      if (a.expiryDate && !b.expiryDate) return -1
      if (!a.expiryDate && b.expiryDate) return 1
      return a.receivedAt < b.receivedAt ? -1 : a.receivedAt > b.receivedAt ? 1 : 0
    })
  const allocations: Allocation[] = []
  let remaining = round3(quantity)
  for (const batch of candidates) {
    if (remaining <= 0) break
    const take = round3(Math.min(batch.quantity, remaining))
    batch.quantity = round3(batch.quantity - take)
    remaining = round3(remaining - take)
    allocations.push({ batchNo: batch.batchNo, expiryDate: batch.expiryDate, quantity: take })
  }
  db.batches = db.batches.filter((batch) => batch.quantity > 0)
  return allocations
}

/** Olingan partiyalarni joyga qaytaradi (o'tkazma qabul qilish, savdo qaytarish). */
export function restoreAllocations(
  db: Database,
  now: Date,
  productId: string,
  locationId: LocationId,
  allocations: Allocation[],
): void {
  for (const allocation of allocations) {
    addBatch(db, now, {
      productId,
      locationId,
      quantity: allocation.quantity,
      batchNo: allocation.batchNo,
      expiryDate: allocation.expiryDate,
    })
  }
}

export function newBatchNo(db: Database, now: Date): string {
  return `${nextNumber(db, 'batch')}/${toISODate(now).slice(2).replace(/-/g, '')}`
}

export function requireProduct(db: Database, productId: string) {
  const product = db.products.find((item) => item.id === productId)
  assert(product, 'Mahsulot topilmadi')
  return product
}

export function requireUnique<T>(items: T[], key: (item: T) => string, label: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    const value = key(item)
    assert(!seen.has(value), `${label} takrorlangan`)
    seen.add(value)
  }
}
