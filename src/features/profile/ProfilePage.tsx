import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { profileUpdated, signedOut } from '@/app/slices/session'
import { Field } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LANGUAGES } from '@/i18n/core'
import { useI18n, useT } from '@/i18n/I18nProvider'
import { useTheme, type Theme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { AuthError, authApi, type UserProfile } from '@/services/auth'
import { isRemote } from '@/services/config'
import { formatDate } from '@/utils/date'
import { initials } from '@/utils/format'
import { newPasswordSchema, phoneSchema } from '@/features/auth/schemas'

/* ----------------------------- Ma'lumotlar ----------------------------- */

function InfoTab({ user }: { user: UserProfile }) {
  const t = useT()
  const dispatch = useAppDispatch()
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('auth.err.name')),
        phone: phoneSchema(t),
        storeName: z.string().trim().min(2, t('auth.err.store')),
      }),
    [t],
  )
  type Values = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: user.name, phone: user.phone, storeName: user.storeName } })

  useEffect(() => {
    reset({ name: user.name, phone: user.phone, storeName: user.storeName })
  }, [user, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      dispatch(profileUpdated(await authApi.updateProfile(values)))
      toast.success(t('profile.info.saved'))
    } catch {
      toast.error(t('common.unknownError'))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-4 rounded-xl border bg-card p-4">
      <h3 className="text-sm font-medium">{t('profile.info.title')}</h3>
      <Field label={t('auth.field.name')} required error={errors.name?.message}>
        {(props) => <Input {...props} {...register('name')} autoComplete="name" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('auth.field.phone')} required error={errors.phone?.message}>
          {(props) => <Input {...props} {...register('phone')} type="tel" autoComplete="tel" />}
        </Field>
        <Field label={t('auth.field.store')} required error={errors.storeName?.message}>
          {(props) => <Input {...props} {...register('storeName')} disabled={isRemote && user.role !== 'owner'} />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('auth.field.email')}>{(props) => <Input {...props} value={user.email} disabled readOnly />}</Field>
        <Field label={t('profile.role')}>{(props) => <Input {...props} value={t(`role.${user.role}`)} disabled readOnly />}</Field>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('profile.since')}: {formatDate(user.createdAt)}
      </p>
      <Button type="submit" disabled={!isDirty || isSubmitting}>
        {t('common.save')}
      </Button>
    </form>
  )
}

/* ----------------------------- Xavfsizlik ----------------------------- */

function SecurityTab() {
  const t = useT()
  const schema = useMemo(
    () =>
      z
        .object({
          current: z.string().min(1, t('profile.err.currentRequired')),
          next: newPasswordSchema(t),
          confirm: z.string(),
        })
        .refine((values) => values.next === values.confirm, { path: ['confirm'], message: t('auth.err.confirm') })
        .refine((values) => values.next !== values.current, { path: ['next'], message: t('profile.err.same') }),
    [t],
  )
  type Values = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { current: '', next: '', confirm: '' } })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authApi.changePassword(values.current, values.next)
      toast.success(t('profile.security.done'))
      reset()
    } catch (error) {
      if (error instanceof AuthError && error.code === 'wrong_password') {
        setError('current', { message: t('profile.security.wrong') })
      } else {
        toast.error(t('common.unknownError'))
      }
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-4 rounded-xl border bg-card p-4">
      <h3 className="text-sm font-medium">{t('profile.security.title')}</h3>
      <Field label={t('profile.security.current')} required error={errors.current?.message}>
        {(props) => <PasswordInput {...props} {...register('current')} autoComplete="current-password" />}
      </Field>
      <Field label={t('profile.security.new')} required error={errors.next?.message} hint={t('auth.field.passwordHint')}>
        {(props) => <PasswordInput {...props} {...register('next')} autoComplete="new-password" />}
      </Field>
      <Field label={t('profile.security.confirm')} required error={errors.confirm?.message}>
        {(props) => <PasswordInput {...props} {...register('confirm')} autoComplete="new-password" />}
      </Field>
      <Button type="submit" disabled={isSubmitting}>
        {t('profile.security.submit')}
      </Button>
    </form>
  )
}

/* ----------------------------- Sozlamalar ----------------------------- */

function PreferencesTab() {
  const { lang, setLang, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const themes: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
    { id: 'light', label: t('theme.light'), icon: Sun },
    { id: 'dark', label: t('theme.dark'), icon: Moon },
    { id: 'system', label: t('theme.system'), icon: Monitor },
  ]

  const logout = async () => {
    await authApi.logout()
    dispatch(signedOut())
    toast.success(t('auth.logout.done'))
    navigate('/login', { replace: true })
  }

  return (
    <div className="max-w-xl space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-medium">{t('profile.prefs.language')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('profile.prefs.languageDesc')}</p>
        <div role="radiogroup" aria-label={t('profile.prefs.language')} className="mt-3 grid grid-cols-3 gap-2">
          {LANGUAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={lang === item.id}
              onClick={() => setLang(item.id)}
              className={cn('rounded-lg border px-3 py-2.5 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', lang === item.id && 'border-primary bg-primary/5 text-primary')}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">{t('profile.prefs.theme')}</h3>
        <div role="radiogroup" aria-label={t('profile.prefs.theme')} className="grid grid-cols-3 gap-2">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={theme === item.id}
              onClick={() => setTheme(item.id)}
              className={cn('flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', theme === item.id && 'border-primary bg-primary/5 text-primary')}
            >
              <item.icon className="size-5" aria-hidden /> {item.label}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-medium">{t('profile.session.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('profile.session.desc')}</p>
        <Button variant="destructive" className="mt-3" onClick={() => void logout()}>
          <LogOut /> {t('common.logout')}
        </Button>
      </section>
    </div>
  )
}

export default function ProfilePage() {
  const t = useT()
  const user = useAppSelector((state) => state.session.user)
  const [tab, setTab] = useState('info')
  if (!user) return null

  return (
    <div className="space-y-4">
      <PageHeader title={t('profile.title')} description={t('profile.subtitle')} />
      <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary" aria-hidden>
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t(`role.${user.role}`)} · {user.storeName}
          </p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList>
          <TabsTrigger value="info" className="px-3">{t('profile.tab.info')}</TabsTrigger>
          <TabsTrigger value="security" className="px-3">{t('profile.tab.security')}</TabsTrigger>
          <TabsTrigger value="preferences" className="px-3">{t('profile.tab.preferences')}</TabsTrigger>
        </TabsList>
        <TabsContent value="info"><InfoTab user={user} /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        <TabsContent value="preferences"><PreferencesTab /></TabsContent>
      </Tabs>
    </div>
  )
}
