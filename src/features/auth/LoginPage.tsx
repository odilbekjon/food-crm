import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppDispatch } from '@/app/hooks'
import { signedIn } from '@/app/slices/session'
import { Field } from '@/components/common/form'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n/I18nProvider'
import { AuthError, DEMO_ACCOUNT, authApi } from '@/services/auth'
import { isRemote } from '@/services/config'
import { ApiError } from '@/services/http'
import { AuthLayout } from './AuthLayout'
import { loginSchema, type LoginValues } from './schemas'

export default function LoginPage() {
  const t = useT()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState('')
  const schema = useMemo(() => loginSchema(t), [t])
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const signIn = async (values: LoginValues) => {
    setSubmitError('')
    try {
      const user = await authApi.login(values.email, values.password)
      dispatch(signedIn(user))
      toast.success(t('auth.login.success', { name: user.name }))
      navigate(from, { replace: true })
    } catch (error) {
      setSubmitError(error instanceof AuthError ? t('auth.login.failed') : error instanceof ApiError ? error.message : t('common.unknownError'))
    }
  }

  const fillDemo = () => {
    setValue('email', DEMO_ACCOUNT.email)
    setValue('password', DEMO_ACCOUNT.password)
    void handleSubmit(signIn)()
  }

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.noAccount')}{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            {t('auth.login.toSignup')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(signIn)} noValidate className="space-y-4">
        <Field label={t('auth.field.email')} error={errors.email?.message}>
          {(props) => <Input {...props} {...register('email')} type="email" autoComplete="email" placeholder="name@example.com" />}
        </Field>
        <Field label={t('auth.field.password')} error={errors.password?.message}>
          {(props) => <PasswordInput {...props} {...register('password')} autoComplete="current-password" />}
        </Field>
        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {t('auth.login.submit')}
        </Button>
        {!isRemote && (
          <>
            <Button type="button" variant="outline" size="lg" className="w-full" disabled={isSubmitting} onClick={fillDemo}>
              {t('auth.login.demo')}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t('auth.login.demoHint', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })}
            </p>
          </>
        )}
      </form>
    </AuthLayout>
  )
}
