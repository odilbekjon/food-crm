import { zodResolver } from '@hookform/resolvers/zod'
import { Wand2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useRun } from '@/app/hooks'
import { FormSheet } from '@/components/common/FormSheet'
import { Field } from '@/components/common/form'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emailSchema, newPasswordSchema } from '@/features/auth/schemas'
import { useT } from '@/i18n/I18nProvider'
import type { Employee } from '@/types'
import { ROLE_LABELS } from '@/utils/labels'

/** Xodimga berish uchun oson o'qiladigan tasodifiy parol (harf va raqam; bir-biriga o'xshash belgilarsiz). */
function generatePassword(length = 10): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const all = letters + digits
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  const chars = Array.from(bytes, (value) => all[value % all.length]!)
  // Kamida bitta harf va bitta raqam bo'lishi kafolatlanadi
  chars[0] = letters[bytes[0]! % letters.length]!
  chars[length - 1] = digits[bytes[length - 1]! % digits.length]!
  return chars.join('')
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
  /** `create` — yangi login; `reset` — mavjud loginning parolini yangilash */
  mode: 'create' | 'reset'
}

/** Xodimga tizimga kirish huquqi berish (email + parol) yoki parolini yangilash. Faqat server rejimida. */
export function EmployeeLoginSheet({ open, onOpenChange, employee, mode }: Props) {
  const t = useT()
  const run = useRun()
  const [submitting, setSubmitting] = useState(false)

  const schema = useMemo(
    () => z.object({ email: mode === 'create' ? emailSchema(t) : z.string(), password: newPasswordSchema(t) }),
    [t, mode],
  )
  type Values = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  useEffect(() => {
    if (open) reset({ email: employee?.account?.email ?? '', password: '' })
  }, [open, employee, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (!employee) return
    setSubmitting(true)
    const result = await run(
      (api) => (mode === 'create' ? api.createEmployeeLogin(employee.id, { email: values.email, password: values.password }) : api.resetEmployeePassword(employee.id, values.password)),
      mode === 'create' ? 'Login ochildi' : 'Parol yangilandi',
    )
    setSubmitting(false)
    if (result.ok) onOpenChange(false)
  })

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Tizimga kirish huquqi' : 'Parolni yangilash'}
      description={
        employee
          ? mode === 'create'
            ? `${employee.name} shu email va parol bilan kiradi. Imkoniyatlari roliga bog‘liq: ${ROLE_LABELS[employee.role]}.`
            : `${employee.name} ning barcha qurilmalardagi sessiyalari yopiladi; yangi parol bilan qayta kiradi.`
          : undefined
      }
      submitting={submitting}
      submitLabel={mode === 'create' ? 'Login ochish' : 'Yangilash'}
      onSubmit={onSubmit}
    >
      <Field label={t('auth.field.email')} required={mode === 'create'} error={errors.email?.message}>
        {(props) => <Input {...props} {...register('email')} type="email" autoComplete="off" disabled={mode === 'reset'} placeholder="xodim@example.com" />}
      </Field>
      <Field label={mode === 'create' ? t('auth.field.password') : t('profile.security.new')} required error={errors.password?.message} hint={t('auth.field.passwordHint')}>
        {(props) => <PasswordInput {...props} {...register('password')} autoComplete="new-password" />}
      </Field>
      <Button type="button" variant="outline" size="sm" onClick={() => setValue('password', generatePassword(), { shouldValidate: true })}>
        <Wand2 /> Parol yaratish
      </Button>
      <p className="text-xs text-muted-foreground">Parolni xodimga o‘zingiz yetkazing. U keyinroq Profil bo‘limida parolini o‘zgartira oladi.</p>
    </FormSheet>
  )
}
