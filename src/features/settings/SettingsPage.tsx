import { zodResolver } from '@hookform/resolvers/zod'
import { Monitor, Moon, Plus, RotateCcw, Sun, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAppDispatch, useDb, useRole, useRun } from '@/app/hooks'
import { setRole } from '@/app/slices/session'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Field } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoriesDialog } from '@/features/products/CategoriesDialog'
import { phoneSchema } from '@/features/customers/CustomerFormSheet'
import { useTheme, type Theme } from '@/hooks/use-theme'
import { LANGUAGES } from '@/i18n/core'
import { isRemote } from '@/services/config'
import { useI18n } from '@/i18n/I18nProvider'
import { ACCESS_LABELS, MODULE_IDS, MODULE_LABELS, ROLE_ACCESS, canEdit } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { RoleId } from '@/types'
import { ROLE_LABELS } from '@/utils/labels'

const ROLES = Object.keys(ROLE_LABELS) as RoleId[]

/* ----------------------------- Do'kon ma'lumotlari ----------------------------- */

const storeSchema = z.object({
  storeName: z.string().trim().min(2, 'Do‘kon nomini kiriting'),
  storePhone: phoneSchema,
  storeAddress: z.string().trim().min(3, 'Manzilni kiriting'),
  defaultDebtDays: z.number({ error: 'Kunlar sonini kiriting' }).int('Butun son kiriting').min(1, 'Kamida 1 kun').max(365, 'Ko‘pi bilan 365 kun'),
})
type StoreValues = z.infer<typeof storeSchema>

function StoreTab({ editable }: { editable: boolean }) {
  const db = useDb()
  const run = useRun()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<StoreValues>({ resolver: zodResolver(storeSchema) })

  useEffect(() => {
    reset({ storeName: db.settings.storeName, storePhone: db.settings.storePhone, storeAddress: db.settings.storeAddress, defaultDebtDays: db.settings.defaultDebtDays })
  }, [db.settings, reset])

  const onSubmit = handleSubmit(async (values) => {
    await run((api) => api.updateSettings(values), 'Sozlamalar saqlandi')
  })

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-4 rounded-xl border bg-card p-4">
      <Field label="Do‘kon nomi" required error={errors.storeName?.message}>{(props) => <Input {...props} {...register('storeName')} disabled={!editable} />}</Field>
      <Field label="Telefon" required error={errors.storePhone?.message}>{(props) => <Input {...props} {...register('storePhone')} disabled={!editable} />}</Field>
      <Field label="Manzil" required error={errors.storeAddress?.message}>{(props) => <Input {...props} {...register('storeAddress')} disabled={!editable} />}</Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Valyuta">{(props) => <Input {...props} value="UZS (so‘m)" disabled readOnly />}</Field>
        <Field label="Sana formati">{(props) => <Input {...props} value="DD.MM.YYYY" disabled readOnly />}</Field>
        <Field label="Nasiya muddati (kun)" required error={errors.defaultDebtDays?.message}>
          {(props) => <Input {...props} {...register('defaultDebtDays', { valueAsNumber: true })} type="number" min={1} max={365} disabled={!editable} />}
        </Field>
      </div>
      {editable && <Button type="submit" disabled={!isDirty}>Saqlash</Button>}
    </form>
  )
}

/* ----------------------------- O'lchov birliklari ----------------------------- */

