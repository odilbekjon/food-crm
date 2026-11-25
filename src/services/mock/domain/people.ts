import type {
  CustomerInput,
  EmployeeInput,
  ExpenseInput,
  PayrollUpdateInput,
  SettingsPatch,
} from '@/services/api/types'
import type { Customer, Database, Employee, Expense, PayrollRecord } from '@/types'
import { payrollAccrued, payrollPayable, payrollRemaining } from '@/utils/finance'
import { assert, nextId } from './core'

/* ----------------------------- Mijozlar ----------------------------- */

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function validateCustomer(db: Database, input: CustomerInput, selfId?: string): void {
  assert(input.name.trim().length >= 2, 'Mijoz ismi kamida 2 ta belgidan iborat bo‘lishi kerak')
  const phone = normalizePhone(input.phone)
  assert(phone.length >= 9, 'Telefon raqami noto‘g‘ri')
  assert(
    !db.customers.some((customer) => customer.id !== selfId && normalizePhone(customer.phone) === phone),
    'Bu telefon raqamli mijoz allaqachon mavjud',
  )
}

export function createCustomer(db: Database, now: Date, input: CustomerInput): Customer {
  validateCustomer(db, input)
  const customer: Customer = {
    ...input,
    name: input.name.trim(),
    id: nextId(db, 'cus'),
    notes: [],
    status: 'active',
    createdAt: now.toISOString(),
  }
  db.customers.push(customer)
  return customer
}

export function updateCustomer(db: Database, id: string, input: CustomerInput): Customer {
  const customer = db.customers.find((item) => item.id === id)
  assert(customer, 'Mijoz topilmadi')
  validateCustomer(db, input, id)
  Object.assign(customer, input, { name: input.name.trim() })
  return customer
}

export function setCustomerStatus(db: Database, id: string, status: Customer['status']): void {
  const customer = db.customers.find((item) => item.id === id)
  assert(customer, 'Mijoz topilmadi')
  if (status === 'archived') {
    const hasDebt = db.debts.some((debt) => debt.customerId === id && debt.state === 'active' && debt.amount - debt.paid > 0)
    assert(!hasDebt, 'Qarzi bor mijozni arxivlab bo‘lmaydi')
  }
  customer.status = status
}

export function addCustomerNote(db: Database, now: Date, id: string, text: string): void {
  const customer = db.customers.find((item) => item.id === id)
  assert(customer, 'Mijoz topilmadi')
  assert(text.trim().length > 0, 'Izoh matnini kiriting')
  customer.notes.unshift({ id: nextId(db, 'note'), date: now.toISOString(), text: text.trim() })
}

/* ----------------------------- Xarajatlar ----------------------------- */

function validateExpense(db: Database, input: ExpenseInput): void {
  assert(input.amount > 0, 'Xarajat summasi noldan katta bo‘lishi kerak')
  assert(db.employees.some((employee) => employee.id === input.employeeId), 'Mas’ul xodimni tanlang')
  assert(/^\d{4}-\d{2}-\d{2}$/.test(input.date), 'Sana noto‘g‘ri')
}

export function createExpense(db: Database, input: ExpenseInput): Expense {
  validateExpense(db, input)
  const expense: Expense = { ...input, amount: Math.round(input.amount), id: nextId(db, 'exp') }
  db.expenses.push(expense)
  return expense
}

export function updateExpense(db: Database, id: string, input: ExpenseInput): Expense {
  const expense = db.expenses.find((item) => item.id === id)
  assert(expense, 'Xarajat topilmadi')
  validateExpense(db, input)
  Object.assign(expense, input, { amount: Math.round(input.amount) })
  return expense
}

export function deleteExpense(db: Database, id: string): void {
  db.expenses = db.expenses.filter((expense) => expense.id !== id)
}

/* ----------------------------- Xodimlar ----------------------------- */

function validateEmployee(input: EmployeeInput): void {
  assert(input.name.trim().length >= 2, 'Xodim ismi kamida 2 ta belgidan iborat bo‘lishi kerak')
  assert(normalizePhone(input.phone).length >= 9, 'Telefon raqami noto‘g‘ri')
  assert(input.salary >= 0, 'Oylik manfiy bo‘lmasligi kerak')
  assert(input.position.trim().length >= 2, 'Lavozimni kiriting')
}

