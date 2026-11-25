import {
  BarChart3,
  HandCoins,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
  Warehouse,
  Factory,
  type LucideIcon,
} from 'lucide-react'
import type { MessageKey } from '@/i18n/core'
import type { ModuleId } from '@/lib/permissions'

export interface NavItem {
  module: ModuleId
  path: string
  labelKey: MessageKey
  titleKey: MessageKey
  icon: LucideIcon
}

export interface NavGroup {
  labelKey: MessageKey
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.group.main',
    items: [
      { module: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', titleKey: 'nav.dashboard.title', icon: LayoutDashboard },
      { module: 'sales', path: '/sales', labelKey: 'nav.sales', titleKey: 'nav.sales.title', icon: ShoppingCart },
    ],
  },
  {
    labelKey: 'nav.group.stock',
    items: [
      { module: 'products', path: '/products', labelKey: 'nav.products', titleKey: 'nav.products.title', icon: Package },
      { module: 'inventory', path: '/inventory', labelKey: 'nav.inventory', titleKey: 'nav.inventory.title', icon: Warehouse },
      { module: 'purchases', path: '/purchases', labelKey: 'nav.purchases', titleKey: 'nav.purchases.title', icon: Truck },
      { module: 'suppliers', path: '/suppliers', labelKey: 'nav.suppliers', titleKey: 'nav.suppliers.title', icon: Factory },
    ],
  },
  {
    labelKey: 'nav.group.customers',
    items: [
      { module: 'customers', path: '/customers', labelKey: 'nav.customers', titleKey: 'nav.customers.title', icon: Users },
      { module: 'debts', path: '/debts', labelKey: 'nav.debts', titleKey: 'nav.debts.title', icon: HandCoins },
    ],
  },
  {
    labelKey: 'nav.group.finance',
    items: [
      { module: 'expenses', path: '/expenses', labelKey: 'nav.expenses', titleKey: 'nav.expenses.title', icon: Receipt },
      { module: 'employees', path: '/employees', labelKey: 'nav.employees', titleKey: 'nav.employees.title', icon: UserCog },
      { module: 'payroll', path: '/payroll', labelKey: 'nav.payroll', titleKey: 'nav.payroll.title', icon: Wallet },
    ],
  },
  {
    labelKey: 'nav.group.analytics',
    items: [
      { module: 'reports', path: '/reports', labelKey: 'nav.reports', titleKey: 'nav.reports.title', icon: BarChart3 },
      { module: 'settings', path: '/settings', labelKey: 'nav.settings', titleKey: 'nav.settings.title', icon: Settings },
    ],
  },
]

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
}