const unitSchema = z.object({
  id: z.string().trim().toLowerCase().regex(/^[a-z0-9_'-]{1,12}$/, 'Faqat lotin harflari, raqam, 1–12 ta belgi'),
  name: z.string().trim().min(2, 'Nomini kiriting'),
})

function UnitsTab({ editable }: { editable: boolean }) {
  const db = useDb()
  const run = useRun()
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [decimal, setDecimal] = useState(false)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  const usage = (unitId: string) => db.products.filter((product) => product.unit === unitId).length

  const add = async () => {
    const parsed = unitSchema.safeParse({ id, name })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Noto‘g‘ri qiymat')
      return
    }
    if (db.settings.units.some((unit) => unit.id === parsed.data.id)) {
      setError('Bunday birlik mavjud')
      return
    }
    setError('')
    const result = await run((api) => api.updateSettings({ units: [...db.settings.units, { ...parsed.data, allowDecimal: decimal }] }), 'O‘lchov birligi qo‘shildi')
    if (result.ok) {
      setId('')
      setName('')
      setDecimal(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <ul className="divide-y rounded-xl border bg-card">
        {db.settings.units.map((unit) => (
          <li key={unit.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="w-16 font-mono text-xs">{unit.id}</span>
            <span className="flex-1">{unit.name}</span>
            <span className="text-xs text-muted-foreground">{unit.allowDecimal ? 'Kasr miqdor mumkin' : 'Faqat butun'}</span>
            <span className="w-24 text-right text-xs text-muted-foreground">{usage(unit.id)} ta mahsulot</span>
            {editable && (
              <Button variant="ghost" size="icon-sm" disabled={usage(unit.id) > 0} onClick={() => setRemoving(unit.id)} aria-label={`${unit.name}ni o‘chirish`}>
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void add()
          }}
          className="space-y-3 rounded-xl border bg-card p-4"
        >
          <h3 className="text-sm font-medium">Yangi birlik</h3>
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
            <Field label="Kod" error={error}>{(props) => <Input {...props} value={id} onChange={(event) => setId(event.target.value)} placeholder="qop" />}</Field>
            <Field label="Nomi">{(props) => <Input {...props} value={name} onChange={(event) => setName(event.target.value)} placeholder="Qop (25 kg)" />}</Field>
            <label className="flex h-8 items-center gap-2 text-sm">
              <Checkbox checked={decimal} onCheckedChange={(checked) => setDecimal(checked === true)} /> Kasr miqdor
            </label>
          </div>
          <Button type="submit"><Plus /> Qo‘shish</Button>
        </form>
      )}
      <p className="text-xs text-muted-foreground">MVP’da birliklar o‘rtasida konversiya yo‘q: har bir mahsulotning asosiy birligi aniq belgilanadi.</p>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title="Birlikni o‘chirish"
        description="Birlik ro‘yxatdan o‘chiriladi."
        confirmLabel="O‘chirish"
        destructive
        onConfirm={async () => {
          const result = await run((api) => api.updateSettings({ units: db.settings.units.filter((unit) => unit.id !== removing) }), 'Birlik o‘chirildi')
          return result.ok
        }}
      />
    </div>
  )
}

/* ----------------------------- To'lov turlari ----------------------------- */

function PaymentsTab({ editable }: { editable: boolean }) {
  const db = useDb()
  const run = useRun()
  return (
    <div className="max-w-xl space-y-3">
      <ul className="divide-y rounded-xl border bg-card">
        {db.settings.paymentMethods.map((method) => (
          <li key={method.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{method.name}</span>
              <span className="block text-xs text-muted-foreground">
                {method.id === 'cash' ? 'Kassada naqd pul' : method.id === 'card' ? 'Terminal / plastik karta' : 'Mijoz qarziga yoziladi'}
              </span>
            </span>
            <Switch
              checked={method.enabled}
              disabled={!editable || method.id === 'cash'}
              aria-label={`${method.name}ni yoqish yoki o‘chirish`}
              onCheckedChange={(checked) => void run((api) => api.updateSettings({ paymentMethods: db.settings.paymentMethods.map((item) => (item.id === method.id ? { ...item, enabled: checked } : item)) }), 'To‘lov turi yangilandi')}
            />
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Naqd to‘lovni o‘chirib bo‘lmaydi. Real to‘lov integratsiyasi (karta, Payme, Click) hozircha amalga oshirilmaydi.</p>
    </div>
  )
}

/* ----------------------------- Rollar ----------------------------- */

function RolesTab() {
  const current = useRole()
  const dispatch = useAppDispatch()
  return (
    <div className="space-y-3">
      {isRemote ? (
        <p className="text-sm text-muted-foreground">
          Sizning rolingiz: <b>{ROLE_LABELS[current]}</b>. Ruxsatlarni server tekshiradi.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Demo rol:</span>
          {ROLES.map((role) => (
            <Button key={role} size="sm" variant={role === current ? 'default' : 'outline'} onClick={() => dispatch(setRole(role))} aria-pressed={role === current}>
              {ROLE_LABELS[role]}
            </Button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Bo‘lim</th>
              {ROLES.map((role) => (
                <th key={role} className={cn('px-3 py-2 text-center font-medium', role === current && 'text-primary')}>
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {MODULE_IDS.map((module) => (
              <tr key={module}>
                <td className="px-3 py-2 font-medium">{MODULE_LABELS[module]}</td>
                {ROLES.map((role) => {
                  const level = ROLE_ACCESS[role][module]
                  return (
                    <td key={role} className="px-3 py-2 text-center">
                      <span className={cn('inline-block rounded-md px-2 py-0.5 text-xs', level === 'full' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', level === 'view' && 'bg-sky-500/10 text-sky-700 dark:text-sky-400', level === 'none' && 'bg-muted text-muted-foreground')}>
                        {ACCESS_LABELS[level]}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Eslatma: bu faqat demo UI va ruxsatlar tuzilmasi. Tugma yoki sahifani yashirish xavfsizlik hisoblanmaydi — haqiqiy autentifikatsiya va ruxsat tekshiruvi backend bosqichida amalga oshiriladi.
      </p>
    </div>
  )
}

/* ----------------------------- Ko'rinish va demo ----------------------------- */

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t } = useI18n()
  const run = useRun()
  const [resetOpen, setResetOpen] = useState(false)
  const options: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
    { id: 'light', label: 'Yorug‘', icon: Sun },
    { id: 'dark', label: 'Qorong‘i', icon: Moon },
    { id: 'system', label: 'Tizim', icon: Monitor },
  ]
  return (
    <div className="max-w-xl space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-medium">{t('settings.language.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.language.desc')}</p>
        <div role="radiogroup" aria-label={t('settings.language.title')} className="mt-3 grid grid-cols-3 gap-2">
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
        <h3 className="mb-3 text-sm font-medium">Mavzu</h3>
        <div role="radiogroup" aria-label="Mavzu" className="grid grid-cols-3 gap-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={theme === option.id}
              onClick={() => setTheme(option.id)}
              className={cn('flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', theme === option.id && 'border-primary bg-primary/5 text-primary')}
            >
              <option.icon className="size-5" aria-hidden /> {option.label}
            </button>
          ))}
        </div>
      </section>
      {!isRemote && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Demo ma’lumotlar</h3>
          <p className="mt-1 text-sm text-muted-foreground">Barcha o‘zgarishlar brauzeringizda saqlanadi. Boshlang‘ich holatga qaytarish mumkin.</p>
          <Button variant="destructive" className="mt-3" onClick={() => setResetOpen(true)}>
            <RotateCcw /> Demo ma’lumotlarni tiklash
          </Button>
        </section>
      )}
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Demo ma’lumotlarni tiklash"
        description="Barcha o‘zgarishlar o‘chiriladi va demo ma’lumotlar yangidan yaratiladi."
        confirmLabel="Tiklash"
        destructive
        onConfirm={async () => {
          const result = await run((api) => api.resetDemo(), 'Demo ma’lumotlar tiklandi')
          return result.ok
        }}
      />
    </div>
  )
}

export default function SettingsPage() {
  const role = useRole()
  const editable = canEdit(role, 'settings')
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  return (
    <div className="space-y-4">
      <PageHeader title="Sozlamalar" description={editable ? 'Do‘kon, kategoriyalar, birliklar, to‘lov turlari va rollar' : 'Sozlamalarni faqat ko‘rish mumkin (demo rol)'} />
      <Tabs defaultValue="store">
        <div className="overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="store" className="px-3">Do‘kon</TabsTrigger>
            <TabsTrigger value="catalog" className="px-3">Kategoriyalar</TabsTrigger>
            <TabsTrigger value="units" className="px-3">O‘lchov birliklari</TabsTrigger>
            <TabsTrigger value="payments" className="px-3">To‘lov turlari</TabsTrigger>
            <TabsTrigger value="roles" className="px-3">Rollar</TabsTrigger>
            <TabsTrigger value="appearance" className="px-3">Ko‘rinish</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="store"><StoreTab editable={editable} /></TabsContent>
        <TabsContent value="catalog">
          <div className="max-w-xl space-y-3 rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Mahsulot kategoriyalarini qo‘shish, nomini o‘zgartirish va o‘chirish.</p>
            <Button onClick={() => setCategoriesOpen(true)} disabled={!editable}>Kategoriyalarni boshqarish</Button>
          </div>
          <CategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
        </TabsContent>
        <TabsContent value="units"><UnitsTab editable={editable} /></TabsContent>
        <TabsContent value="payments"><PaymentsTab editable={editable} /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="appearance"><AppearanceTab /></TabsContent>
      </Tabs>
    </div>
  )
}
