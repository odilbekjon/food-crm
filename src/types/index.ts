/**
 * Grocery CRM domen turlari.
 * Bu turlar kelajakdagi backend API kontraktlari uchun asos bo'lib xizmat qiladi.
 */

/** ISO datetime, masalan 2026-10-23T09:15:00.000Z */
export type ISODateTime = string
/** Faqat sana, YYYY-MM-DD */
export type ISODate = string

export type LocationId = 'warehouse' | 'store'
export type RoleId = 'owner' | 'manager' | 'cashier' | 'storekeeper' | 'accountant'
export type EntityStatus = 'active' | 'archived'

/* ----------------------------- Sozlamalar ----------------------------- */

export interface UnitDef {
  id: string
  name: string
  /** Kasr miqdorda sotish mumkinmi (kg, litr) */
  allowDecimal: boolean
}

export type PaymentMethodId = 'cash' | 'card' | 'credit'

export interface PaymentMethodDef {
  id: PaymentMethodId
  name: string
  enabled: boolean
}

export interface Settings {
  storeName: string
  storePhone: string
  storeAddress: string
  currency: 'UZS'
  dateFormat: 'DD.MM.YYYY'
  /** Nasiya uchun standart muddat (kun) */
  defaultDebtDays: number
  units: UnitDef[]
  paymentMethods: PaymentMethodDef[]
}

/* ----------------------------- Mahsulotlar ----------------------------- */

export interface Category {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  categoryId: string
  /** Asosiy o'lchov birligi. MVP'da birliklar o'rtasida konversiya yo'q. */
  unit: string
  costPrice: number
  salePrice: number
  minStock: number
  /** Yaroqlilik muddati (kun) — kirim paytida muddat taklif qilish uchun */
  shelfLifeDays: number | null
  status: EntityStatus
  createdAt: ISODateTime
}

/** Qoldiq partiyasi: muayyan joydagi muayyan mahsulotning muayyan partiyasi. */
export interface StockBatch {
  id: string
  productId: string
  locationId: LocationId
  batchNo: string
  quantity: number
  expiryDate: ISODate | null
  receivedAt: ISODateTime
}

export type MovementType =
  | 'purchase'
  | 'receipt'
  | 'transfer_out'
  | 'transfer_in'
  | 'transfer_cancel'
  | 'sale'
  | 'sale_return'
  | 'return_out'
  | 'audit'

export interface StockMovement {
  id: string
  date: ISODateTime
  productId: string
  locationId: LocationId
  /** Ishorali miqdor: kirim (+), chiqim (−) */
  quantity: number
  type: MovementType
  refId: string
  refNumber: string
  note: string
}

/** Partiyadan qancha olinganligi (qaytarish va o'tkazma uchun). */
export interface Allocation {
  batchNo: string
  expiryDate: ISODate | null
  quantity: number
}

/* ----------------------------- Ombor hujjatlari ----------------------------- */

export type TransferStatus = 'draft' | 'sent' | 'received' | 'cancelled'

export interface TransferItem {
  productId: string
  quantity: number
  allocations: Allocation[]
}

export interface Transfer {
  id: string
  number: string
  from: LocationId
  to: LocationId
  status: TransferStatus
  items: TransferItem[]
  note: string
  createdAt: ISODateTime
  sentAt: ISODateTime | null
  receivedAt: ISODateTime | null
  cancelledAt: ISODateTime | null
  createdBy: string
}

export type StockDocKind = 'receipt' | 'return' | 'audit'

export interface StockDocItem {
  productId: string
  /** kirim/qaytarish miqdori yoki inventarizatsiyada sanalgan miqdor */
  quantity: number
  /** inventarizatsiyada tizimdagi miqdor */
  expectedQty: number | null
  expiryDate: ISODate | null
}

export interface StockDoc {
  id: string
  number: string
  kind: StockDocKind
  date: ISODateTime
  locationId: LocationId
  supplierId: string | null
  note: string
  items: StockDocItem[]
  createdBy: string
}

/* ----------------------------- Xaridlar ----------------------------- */

export interface Supplier {
  id: string
  name: string
  phone: string
  address: string
  note: string
  status: EntityStatus
}

export interface PurchaseItem {
  productId: string
  quantity: number
  costPrice: number
  expiryDate: ISODate | null
}

