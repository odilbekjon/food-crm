import { z } from 'zod'

const money = (label: string) =>
  z.number({ error: `${label}ni kiriting` }).min(0, `${label} manfiy bo‘lmasligi kerak`)

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Nomi kamida 2 ta belgidan iborat bo‘lishi kerak'),
  sku: z.string().trim().min(2, 'SKU kiriting'),
  barcode: z
    .string()
    .trim()
    .regex(/^\d{8,14}$/, 'Shtrix-kod 8–14 ta raqamdan iborat bo‘lishi kerak')
    .or(z.literal('')),
  categoryId: z.string().min(1, 'Kategoriyani tanlang'),
  unit: z.string().min(1, 'O‘lchov birligini tanlang'),
  costPrice: money('Xarid narxi'),
  salePrice: money('Sotuv narxi'),
  minStock: z.number({ error: 'Minimal zaxirani kiriting' }).min(0, 'Minimal zaxira manfiy bo‘lmasligi kerak'),
  shelfLifeDays: z.number().int('Butun son kiriting').min(1, 'Kamida 1 kun').optional(),
})

export type ProductFormValues = z.infer<typeof productSchema>