export function createEmployee(db: Database, input: EmployeeInput): Employee {
  validateEmployee(input)
  const employee: Employee = { ...input, name: input.name.trim(), id: nextId(db, 'emp') }
  db.employees.push(employee)
  return employee
}

export function updateEmployee(db: Database, id: string, input: EmployeeInput): Employee {
  const employee = db.employees.find((item) => item.id === id)
  assert(employee, 'Xodim topilmadi')
  validateEmployee(input)
  Object.assign(employee, input, { name: input.name.trim() })
  return employee
}

/* ----------------------------- Oylik ----------------------------- */

/** Berilgan davr uchun faol xodimlarga qoralama hisob-kitob yaratadi; mavjudlariga tegmaydi. */
export function generatePayroll(db: Database, period: string): number {
  assert(/^\d{4}-\d{2}$/.test(period), 'Davr noto‘g‘ri')
  let created = 0
  for (const employee of db.employees) {
    if (employee.status !== 'active') continue
    if (db.payroll.some((record) => record.employeeId === employee.id && record.period === period)) continue
    db.payroll.push({
      id: nextId(db, 'pr'),
      employeeId: employee.id,
      period,
      baseSalary: employee.salary,
      bonus: 0,
      deduction: 0,
      advance: 0,
      paid: 0,
      status: 'draft',
      approvedAt: null,
      paidAt: null,
      note: '',
    })
    created += 1
  }
  return created
}

export function updatePayroll(db: Database, id: string, input: PayrollUpdateInput): PayrollRecord {
  const record = db.payroll.find((item) => item.id === id)
  assert(record, 'Hisob-kitob topilmadi')
  assert(record.status === 'draft', 'Tasdiqlangan hisob-kitobni o‘zgartirib bo‘lmaydi')
  assert(input.baseSalary >= 0 && input.bonus >= 0 && input.deduction >= 0 && input.advance >= 0, 'Summalar manfiy bo‘lmasligi kerak')
  const next = { ...record, ...input }
  assert(input.advance <= payrollAccrued(next), 'Avans hisoblangan oylikdan oshib ketdi')
  Object.assign(record, input)
  return record
}

export function approvePayroll(db: Database, now: Date, id: string): void {
  const record = db.payroll.find((item) => item.id === id)
  assert(record, 'Hisob-kitob topilmadi')
  assert(record.status === 'draft', 'Hisob-kitob allaqachon tasdiqlangan')
  record.status = payrollPayable(record) === 0 ? 'paid' : 'approved'
  record.approvedAt = now.toISOString()
  if (record.status === 'paid') record.paidAt = now.toISOString()
}

export function payPayroll(db: Database, now: Date, id: string, amount: number): void {
  const record = db.payroll.find((item) => item.id === id)
  assert(record, 'Hisob-kitob topilmadi')
  assert(record.status === 'approved', 'Avval hisob-kitobni tasdiqlang')
  assert(Number.isFinite(amount) && amount > 0, 'To‘lov summasi noldan katta bo‘lishi kerak')
  assert(amount <= payrollRemaining(record), 'To‘lov summasi qolgan summadan oshib ketdi')
  record.paid += Math.round(amount)
  if (payrollRemaining(record) === 0) {
    record.status = 'paid'
    record.paidAt = now.toISOString()
  }
}

/* ----------------------------- Sozlamalar ----------------------------- */

export function updateSettings(db: Database, patch: SettingsPatch): void {
  if (patch.storeName !== undefined) assert(patch.storeName.trim().length >= 2, 'Do‘kon nomini kiriting')
  if (patch.units) {
    assert(patch.units.length > 0, 'Kamida bitta o‘lchov birligi bo‘lishi kerak')
    const ids = new Set(patch.units.map((unit) => unit.id))
    for (const product of db.products) assert(ids.has(product.unit), `"${product.unit}" birligi mahsulotlarda ishlatilmoqda, o‘chirib bo‘lmaydi`)
  }
  db.settings = { ...db.settings, ...patch }
}
