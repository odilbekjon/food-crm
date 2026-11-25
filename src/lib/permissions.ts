import type { RoleId } from '@/types'

/**
 * Rollar va ruxsatlar tuzilmasi (faqat demo UI uchun).
 * Eslatma: UI'da tugma yoki sahifani yashirish xavfsizlik hisoblanmaydi —
 * haqiqiy autentifikatsiya va ruxsat tekshiruvi backend'da amalga oshiriladi.
 */
export type ModuleId =
  | 'dashboard'
  | 'sales'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'suppliers'
  | 'customers'
  | 'debts'
  | 'expenses'
  | 'employees'
  | 'payroll'
  | 'reports'
  | 'settings'

export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: 'Dashboard',
  sales: 'Savdo (POS)',
  products: 'Mahsulotlar',
  inventory: 'Ombor',
  purchases: 'Xaridlar',
  suppliers: 'Yetkazib beruvchilar',
  customers: 'Mijozlar',
  debts: 'Qarzdorlik',
  expenses: 'Xarajatlar',
  employees: 'Xodimlar',
  payroll: 'Oylik',
  reports: 'Hisobotlar',
  settings: 'Sozlamalar',
}

export const MODULE_IDS = Object.keys(MODULE_LABELS) as ModuleId[]

export type AccessLevel = 'full' | 'view' | 'none'

export const ROLE_ACCESS: Record<RoleId, Record<ModuleId, AccessLevel>> = {
  owner: {
    dashboard: 'full', sales: 'full', products: 'full', inventory: 'full', purchases: 'full', suppliers: 'full',
    customers: 'full', debts: 'full', expenses: 'full', employees: 'full', payroll: 'full', reports: 'full', settings: 'full',
  },
  manager: {
    dashboard: 'full', sales: 'full', products: 'full', inventory: 'full', purchases: 'full', suppliers: 'full',
    customers: 'full', debts: 'full', expenses: 'full', employees: 'view', payroll: 'view', reports: 'full', settings: 'view',
  },
  cashier: {
    dashboard: 'none', sales: 'full', products: 'view', inventory: 'none', purchases: 'none', suppliers: 'none',
    customers: 'full', debts: 'full', expenses: 'none', employees: 'none', payroll: 'none', reports: 'none', settings: 'none',
  },
  storekeeper: {
    dashboard: 'view', sales: 'none', products: 'full', inventory: 'full', purchases: 'full', suppliers: 'full',
    customers: 'none', debts: 'none', expenses: 'none', employees: 'none', payroll: 'none', reports: 'view', settings: 'none',
  },
  accountant: {
    dashboard: 'view', sales: 'view', products: 'view', inventory: 'view', purchases: 'view', suppliers: 'view',
    customers: 'view', debts: 'full', expenses: 'full', employees: 'view', payroll: 'full', reports: 'full', settings: 'none',
  },
}

export function accessOf(role: RoleId, module: ModuleId): AccessLevel {
  return ROLE_ACCESS[role][module]
}

export function canView(role: RoleId, module: ModuleId): boolean {
  return accessOf(role, module) !== 'none'
}

export function canEdit(role: RoleId, module: ModuleId): boolean {
  return accessOf(role, module) === 'full'
}

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  full: 'To‘liq',
  view: 'Faqat ko‘rish',
  none: 'Yo‘q',
}
