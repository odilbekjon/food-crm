import type { AuditInput, StockReceiptInput, StockReturnInput, TransferInput } from '@/services/api/types'
import type { Database, StockDoc, Transfer } from '@/types'
import { addDaysISO, toISODate } from '@/utils/date'
import { round3 } from '@/utils/format'
import { LOCATION_LABELS, sellableStockOf, stockOf } from '@/utils/stock'
import {
  addBatch,
  assert,
  newBatchNo,
  nextId,
  nextNumber,
  pushMovement,
  requireProduct,
  restoreAllocations,
  takeStock,
} from './core'

const CURRENT_USER = 'Demo foydalanuvchi'

function requireTransfer(db: Database, id: string): Transfer {
  const transfer = db.transfers.find((item) => item.id === id)
  assert(transfer, 'O‘tkazma topilmadi')
  return transfer
}

function validateItems(db: Database, items: Array<{ productId: string; quantity: number }>, allowZero = false): void {
  assert(items.length > 0, 'Kamida bitta mahsulot qo‘shing')
  const seen = new Set<string>()
  for (const item of items) {
    const product = requireProduct(db, item.productId)
    assert(!seen.has(item.productId), `"${product.name}" ro‘yxatda takrorlangan`)
    seen.add(item.productId)
    assert(allowZero ? item.quantity >= 0 : item.quantity > 0, `"${product.name}" miqdori noto‘g‘ri`)
    const unit = db.settings.units.find((u) => u.id === product.unit)
    assert(unit?.allowDecimal || Number.isInteger(item.quantity), `"${product.name}" faqat butun miqdorda bo‘ladi`)
  }
}

/* ----------------------------- O'tkazmalar ----------------------------- */

/** Qoralama yaratadi (qoldiqqa ta'sir qilmaydi). `send` bo'lsa darhol yuboradi. */
export function createTransfer(db: Database, now: Date, input: TransferInput): Transfer {
  assert(input.from !== input.to, 'Jo‘natuvchi va qabul qiluvchi joy bir xil bo‘lishi mumkin emas')
  validateItems(db, input.items)
  const transfer: Transfer = {
    id: nextId(db, 'tr'),
    number: nextNumber(db, 'transfer'),
    from: input.from,
    to: input.to,
    status: 'draft',
    items: input.items.map((item) => ({ productId: item.productId, quantity: round3(item.quantity), allocations: [] })),
    note: input.note.trim(),
    createdAt: now.toISOString(),
    sentAt: null,
    receivedAt: null,
    cancelledAt: null,
    createdBy: CURRENT_USER,
  }
  db.transfers.push(transfer)
  if (input.send) sendTransfer(db, now, transfer.id)
  return transfer
}

/** Yuborish: qoldiq jo'natuvchi joydan chiqadi (yo'lda). Qabul qilinmaguncha boshqa joyga qo'shilmaydi. */
export function sendTransfer(db: Database, now: Date, id: string): void {
  const transfer = requireTransfer(db, id)
  assert(transfer.status === 'draft', 'Faqat qoralama o‘tkazmani yuborish mumkin')
  // Avval hammasini tekshiramiz, keyin o'zgartiramiz.
  const today = toISODate(now)
  for (const item of transfer.items) {
    const product = requireProduct(db, item.productId)
    const available = sellableStockOf(db.batches, item.productId, transfer.from, today)
    assert(
      available + 1e-9 >= item.quantity,
      `"${product.name}" yetarli emas: ${LOCATION_LABELS[transfer.from]}da yaroqli ${available} mavjud, ${item.quantity} kerak`,
    )
  }
  for (const item of transfer.items) {
    item.allocations = takeStock(db, item.productId, transfer.from, item.quantity, today)
    pushMovement(db, now, {
      productId: item.productId,
      locationId: transfer.from,
      quantity: -item.quantity,
      type: 'transfer_out',
      refId: transfer.id,
      refNumber: transfer.number,
    })
  }
  transfer.status = 'sent'
  transfer.sentAt = now.toISOString()
}

/** Qabul qilish: qoldiq qabul qiluvchi joyga qo'shiladi. */
export function receiveTransfer(db: Database, now: Date, id: string): void {
  const transfer = requireTransfer(db, id)
  assert(transfer.status === 'sent', 'Faqat yuborilgan o‘tkazmani qabul qilish mumkin')
  for (const item of transfer.items) {
    restoreAllocations(db, now, item.productId, transfer.to, item.allocations)
    pushMovement(db, now, {
      productId: item.productId,
      locationId: transfer.to,
      quantity: item.quantity,
      type: 'transfer_in',
      refId: transfer.id,
      refNumber: transfer.number,
    })
  }
  transfer.status = 'received'
  transfer.receivedAt = now.toISOString()
}

