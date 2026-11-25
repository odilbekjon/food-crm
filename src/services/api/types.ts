import type {
  Customer,
  Database,
  Employee,
  Expense,
  ExpenseCategory,
  ISODate,
  LocationId,
  Product,
  Sale,
  Settings,
  Supplier,
  PayrollRecord,
} from '@/types'

/**
 * API kontrakti. Hozir `services/mock` ichidagi implementatsiya ishlatiladi;
 * backend tayyor bo'lgach, shu interfeysni real HTTP klient bilan almashtirish kifoya.
 */

/* ----------------------------- Kirish (input) turlari ----------------------------- */

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'status'>

export interface TransferInput {
  from: LocationId
  to: LocationId
  items: Array<{ productId: string; quantity: number }>
  note: string
  /** true bo'lsa darhol "yuborilgan" holatiga o'tadi */
  send: boolean
}

export interface StockReceiptInput {
  locationId: LocationId
  items: Array<{ productId: string; quantity: number; expiryDate: ISODate | null }>
  note: string
}

export interface StockReturnInput {
  locationId: LocationId
  supplierId: string | null
  items: Array<{ productId: string; quantity: number }>
  note: string
}

export interface AuditInput {
  locationId: LocationId
  items: Array<{ productId: string; counted: number }>
  note: string
}

export type SupplierInput = Omit<Supplier, 'id' | 'status'>

export interface PurchaseInput {
  supplierId: string
  date: ISODate
  items: Array<{ productId: string; quantity: number; costPrice: number; expiryDate: ISODate | null }>
  /** Xarid paytida to'langan summa */
  paid: number
  note: string
  /** true bo'lsa darhol tasdiqlanadi va skladga kirim qilinadi */
  confirm: boolean
}

export type CustomerInput = Pick<Customer, 'name' | 'phone' | 'address' | 'note'>

export interface SaleInput {
  customerId: string | null
  cashierId: string
  items: Array<{ productId: string; quantity: number; unitPrice: number }>
  /** Butun savat bo'yicha chegirma (so'm) */
  discount: number
  paidCash: number
  paidCard: number
  /** Nasiya muddati (mijoz tanlangan va qarz qolgan bo'lsa) */
  dueDate: ISODate | null
  note: string
}

export interface CancelSaleInput {
  saleId: string
  kind: 'cancelled' | 'returned'
  reason: string
}

export interface DebtPaymentInput {
  debtId: string
  amount: number
  method: 'cash' | 'card'
  note: string
}

export interface CustomerPaymentInput {
  customerId: string
  amount: number
  method: 'cash' | 'card'
  note: string
}

export type ExpenseInput = Omit<Expense, 'id'>
export type EmployeeInput = Omit<Employee, 'id' | 'account'>

export interface PayrollUpdateInput {
  baseSalary: number
  bonus: number
  deduction: number
  advance: number
  note: string
}

export type SettingsPatch = Partial<Settings>

/* ----------------------------- Servis interfeysi ----------------------------- */

export interface CrmApi {
  loadAll(): Promise<Database>
  /** Demo ma'lumotlarni boshlang'ich holatga qaytaradi (faqat mock). */
  resetDemo(): Promise<void>

  // Mahsulotlar
  createProduct(input: ProductInput): Promise<Product>
  updateProduct(id: string, input: ProductInput): Promise<Product>
  setProductStatus(id: string, status: Product['status']): Promise<void>
  createCategory(name: string): Promise<void>
  renameCategory(id: string, name: string): Promise<void>
  deleteCategory(id: string): Promise<void>

  // Ombor
  createTransfer(input: TransferInput): Promise<{ id: string }>
  sendTransfer(id: string): Promise<void>
  receiveTransfer(id: string): Promise<void>
  cancelTransfer(id: string): Promise<void>
  createStockReceipt(input: StockReceiptInput): Promise<void>
  createStockReturn(input: StockReturnInput): Promise<void>
  createAudit(input: AuditInput): Promise<void>

  // Yetkazib beruvchilar va xaridlar
  createSupplier(input: SupplierInput): Promise<Supplier>
  updateSupplier(id: string, input: SupplierInput): Promise<Supplier>
  setSupplierStatus(id: string, status: Supplier['status']): Promise<void>
  createPurchase(input: PurchaseInput): Promise<{ id: string }>
  confirmPurchase(id: string): Promise<void>
  cancelPurchase(id: string): Promise<void>
  paySupplier(purchaseId: string, amount: number, note: string): Promise<void>

  // Mijozlar
  createCustomer(input: CustomerInput): Promise<Customer>
  updateCustomer(id: string, input: CustomerInput): Promise<Customer>
  setCustomerStatus(id: string, status: Customer['status']): Promise<void>
  addCustomerNote(id: string, text: string): Promise<void>

  // Savdo va qarzdorlik
  createSale(input: SaleInput): Promise<Sale>
  cancelSale(input: CancelSaleInput): Promise<void>
  payDebt(input: DebtPaymentInput): Promise<void>
  payCustomerDebts(input: CustomerPaymentInput): Promise<void>

  // Xarajatlar
  createExpense(input: ExpenseInput): Promise<Expense>
  updateExpense(id: string, input: ExpenseInput): Promise<Expense>
  deleteExpense(id: string): Promise<void>

  // Xodimlar va oylik
  createEmployee(input: EmployeeInput): Promise<Employee>
  updateEmployee(id: string, input: EmployeeInput): Promise<Employee>
  /** Xodimga tizimga kirish huquqi berish / parolini yangilash / huquqni olib tashlash (faqat server rejimida) */
  createEmployeeLogin(id: string, input: { email: string; password: string }): Promise<void>
  resetEmployeePassword(id: string, password: string): Promise<void>
  revokeEmployeeLogin(id: string): Promise<void>
  generatePayroll(period: string): Promise<number>
  updatePayroll(id: string, input: PayrollUpdateInput): Promise<PayrollRecord>
  approvePayroll(id: string): Promise<void>
  payPayroll(id: string, amount: number): Promise<void>

  // Sozlamalar
  updateSettings(patch: SettingsPatch): Promise<void>
}

export type { ExpenseCategory }