export interface SupplierPayment {
  id: string
  date: ISODateTime
  amount: number
  note: string
}

export type PurchaseStatus = 'draft' | 'confirmed' | 'cancelled'

export interface Purchase {
  id: string
  number: string
  supplierId: string
  date: ISODateTime
  items: PurchaseItem[]
  total: number
  payments: SupplierPayment[]
  status: PurchaseStatus
  note: string
}

/* ----------------------------- Mijozlar va savdo ----------------------------- */

export interface CustomerNote {
  id: string
  date: ISODateTime
  text: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  address: string
  note: string
  notes: CustomerNote[]
  status: EntityStatus
  createdAt: ISODateTime
}

export interface SaleItem {
  productId: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
  /** Sotuv paytidagi tannarx (yalpi foyda hisobi uchun) */
  costPrice: number
  total: number
  allocations: Allocation[]
}

export type SaleStatus = 'completed' | 'cancelled' | 'returned'

export interface Sale {
  id: string
  number: string
  date: ISODateTime
  customerId: string | null
  cashierId: string
  items: SaleItem[]
  subtotal: number
  discount: number
  /** Savdo summasi (chegirmadan keyin) */
  total: number
  paidCash: number
  paidCard: number
  /** Nasiyaga qoldirilgan summa */
  debtAmount: number
  status: SaleStatus
  note: string
  cancelledAt: ISODateTime | null
  cancelReason: string
}

export type PaymentKind = 'sale' | 'debt_payment'

/** Mijozdan amalda kelib tushgan to'lov. */
export interface Payment {
  id: string
  date: ISODateTime
  customerId: string | null
  saleId: string
  debtId: string | null
  kind: PaymentKind
  method: 'cash' | 'card'
  amount: number
  note: string
}

export interface Debt {
  id: string
  customerId: string
  saleId: string
  saleNumber: string
  date: ISODateTime
  dueDate: ISODate
  amount: number
  paid: number
  /** 'cancelled' — savdo bekor qilingan/qaytarilgan */
  state: 'active' | 'cancelled'
}

/* ----------------------------- Xarajatlar, xodimlar ----------------------------- */

export type ExpenseCategory = 'rent' | 'utilities' | 'transport' | 'repair' | 'other'

export interface Expense {
  id: string
  date: ISODate
  category: ExpenseCategory
  amount: number
  note: string
  employeeId: string
}

export type SalaryType = 'monthly' | 'daily' | 'percent'

export interface Employee {
  id: string
  name: string
  phone: string
  position: string
  role: RoleId
  hireDate: ISODate
  salaryType: SalaryType
  salary: number
  status: 'active' | 'inactive'
  /** Tizimga kirish huquqi (faqat server rejimida, xodimlarni ko'ra oladigan rollarga) */
  account?: { email: string } | null
}

export type PayrollStatus = 'draft' | 'approved' | 'paid'

export interface PayrollRecord {
  id: string
  employeeId: string
  /** YYYY-MM */
  period: string
  baseSalary: number
  bonus: number
  deduction: number
  advance: number
  /** Tasdiqlangandan keyin amalda to'langan summa */
  paid: number
  status: PayrollStatus
  approvedAt: ISODateTime | null
  paidAt: ISODateTime | null
  note: string
}

/* ----------------------------- Ma'lumotlar bazasi ----------------------------- */

export interface Database {
  /** `modified` — demo ma'lumotlarga foydalanuvchi o'zgartirish kiritgan */
  meta: { version: number; seededAt: ISODateTime; modified: boolean }
  counters: Record<string, number>
  settings: Settings
  categories: Category[]
  products: Product[]
  batches: StockBatch[]
  movements: StockMovement[]
  transfers: Transfer[]
  stockDocs: StockDoc[]
  suppliers: Supplier[]
  purchases: Purchase[]
  customers: Customer[]
  sales: Sale[]
  payments: Payment[]
  debts: Debt[]
  expenses: Expense[]
  employees: Employee[]
  payroll: PayrollRecord[]
}

/** UI uchun hisoblangan ogohlantirish */
export interface AlertItem {
  id: string
  kind: 'low_stock' | 'expiring' | 'expired' | 'overdue_debt'
  severity: 'warning' | 'danger'
  title: string
  description: string
  href: string
}