/** Bekor qilish: yuborilgan bo'lsa, qoldiq jo'natuvchi joyga qaytariladi. */
export function cancelTransfer(db: Database, now: Date, id: string): void {
  const transfer = requireTransfer(db, id)
  assert(transfer.status === 'draft' || transfer.status === 'sent', 'Bu o‘tkazmani bekor qilib bo‘lmaydi')
  if (transfer.status === 'sent') {
    for (const item of transfer.items) {
      restoreAllocations(db, now, item.productId, transfer.from, item.allocations)
      pushMovement(db, now, {
        productId: item.productId,
        locationId: transfer.from,
        quantity: item.quantity,
        type: 'transfer_cancel',
        refId: transfer.id,
        refNumber: transfer.number,
      })
    }
  }
  transfer.status = 'cancelled'
  transfer.cancelledAt = now.toISOString()
}

/* ----------------------------- Kirim / qaytarish / inventarizatsiya ----------------------------- */

function createDoc(
  db: Database,
  now: Date,
  doc: Pick<StockDoc, 'kind' | 'locationId' | 'supplierId' | 'note' | 'items'>,
): StockDoc {
  const created: StockDoc = {
    id: nextId(db, 'doc'),
    number: nextNumber(db, 'doc'),
    date: now.toISOString(),
    createdBy: CURRENT_USER,
    ...doc,
    note: doc.note.trim(),
  }
  db.stockDocs.push(created)
  return created
}

/** Xarid hujjatisiz, qo'lda skladga (yoki do'konga) kirim. */
export function createStockReceipt(db: Database, now: Date, input: StockReceiptInput): void {
  validateItems(db, input.items)
  const doc = createDoc(db, now, {
    kind: 'receipt',
    locationId: input.locationId,
    supplierId: null,
    note: input.note,
    items: input.items.map((item) => ({
      productId: item.productId,
      quantity: round3(item.quantity),
      expectedQty: null,
      expiryDate: item.expiryDate,
    })),
  })
  const batchNo = newBatchNo(db, now)
  for (const item of doc.items) {
    addBatch(db, now, {
      productId: item.productId,
      locationId: input.locationId,
      quantity: item.quantity,
      batchNo,
      expiryDate: item.expiryDate,
    })
    pushMovement(db, now, {
      productId: item.productId,
      locationId: input.locationId,
      quantity: item.quantity,
      type: 'receipt',
      refId: doc.id,
      refNumber: doc.number,
      note: input.note,
    })
  }
}

/** Yetkazib beruvchiga qaytarish: joydagi qoldiq kamayadi. */
export function createStockReturn(db: Database, now: Date, input: StockReturnInput): void {
  validateItems(db, input.items)
  if (input.supplierId) assert(db.suppliers.some((supplier) => supplier.id === input.supplierId), 'Yetkazib beruvchi topilmadi')
  for (const item of input.items) {
    const product = requireProduct(db, item.productId)
    const available = stockOf(db.batches, item.productId, input.locationId)
    assert(available + 1e-9 >= item.quantity, `"${product.name}" yetarli emas: ${available} mavjud, ${item.quantity} kerak`)
  }
  const doc = createDoc(db, now, {
    kind: 'return',
    locationId: input.locationId,
    supplierId: input.supplierId,
    note: input.note,
    items: input.items.map((item) => ({
      productId: item.productId,
      quantity: round3(item.quantity),
      expectedQty: null,
      expiryDate: null,
    })),
  })
  for (const item of doc.items) {
    takeStock(db, item.productId, input.locationId, item.quantity)
    pushMovement(db, now, {
      productId: item.productId,
      locationId: input.locationId,
      quantity: -item.quantity,
      type: 'return_out',
      refId: doc.id,
      refNumber: doc.number,
      note: input.note,
    })
  }
}

/** Inventarizatsiya: sanalgan miqdor tizimdagidan farq qilsa, farq tuzatish sifatida yoziladi. */
export function createAudit(db: Database, now: Date, input: AuditInput): void {
  validateItems(db, input.items.map((item) => ({ productId: item.productId, quantity: item.counted })), true)
  const lines = input.items.map((item) => ({
    ...item,
    expected: stockOf(db.batches, item.productId, input.locationId),
  }))
  const doc = createDoc(db, now, {
    kind: 'audit',
    locationId: input.locationId,
    supplierId: null,
    note: input.note,
    items: lines.map((line) => ({
      productId: line.productId,
      quantity: round3(line.counted),
      expectedQty: line.expected,
      expiryDate: null,
    })),
  })
  for (const line of lines) {
    const diff = round3(line.counted - line.expected)
    if (diff === 0) continue
    if (diff > 0) {
      const product = requireProduct(db, line.productId)
      const expiryDate = product.shelfLifeDays ? addDaysISO(now, product.shelfLifeDays) : null
      addBatch(db, now, {
        productId: line.productId,
        locationId: input.locationId,
        quantity: diff,
        batchNo: newBatchNo(db, now),
        expiryDate,
      })
    } else {
      takeStock(db, line.productId, input.locationId, -diff)
    }
    pushMovement(db, now, {
      productId: line.productId,
      locationId: input.locationId,
      quantity: diff,
      type: 'audit',
      refId: doc.id,
      refNumber: doc.number,
      note: input.note,
    })
  }
}
