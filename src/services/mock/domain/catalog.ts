import type { Database, Product } from '@/types'
import type { ProductInput } from '@/services/api/types'
import { assert, nextId } from './core'

function validateProduct(db: Database, input: ProductInput, selfId?: string): void {
  assert(input.name.trim().length >= 2, 'Mahsulot nomi kamida 2 ta belgidan iborat bo‘lishi kerak')
  assert(input.salePrice >= 0 && input.costPrice >= 0, 'Narx manfiy bo‘lmasligi kerak')
  assert(input.minStock >= 0, 'Minimal zaxira manfiy bo‘lmasligi kerak')
  assert(db.categories.some((category) => category.id === input.categoryId), 'Kategoriya topilmadi')
  assert(db.settings.units.some((unit) => unit.id === input.unit), 'O‘lchov birligi noto‘g‘ri')
  const sku = input.sku.trim().toLowerCase()
  assert(
    !db.products.some((product) => product.id !== selfId && product.sku.toLowerCase() === sku),
    `SKU "${input.sku}" allaqachon mavjud`,
  )
  if (input.barcode.trim()) {
    assert(
      !db.products.some((product) => product.id !== selfId && product.barcode === input.barcode.trim()),
      `Shtrix-kod "${input.barcode}" allaqachon mavjud`,
    )
  }
}

export function createProduct(db: Database, now: Date, input: ProductInput): Product {
  validateProduct(db, input)
  const product: Product = {
    ...input,
    name: input.name.trim(),
    sku: input.sku.trim(),
    barcode: input.barcode.trim(),
    id: nextId(db, 'prod'),
    status: 'active',
    createdAt: now.toISOString(),
  }
  db.products.push(product)
  return product
}

export function updateProduct(db: Database, id: string, input: ProductInput): Product {
  const product = db.products.find((item) => item.id === id)
  assert(product, 'Mahsulot topilmadi')
  validateProduct(db, input, id)
  const hasStock = db.batches.some((batch) => batch.productId === id && batch.quantity > 0)
  assert(
    !hasStock || input.unit === product.unit,
    'Qoldig‘i bor mahsulotning o‘lchov birligini o‘zgartirib bo‘lmaydi (MVP\'da konversiya yo‘q)',
  )
  Object.assign(product, input, { name: input.name.trim(), sku: input.sku.trim(), barcode: input.barcode.trim() })
  return product
}

export function setProductStatus(db: Database, id: string, status: Product['status']): void {
  const product = db.products.find((item) => item.id === id)
  assert(product, 'Mahsulot topilmadi')
  product.status = status
}

export function createCategory(db: Database, name: string): void {
  const trimmed = name.trim()
  assert(trimmed.length >= 2, 'Kategoriya nomi kamida 2 ta belgidan iborat bo‘lishi kerak')
  assert(!db.categories.some((category) => category.name.toLowerCase() === trimmed.toLowerCase()), 'Bunday kategoriya mavjud')
  db.categories.push({ id: nextId(db, 'cat'), name: trimmed })
}

export function renameCategory(db: Database, id: string, name: string): void {
  const category = db.categories.find((item) => item.id === id)
  assert(category, 'Kategoriya topilmadi')
  const trimmed = name.trim()
  assert(trimmed.length >= 2, 'Kategoriya nomi kamida 2 ta belgidan iborat bo‘lishi kerak')
  assert(
    !db.categories.some((item) => item.id !== id && item.name.toLowerCase() === trimmed.toLowerCase()),
    'Bunday kategoriya mavjud',
  )
  category.name = trimmed
}

export function deleteCategory(db: Database, id: string): void {
  assert(!db.products.some((product) => product.categoryId === id), 'Kategoriyada mahsulotlar bor, avval ularni boshqa kategoriyaga o‘tkazing')
  db.categories = db.categories.filter((category) => category.id !== id)
}
