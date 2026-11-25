import type { CustomerPaymentInput, DebtPaymentInput } from '@/services/api/types'
import type { Database, Debt } from '@/types'
import { debtRemaining } from '@/utils/finance'
import { assert, nextId } from './core'

function applyPayment(
  db: Database,
  now: Date,
  debt: Debt,
  amount: number,
  method: 'cash' | 'card',
  note: string,
): void {
  debt.paid += amount
  db.payments.push({
    id: nextId(db, 'pay'),
    date: now.toISOString(),
    customerId: debt.customerId,
    saleId: debt.saleId,
    debtId: debt.id,
    kind: 'debt_payment',
    method,
    amount,
    note,
  })
}

/** Bitta qarz bo'yicha qisman yoki to'liq to'lov. */
export function payDebt(db: Database, now: Date, input: DebtPaymentInput): void {
  const debt = db.debts.find((item) => item.id === input.debtId)
  assert(debt, 'Qarz topilmadi')
  assert(debt.state === 'active', 'Bekor qilingan savdo qarzini to‘lab bo‘lmaydi')
  assert(Number.isFinite(input.amount) && input.amount > 0, 'To‘lov summasi noldan katta bo‘lishi kerak')
  const remaining = debtRemaining(debt)
  assert(remaining > 0, 'Bu qarz allaqachon to‘langan')
  assert(input.amount <= remaining, 'To‘lov summasi qolgan qarzdan oshib ketdi')
  applyPayment(db, now, debt, Math.round(input.amount), input.method, input.note.trim())
}

/** Mijozning umumiy to'lovini eng eski qarzlardan boshlab taqsimlaydi. */
export function payCustomerDebts(db: Database, now: Date, input: CustomerPaymentInput): void {
  assert(db.customers.some((customer) => customer.id === input.customerId), 'Mijoz topilmadi')
  assert(Number.isFinite(input.amount) && input.amount > 0, 'To‘lov summasi noldan katta bo‘lishi kerak')
  const open = db.debts
    .filter((debt) => debt.customerId === input.customerId && debt.state === 'active' && debtRemaining(debt) > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const totalRemaining = open.reduce((sum, debt) => sum + debtRemaining(debt), 0)
  assert(totalRemaining > 0, 'Mijozning qarzi yo‘q')
  assert(input.amount <= totalRemaining, 'To‘lov summasi jami qarzdan oshib ketdi')
  let left = Math.round(input.amount)
  for (const debt of open) {
    if (left <= 0) break
    const part = Math.min(left, debtRemaining(debt))
    applyPayment(db, now, debt, part, input.method, input.note.trim())
    left -= part
  }
}
