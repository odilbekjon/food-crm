import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useRun } from '@/app/hooks'
import { FormSheet } from '@/components/common/FormSheet'
import { Field } from '@/components/common/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Customer } from '@/types'

export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, '').length >= 9 && value.replace(/\D/g, '').length <= 12, {
    message: 'Telefon raqamini to‘g‘ri kiriting, masalan +998 90 123 45 67',
  })

const schema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 ta belgidan iborat bo‘lishi kerak'),
  phone: phoneSchema,
  address: z.string().trim(),
  note: z.string().trim(),
})

type FormValues = z.infer<typeof schema>

interface CustomerFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSaved?: (customer: Customer) => void
}

export function CustomerFormSheet({ open, onOpenChange, customer, onSaved }: CustomerFormSheetProps) {
  const run = useRun()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '+998 ', address: '', note: '' } })

  useEffect(() => {
    if (open) {
      reset(
        customer
          ? { name: customer.name, phone: customer.phone, address: customer.address, note: customer.note }
          : { name: '', phone: '+998 ', address: '', note: '' },
      )
    }
  }, [open, customer, reset])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    const result = await run(
      (api) => (customer ? api.updateCustomer(customer.id, values) : api.createCustomer(values)),
      customer ? 'Mijoz yangilandi' : 'Mijoz qo‘shildi',
    )
    setSubmitting(false)
    if (result.ok) {
      onSaved?.(result.value)
      onOpenChange(false)
    }
  })

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={customer ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
      description="Mijoz ma’lumotlari va aloqa"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <Field label="Ism-familiya / nomi" required error={errors.name?.message}>
        {(props) => <Input {...props} {...register('name')} autoFocus placeholder="Masalan: Aziza Karimova" />}
      </Field>
      <Field label="Telefon" required error={errors.phone?.message}>
        {(props) => <Input {...props} {...register('phone')} type="tel" inputMode="tel" placeholder="+998 90 123 45 67" />}
      </Field>
      <Field label="Manzil" error={errors.address?.message}>
        {(props) => <Input {...props} {...register('address')} placeholder="Ixtiyoriy" />}
      </Field>
      <Field label="Izoh" error={errors.note?.message}>
        {(props) => <Textarea {...props} {...register('note')} rows={3} placeholder="Ixtiyoriy" />}
      </Field>
    </FormSheet>
  )
}
