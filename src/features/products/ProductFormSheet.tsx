import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useDb, useRun } from '@/app/hooks'
import { FormSheet } from '@/components/common/FormSheet'
import { Field, MoneyInput, SimpleSelect } from '@/components/common/form'
import { Input } from '@/components/ui/input'
import type { Product } from '@/types'
import { formatMoney } from '@/utils/format'
import { productSchema, type ProductFormValues } from './schema'

interface ProductFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

function nextSku(count: number): string {
  return `SKU-${String(count + 1).padStart(4, '0')}`
}

export function ProductFormSheet({ open, onOpenChange, product }: ProductFormSheetProps) {
  const db = useDb()
  const run = useRun()
  const [submitting, setSubmitting] = useState(false)

  const defaults = useMemo<Partial<ProductFormValues>>(
    () =>
      product
        ? {
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            categoryId: product.categoryId,
            unit: product.unit,
            costPrice: product.costPrice,
            salePrice: product.salePrice,
            minStock: product.minStock,
            shelfLifeDays: product.shelfLifeDays ?? undefined,
          }
        : { name: '', sku: nextSku(db.products.length), barcode: '', categoryId: '', unit: 'dona', minStock: 0 },
    [product, db.products.length],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: defaults })

  useEffect(() => {
    if (open) reset(defaults)
  }, [open, defaults, reset])

  const unitId = watch('unit')
  const unit = db.settings.units.find((item) => item.id === unitId)
  const cost = watch('costPrice')
  const price = watch('salePrice')
  const hasStock = product ? db.batches.some((batch) => batch.productId === product.id && batch.quantity > 0) : false

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    const input = { ...values, shelfLifeDays: values.shelfLifeDays ?? null }
    const result = await run(
      (api) => (product ? api.updateProduct(product.id, input) : api.createProduct(input)),
      product ? 'Mahsulot yangilandi' : 'Mahsulot qo‘shildi',
    )
    setSubmitting(false)
    if (result.ok) onOpenChange(false)
  })

  const margin = cost !== undefined && price !== undefined && price > 0 ? Math.round(((price - cost) / price) * 100) : null

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
      description="Mahsulot ma’lumotlari va narxlari"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <Field label="Nomi" required error={errors.name?.message}>
        {(props) => <Input {...props} {...register('name')} autoFocus placeholder="Masalan: Sut 1 litr" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SKU" required error={errors.sku?.message}>
          {(props) => <Input {...props} {...register('sku')} />}
        </Field>
        <Field label="Shtrix-kod" error={errors.barcode?.message} hint="Skaner orqali ham kiritish mumkin">
          {(props) => <Input {...props} {...register('barcode')} inputMode="numeric" placeholder="4780000000000" />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategoriya" required error={errors.categoryId?.message}>
          {(props) => (
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <SimpleSelect
                  {...props}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={db.categories.map((category) => ({ value: category.id, label: category.name }))}
                  placeholder="Kategoriyani tanlang"
                />
              )}
            />
          )}
        </Field>
        <Field
          label="O‘lchov birligi"
          required
          error={errors.unit?.message}
          hint={hasStock ? 'Qoldig‘i bor mahsulotda birlikni o‘zgartirib bo‘lmaydi' : 'Asosiy birlik; MVP\'da konversiya yo‘q'}
        >
          {(props) => (
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <SimpleSelect
                  {...props}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={hasStock}
                  options={db.settings.units.map((item) => ({ value: item.id, label: item.name }))}
                />
              )}
            />
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Xarid narxi (tannarx)" required error={errors.costPrice?.message}>
          {(props) => (
            <Controller
              control={control}
              name="costPrice"
              render={({ field }) => <MoneyInput {...props} value={field.value} onChange={field.onChange} suffix="so‘m" />}
            />
          )}
        </Field>
        <Field
          label="Sotuv narxi"
          required
          error={errors.salePrice?.message}
          hint={margin !== null ? `Marja: ${margin}% · foyda ${formatMoney((price ?? 0) - (cost ?? 0))}` : undefined}
        >
          {(props) => (
            <Controller
              control={control}
              name="salePrice"
              render={({ field }) => <MoneyInput {...props} value={field.value} onChange={field.onChange} suffix="so‘m" />}
            />
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimal zaxira" required error={errors.minStock?.message} hint="Shundan kamaysa ogohlantirish chiqadi">
          {(props) => (
            <Controller
              control={control}
              name="minStock"
              render={({ field }) => (
                <MoneyInput {...props} value={field.value} onChange={field.onChange} decimals={unit?.allowDecimal ? 3 : 0} suffix={unitId} />
              )}
            />
          )}
        </Field>
        <Field label="Yaroqlilik muddati (kun)" error={errors.shelfLifeDays?.message} hint="Kirimda muddatni taklif qilish uchun">
          {(props) => (
            <Controller
              control={control}
              name="shelfLifeDays"
              render={({ field }) => <MoneyInput {...props} value={field.value} onChange={field.onChange} placeholder="Ixtiyoriy" suffix="kun" />}
            />
          )}
        </Field>
      </div>
    </FormSheet>
  )
}
