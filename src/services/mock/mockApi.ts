import type { CrmApi } from '@/services/api/types'
import { createCategory, createProduct, deleteCategory, renameCategory, setProductStatus, updateProduct } from './domain/catalog'
import { payCustomerDebts, payDebt } from './domain/debts'
import {
  cancelTransfer,
  createAudit,
  createStockReceipt,
  createStockReturn,
  createTransfer,
  receiveTransfer,
  sendTransfer,
} from './domain/inventory'
import {
  addCustomerNote,
  approvePayroll,
  createCustomer,
  createEmployee,
  createExpense,
  deleteExpense,
  generatePayroll,
  payPayroll,
  setCustomerStatus,
  updateCustomer,
  updateEmployee,
  updateExpense,
  updatePayroll,
  updateSettings,
} from './domain/people'
import {
  cancelPurchase,
  confirmPurchase,
  createPurchase,
  createSupplier,
  paySupplier,
  setSupplierStatus,
  updateSupplier,
} from './domain/purchases'
import { cancelSale, createSale } from './domain/sales'
import { readAll, resetDatabase, transaction } from './storage'

const SERVER_ONLY = 'Xodimga login ochish faqat server rejimida mavjud'

/** `CrmApi` ning localStorage asosidagi mock implementatsiyasi. */
export const mockApi: CrmApi = {
  loadAll: () => readAll(),
  resetDemo: () => resetDatabase(),

  createProduct: (input) => transaction((db, now) => createProduct(db, now, input)),
  updateProduct: (id, input) => transaction((db) => updateProduct(db, id, input)),
  setProductStatus: (id, status) => transaction((db) => setProductStatus(db, id, status)),
  createCategory: (name) => transaction((db) => createCategory(db, name)),
  renameCategory: (id, name) => transaction((db) => renameCategory(db, id, name)),
  deleteCategory: (id) => transaction((db) => deleteCategory(db, id)),

  createTransfer: (input) => transaction((db, now) => createTransfer(db, now, input)),
  sendTransfer: (id) => transaction((db, now) => sendTransfer(db, now, id)),
  receiveTransfer: (id) => transaction((db, now) => receiveTransfer(db, now, id)),
  cancelTransfer: (id) => transaction((db, now) => cancelTransfer(db, now, id)),
  createStockReceipt: (input) => transaction((db, now) => createStockReceipt(db, now, input)),
  createStockReturn: (input) => transaction((db, now) => createStockReturn(db, now, input)),
  createAudit: (input) => transaction((db, now) => createAudit(db, now, input)),

  createSupplier: (input) => transaction((db) => createSupplier(db, input)),
  updateSupplier: (id, input) => transaction((db) => updateSupplier(db, id, input)),
  setSupplierStatus: (id, status) => transaction((db) => setSupplierStatus(db, id, status)),
  createPurchase: (input) => transaction((db, now) => createPurchase(db, now, input)),
  confirmPurchase: (id) => transaction((db, now) => confirmPurchase(db, now, id)),
  cancelPurchase: (id) => transaction((db) => cancelPurchase(db, id)),
  paySupplier: (purchaseId, amount, note) => transaction((db, now) => paySupplier(db, now, purchaseId, amount, note)),

  createCustomer: (input) => transaction((db, now) => createCustomer(db, now, input)),
  updateCustomer: (id, input) => transaction((db) => updateCustomer(db, id, input)),
  setCustomerStatus: (id, status) => transaction((db) => setCustomerStatus(db, id, status)),
  addCustomerNote: (id, text) => transaction((db, now) => addCustomerNote(db, now, id, text)),

  createSale: (input) => transaction((db, now) => createSale(db, now, input)),
  cancelSale: (input) => transaction((db, now) => cancelSale(db, now, input)),
  payDebt: (input) => transaction((db, now) => payDebt(db, now, input)),
  payCustomerDebts: (input) => transaction((db, now) => payCustomerDebts(db, now, input)),

  createExpense: (input) => transaction((db) => createExpense(db, input)),
  updateExpense: (id, input) => transaction((db) => updateExpense(db, id, input)),
  deleteExpense: (id) => transaction((db) => deleteExpense(db, id)),

  createEmployee: (input) => transaction((db) => createEmployee(db, input)),
  updateEmployee: (id, input) => transaction((db) => updateEmployee(db, id, input)),
  createEmployeeLogin: () => Promise.reject(new Error(SERVER_ONLY)),
  resetEmployeePassword: () => Promise.reject(new Error(SERVER_ONLY)),
  revokeEmployeeLogin: () => Promise.reject(new Error(SERVER_ONLY)),
  generatePayroll: (period) => transaction((db) => generatePayroll(db, period)),
  updatePayroll: (id, input) => transaction((db) => updatePayroll(db, id, input)),
  approvePayroll: (id) => transaction((db, now) => approvePayroll(db, now, id)),
  payPayroll: (id, amount) => transaction((db, now) => payPayroll(db, now, id, amount)),

  updateSettings: (patch) => transaction((db) => updateSettings(db, patch)),
}
