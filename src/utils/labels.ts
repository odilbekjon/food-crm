import type {
  EntityStatus,
  ExpenseCategory,
  MovementType,
  PaymentMethodId,
  PayrollStatus,
  PurchaseStatus,
  RoleId,
  SalaryType,
  SaleStatus,
  StockDocKind,
  TransferStatus,
} from '@/types'
import type { DebtDisplayStatus, CustomerSegment, SalePaymentState, SalePaymentType } from '@/utils/finance'
import type { StockState } from '@/utils/stock'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface LabelDef {
  label: string
  tone: Tone
}

export const ENTITY_STATUS: Record<EntityStatus, LabelDef> = {
  active: { label: 'Faol', tone: 'success' },
  archived: { label: 'Arxivlangan', tone: 'neutral' },
}

export const EMPLOYEE_STATUS: Record<'active' | 'inactive', LabelDef> = {
  active: { label: 'Faol', tone: 'success' },
  inactive: { label: 'Nofaol', tone: 'neutral' },
}

export const STOCK_STATE: Record<StockState, LabelDef> = {
  ok: { label: 'Yetarli', tone: 'success' },
  low: { label: 'Kam qolgan', tone: 'warning' },
  out: { label: 'Tugagan', tone: 'danger' },
}

export const SALE_STATUS: Record<SaleStatus, LabelDef> = {
  completed: { label: 'Yakunlangan', tone: 'success' },
  cancelled: { label: 'Bekor qilingan', tone: 'neutral' },
  returned: { label: 'Qaytarilgan', tone: 'warning' },
}

export const SALE_PAYMENT_TYPE: Record<SalePaymentType, string> = {
  cash: 'Naqd',
  card: 'Karta',
  credit: 'Nasiya',
  mixed: 'Aralash',
}

export const SALE_PAYMENT_STATE: Record<SalePaymentState, LabelDef> = {
  paid: { label: "To'langan", tone: 'success' },
  partial: { label: "Qisman to'langan", tone: 'warning' },
  debt: { label: 'Qarzda', tone: 'danger' },
}

export const PAYMENT_METHOD: Record<PaymentMethodId, string> = {
  cash: 'Naqd',
  card: 'Karta',
  credit: 'Nasiya',
}

export const DEBT_STATUS: Record<DebtDisplayStatus, LabelDef> = {
  open: { label: 'Ochiq', tone: 'info' },
  partial: { label: "Qisman to'langan", tone: 'warning' },
  paid: { label: "To'langan", tone: 'success' },
  overdue: { label: "Muddati o'tgan", tone: 'danger' },
  cancelled: { label: 'Bekor qilingan', tone: 'neutral' },
}

export const CUSTOMER_SEGMENT: Record<CustomerSegment, LabelDef> = {
  new: { label: 'Yangi', tone: 'neutral' },
  regular: { label: 'Doimiy', tone: 'info' },
  vip: { label: 'VIP', tone: 'success' },
}

export const TRANSFER_STATUS: Record<TransferStatus, LabelDef> = {
  draft: { label: 'Qoralama', tone: 'neutral' },
  sent: { label: 'Yuborilgan', tone: 'info' },
  received: { label: 'Qabul qilingan', tone: 'success' },
  cancelled: { label: 'Bekor qilingan', tone: 'danger' },
}

export const STOCK_DOC_KIND: Record<StockDocKind, string> = {
  receipt: 'Kirim',
  return: 'Qaytarish',
  audit: 'Inventarizatsiya',
}

export const MOVEMENT_TYPE: Record<MovementType, string> = {
  purchase: 'Xarid kirimi',
  receipt: 'Skladga kirim',
  transfer_out: "O'tkazma (chiqim)",
  transfer_in: "O'tkazma (kirim)",
  transfer_cancel: "O'tkazma bekor qilindi",
  sale: 'Savdo',
  sale_return: 'Savdo qaytarildi',
  return_out: "Yetkazib beruvchiga qaytarish",
  audit: 'Inventarizatsiya tuzatishi',
}

export const PURCHASE_STATUS: Record<PurchaseStatus, LabelDef> = {
  draft: { label: 'Qoralama', tone: 'neutral' },
  confirmed: { label: 'Tasdiqlangan', tone: 'success' },
  cancelled: { label: 'Bekor qilingan', tone: 'danger' },
}

export const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  rent: 'Ijara',
  utilities: 'Kommunal xizmatlar',
  transport: 'Transport',
  repair: "Ta'mirlash",
  other: 'Boshqa',
}

export const SALARY_TYPE: Record<SalaryType, string> = {
  monthly: 'Oylik (belgilangan)',
  daily: 'Kunlik',
  percent: 'Savdodan foiz',
}

export const PAYROLL_STATUS: Record<PayrollStatus, LabelDef> = {
  draft: { label: 'Tasdiqlanmagan', tone: 'neutral' },
  approved: { label: 'Tasdiqlangan', tone: 'info' },
  paid: { label: "To'langan", tone: 'success' },
}

export const ROLE_LABELS: Record<RoleId, string> = {
  owner: 'Owner / Admin',
  manager: 'Menejer',
  cashier: 'Kassir',
  storekeeper: 'Omborchi',
  accountant: 'Buxgalter',
}
