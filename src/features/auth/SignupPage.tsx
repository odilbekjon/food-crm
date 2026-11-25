import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppDispatch } from '@/app/hooks'
import { signedIn } from '@/app/slices/session'
import { Field } from '@/components/common/form'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n/I18nProvider'
import { AuthError, authApi } from '@/services/auth'
import { ApiError } from '@/services/http'
import { AuthLayout } from './AuthLayout'
import { signupSchema, type SignupValues } from './schemas'

export default function SignupPage() {
  const t = useT()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const schema = useMemo(() => signupSchema(t), [t])
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', storeName: '', phone: '+998 ', email: '', password: '', confirm: '', terms: false },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('')
    try {
      const user = await authApi.signup(values)
      dispatch(signedIn(user))
      toast.success(t('auth.signup.success'))
      navigate('/', { replace: true })
    } catch (error) {
      setSubmitError(
        error instanceof AuthError && error.code === 'email_taken' ? t('auth.signup.exists') : error instanceof ApiError ? error.message : t('common.unknownError'),
      )
    }
  })

  return (
    <AuthLayout
      title={t('auth.signup.title')}
      subtitle={t('auth.signup.subtitle')}
      footer={
        <>
          {t('auth.signup.haveAccount')}{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t('auth.signup.toLogin')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label={t('auth.field.name')} required error={errors.name?.message}>
          {(props) => <Input {...props} {...register('name')} autoComplete="name" />}
        </Field>
        <Field label={t('auth.field.store')} required error={errors.storeName?.message}>
          {(props) => <Input {...props} {...register('storeName')} autoComplete="organization" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('auth.field.phone')} required error={errors.phone?.message}>
            {(props) => <Input {...props} {...register('phone')} type="tel" autoComplete="tel" />}
          </Field>
          <Field label={t('auth.field.email')} required error={errors.email?.message}>
            {(props) => <Input {...props} {...register('email')} type="email" autoComplete="email" />}
          </Field>
        </div>
        <Field label={t('auth.field.password')} required error={errors.password?.message} hint={t('auth.field.passwordHint')}>
          {(props) => <PasswordInput {...props} {...register('password')} autoComplete="new-password" />}
        </Field>
        <Field label={t('auth.field.confirm')} required error={errors.confirm?.message}>
          {(props) => <PasswordInput {...props} {...register('confirm')} autoComplete="new-password" />}
        </Field>
        <div className="space-y-1">
          <Controller
            control={control}
            name="terms"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} aria-invalid={Boolean(errors.terms)} />
                {t('auth.signup.terms')}
              </label>
            )}
          />
          {errors.terms && (
            <p role="alert" className="text-xs text-destructive">
              {errors.terms.message}
            </p>
          )}
        </div>
        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {t('auth.signup.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
