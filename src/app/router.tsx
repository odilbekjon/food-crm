import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Link, Navigate } from 'react-router-dom'
import { EmptyState } from '@/components/common/states'
import { buttonVariants } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/AppLayout'
import { GuestOnly, RequireAuth } from '@/components/layout/AuthGuards'
import { useT } from '@/i18n/I18nProvider'
import { RequireAccess } from '@/components/layout/RequireAccess'
import type { ModuleId } from '@/lib/permissions'
import { useRole } from './hooks'
import { NAV_ITEMS } from './navigation'
import { canView } from '@/lib/permissions'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const SalesPage = lazy(() => import('@/features/sales/SalesPage'))
const NewSalePage = lazy(() => import('@/features/sales/NewSalePage'))
const ProductsPage = lazy(() => import('@/features/products/ProductsPage'))
const ProductDetailPage = lazy(() => import('@/features/products/ProductDetailPage'))
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage'))
const PurchasesPage = lazy(() => import('@/features/purchases/PurchasesPage'))
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage'))
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage'))
const CustomerProfilePage = lazy(() => import('@/features/customers/CustomerProfilePage'))
const DebtsPage = lazy(() => import('@/features/debts/DebtsPage'))
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'))
const EmployeesPage = lazy(() => import('@/features/employees/EmployeesPage'))
const PayrollPage = lazy(() => import('@/features/payroll/PayrollPage'))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const SignupPage = lazy(() => import('@/features/auth/SignupPage'))

function guard(module: ModuleId, element: ReactNode) {
  return <RequireAccess module={module}>{element}</RequireAccess>
}

/** Bosh sahifa: rolga ruxsat etilgan birinchi bo'limga yo'naltiradi. */
function HomeRedirect() {
  const role = useRole()
  const first = NAV_ITEMS.find((item) => canView(role, item.module))
  return <Navigate to={first?.path ?? '/dashboard'} replace />
}

function NotFound() {
  const t = useT()
  return (
    <EmptyState
      title={t('notFound.title')}
      description={t('notFound.desc')}
      action={
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          {t('access.home')}
        </Link>
      }
      className="py-24"
    />
  )
}

/** Login/signup sahifalari uchun yuklanish vaqtida bo'sh fon (Suspense kerak). */
function authPage(element: ReactNode) {
  return (
    <GuestOnly>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>{element}</Suspense>
    </GuestOnly>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: authPage(<LoginPage />) },
  { path: '/signup', element: authPage(<SignupPage />) },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'dashboard', element: guard('dashboard', <DashboardPage />) },
      { path: 'sales', element: guard('sales', <SalesPage />) },
      { path: 'sales/new', element: guard('sales', <NewSalePage />) },
      { path: 'products', element: guard('products', <ProductsPage />) },
      { path: 'products/:productId', element: guard('products', <ProductDetailPage />) },
      { path: 'inventory', element: guard('inventory', <InventoryPage />) },
      { path: 'purchases', element: guard('purchases', <PurchasesPage />) },
      { path: 'suppliers', element: guard('suppliers', <SuppliersPage />) },
      { path: 'customers', element: guard('customers', <CustomersPage />) },
      { path: 'customers/:customerId', element: guard('customers', <CustomerProfilePage />) },
      { path: 'debts', element: guard('debts', <DebtsPage />) },
      { path: 'expenses', element: guard('expenses', <ExpensesPage />) },
      { path: 'employees', element: guard('employees', <EmployeesPage />) },
      { path: 'payroll', element: guard('payroll', <PayrollPage />) },
      { path: 'reports', element: guard('reports', <ReportsPage />) },
      { path: 'settings', element: guard('settings', <SettingsPage />) },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
