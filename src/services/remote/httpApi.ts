import type { CrmApi } from '@/services/api/types'
import type { Customer, Database, Employee, Expense, PayrollRecord, Product, Sale, Supplier } from '@/types'
import { request } from '../http'

/**
 * `CrmApi` ning HTTP implementatsiyasi: har bir amal serverdagi bitta endpointga to'g'ri keladi.
 * Biznes qoidalari serverda tekshiriladi; xatolar `ApiError` sifatida (tushunarli xabar bilan) keladi.
 */
export const httpApi: CrmApi = {
  loadAll: () => request<Database>('GET', '/snapshot'),
  resetDemo: () => Promise.reject(new Error('Demo ma’lumotlarni tiklash faqat demo rejimda mavjud')),

  createProduct: async (input) => (await request<{ product: Product }>('POST', '/products', input)).product,
  updateProduct: async (id, input) => (await request<{ product: Product }>('PUT', `/products/${id}`, input)).product,
  setProductStatus: async (id, status) => void (await request('PATCH', `/products/${id}/status`, { status })),
  createCategory: async (name) => void (await request('POST', '/categories', { name })),
  renameCategory: async (id, name) => void (await request('PATCH', `/categories/${id}`, { name })),
  deleteCategory: async (id) => void (await request('DELETE', `/categories/${id}`)),

  createTransfer: async (input) => request<{ id: string }>('POST', '/transfers', input),
  sendTransfer: async (id) => void (await request('POST', `/transfers/${id}/send`)),
  receiveTransfer: async (id) => void (await request('POST', `/transfers/${id}/receive`)),
  cancelTransfer: async (id) => void (await request('POST', `/transfers/${id}/cancel`)),
  createStockReceipt: async (input) => void (await request('POST', '/stock/receipts', input)),
  createStockReturn: async (input) => void (await request('POST', '/stock/returns', input)),
  createAudit: async (input) => void (await request('POST', '/stock/audits', input)),

  createSupplier: async (input) => (await request<{ supplier: Supplier }>('POST', '/suppliers', input)).supplier,
  updateSupplier: async (id, input) => (await request<{ supplier: Supplier }>('PUT', `/suppliers/${id}`, input)).supplier,
  setSupplierStatus: async (id, status) => void (await request('PATCH', `/suppliers/${id}/status`, { status })),
  createPurchase: async (input) => request<{ id: string }>('POST', '/purchases', input),
  confirmPurchase: async (id) => void (await request('POST', `/purchases/${id}/confirm`)),
  cancelPurchase: async (id) => void (await request('POST', `/purchases/${id}/cancel`)),
  paySupplier: async (purchaseId, amount, note) => void (await request('POST', `/purchases/${purchaseId}/payments`, { amount, note })),

  createCustomer: async (input) => (await request<{ customer: Customer }>('POST', '/customers', input)).customer,
  updateCustomer: async (id, input) => (await request<{ customer: Customer }>('PUT', `/customers/${id}`, input)).customer,
  setCustomerStatus: async (id, status) => void (await request('PATCH', `/customers/${id}/status`, { status })),
  addCustomerNote: async (id, text) => void (await request('POST', `/customers/${id}/notes`, { text })),

  // Kassir serverda aniqlanadi (kirgan xodim) — mijoz yuborgan `cashierId` e'tiborga olinmaydi.
  createSale: async ({ cashierId: _cashierId, ...input }) => (await request<{ sale: Sale }>('POST', '/sales', input)).sale,
  cancelSale: async ({ saleId, ...input }) => void (await request('POST', `/sales/${saleId}/cancel`, input)),
  payDebt: async ({ debtId, ...input }) => void (await request('POST', `/debts/${debtId}/payments`, input)),
  payCustomerDebts: async ({ customerId, ...input }) => void (await request('POST', `/customers/${customerId}/payments`, input)),

  createExpense: async (input) => (await request<{ expense: Expense }>('POST', '/expenses', input)).expense,
  updateExpense: async (id, input) => (await request<{ expense: Expense }>('PUT', `/expenses/${id}`, input)).expense,
  deleteExpense: async (id) => void (await request('DELETE', `/expenses/${id}`)),

  createEmployee: async (input) => (await request<{ employee: Employee }>('POST', '/employees', input)).employee,
  updateEmployee: async (id, input) => (await request<{ employee: Employee }>('PUT', `/employees/${id}`, input)).employee,
  createEmployeeLogin: async (id, input) => void (await request('POST', `/employees/${id}/login`, input)),
  resetEmployeePassword: async (id, password) => void (await request('PUT', `/employees/${id}/login`, { password })),
  revokeEmployeeLogin: async (id) => void (await request('DELETE', `/employees/${id}/login`)),

  generatePayroll: async (period) => (await request<{ created: number }>('POST', '/payroll/generate', { period })).created,
  updatePayroll: async (id, input) => (await request<{ record: PayrollRecord }>('PATCH', `/payroll/${id}`, input)).record,
  approvePayroll: async (id) => void (await request('POST', `/payroll/${id}/approve`)),
  payPayroll: async (id, amount) => void (await request('POST', `/payroll/${id}/payments`, { amount })),

  updateSettings: async (patch) => void (await request('PATCH', '/settings', patch)),
}
