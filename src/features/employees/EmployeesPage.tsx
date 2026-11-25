import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, KeyRound, LogIn, Pencil, Plus, Power, UserX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useDb, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormSheet } from '@/components/common/FormSheet'
import { Field, MoneyInput, SearchInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { phoneSchema } from '@/features/customers/CustomerFormSheet'
import { canEdit } from '@/lib/permissions'
import { isRemote } from '@/services/config'
import { EmployeeLoginSheet } from './EmployeeLoginSheet'
import type { Employee, RoleId, SalaryType } from '@/types'
import { formatDate } from '@/utils/date'
import { formatMoney, formatNumber } from '@/utils/format'
import { EMPLOYEE_STATUS, ROLE_LABELS, SALARY_TYPE } from '@/utils/labels'

const ROLE_IDS = Object.keys(ROLE_LABELS) as RoleId[]
const SALARY_TYPES = Object.keys(SALARY_TYPE) as SalaryType[]

const schema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 ta belgidan iborat bo‘lishi kerak'),
  phone: phoneSchema,
  position: z.string().trim().min(2, 'Lavozimni kiriting'),
  role: z.enum(['owner', 'manager', 'cashier', 'storekeeper', 'accountant'], { error: 'Rolni tanlang' }),
  hireDate: z.string().min(1, 'Ishga kirgan sanani kiriting'),
  salaryType: z.enum(['monthly', 'daily', 'percent'], { error: 'Ish haqi turini tanlang' }),
  salary: z.number({ error: 'Summani kiriting' }).min(0, 'Manfiy bo‘lmasligi kerak'),
  status: z.enum(['active', 'inactive']),
})
type FormValues = z.infer<typeof schema>

function EmployeeFormSheet({ open, onOpenChange, employee }: { open: boolean; onOpenChange: (open: boolean) => void; employee: Employee | null }) {
  const run = useRun()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset(
        employee
          ? { name: employee.name, phone: employee.phone, position: employee.position, role: employee.role, hireDate: employee.hireDate, salaryType: employee.salaryType, salary: employee.salary, status: employee.status }
          : { name: '', phone: '+998 ', position: '', role: 'cashier', hireDate: new Date().toISOString().slice(0, 10), salaryType: 'monthly', salary: undefined, status: 'active' },
      )
    }
  }, [open, employee, reset])

  const salaryType = watch('salaryType')
  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    const result = await run((api) => (employee ? api.updateEmployee(employee.id, values) : api.createEmployee(values)), employee ? 'Xodim yangilandi' : 'Xodim qo‘shildi')
    setSubmitting(false)
    if (result.ok) onOpenChange(false)
  })

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={employee ? 'Xodimni tahrirlash' : 'Yangi xodim'} submitting={submitting} onSubmit={onSubmit}>
      <Field label="Ism-familiya" required error={errors.name?.message}>{(props) => <Input {...props} {...register('name')} autoFocus />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefon" required error={errors.phone?.message}>{(props) => <Input {...props} {...register('phone')} type="tel" inputMode="tel" />}</Field>
        <Field label="Ishga kirgan sana" required error={errors.hireDate?.message}>{(props) => <Input {...props} {...register('hireDate')} type="date" />}</Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lavozim" required error={errors.position?.message}>{(props) => <Input {...props} {...register('position')} placeholder="Masalan: Kassir" />}</Field>
        <Field label="Rol (ruxsatlar)" required error={errors.role?.message} hint={isRemote ? 'Tizimga kirish huquqi shu rolga qarab beriladi' : 'Faqat demo UI uchun'}>
          {(props) => <Controller control={control} name="role" render={({ field }) => <SimpleSelect {...props} value={field.value ?? ''} onChange={field.onChange} options={ROLE_IDS.map((id) => ({ value: id, label: ROLE_LABELS[id] }))} />} />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ish haqi turi" required error={errors.salaryType?.message}>
          {(props) => <Controller control={control} name="salaryType" render={({ field }) => <SimpleSelect {...props} value={field.value ?? ''} onChange={field.onChange} options={SALARY_TYPES.map((id) => ({ value: id, label: SALARY_TYPE[id] }))} />} />}
        </Field>
        <Field label={salaryType === 'daily' ? 'Kunlik stavka' : salaryType === 'percent' ? 'Belgilangan qism' : 'Belgilangan oylik'} required error={errors.salary?.message}>
          {(props) => <Controller control={control} name="salary" render={({ field }) => <MoneyInput {...props} value={field.value} onChange={field.onChange} suffix="so‘m" />} />}
        </Field>
      </div>
      <Field label="Holat" error={errors.status?.message}>
        {(props) => <Controller control={control} name="status" render={({ field }) => <SimpleSelect {...props} value={field.value ?? ''} onChange={field.onChange} options={[{ value: 'active', label: 'Faol' }, { value: 'inactive', label: 'Nofaol' }]} />} />}
      </Field>
    </FormSheet>
  )
}

export default function EmployeesPage() {
  const db = useDb()
  const run = useRun()
  const role = useRole()
  const editable = canEdit(role, 'employees')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [toggling, setToggling] = useState<Employee | null>(null)
  const [loginFor, setLoginFor] = useState<{ employee: Employee; mode: 'create' | 'reset' } | null>(null)
  const [revoking, setRevoking] = useState<Employee | null>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.employees.filter((employee) => (status === 'all' || employee.status === status) && (!q || `${employee.name} ${employee.position} ${employee.phone}`.toLowerCase().includes(q)))
  }, [db.employees, search, status])

  const active = db.employees.filter((employee) => employee.status === 'active')
  const monthlyBill = active.filter((e) => e.salaryType === 'monthly').reduce((sum, e) => sum + e.salary, 0)

  const columns: Column<Employee>[] = [
    { key: 'name', header: 'Xodim', sortValue: (row) => row.name, cell: (row) => <div className="min-w-40"><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.phone}</div></div> },
    { key: 'position', header: 'Lavozim', sortValue: (row) => row.position, cell: (row) => <div><div>{row.position}</div><div className="text-xs text-muted-foreground">{ROLE_LABELS[row.role]}</div></div> },
    { key: 'hire', header: 'Ishga kirgan', hideOnMobile: true, sortValue: (row) => row.hireDate, cell: (row) => <span className="tabular-nums">{formatDate(row.hireDate)}</span> },
    { key: 'type', header: 'Ish haqi turi', hideOnMobile: true, cell: (row) => SALARY_TYPE[row.salaryType] },
    { key: 'salary', header: 'Belgilangan', align: 'right', sortValue: (row) => row.salary, cell: (row) => <span className="font-medium tabular-nums">{formatMoney(row.salary)}</span> },
    { key: 'status', header: 'Holat', cell: (row) => <StatusBadge status={EMPLOYEE_STATUS[row.status]} /> },
    ...(isRemote
      ? ([
          {
            key: 'login',
            header: 'Kirish',
            hideOnMobile: true,
            cell: (row) =>
              row.account ? (
                <span className="text-xs">{row.account.email}</span>
              ) : (
                <span className="text-xs text-muted-foreground">Login yo‘q</span>
              ),
          },
        ] as Column<Employee>[])
      : []),
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label={`${row.name}: amallar`}
          actions={[
            { label: 'Tahrirlash', icon: Pencil, hidden: !editable, onClick: () => { setEditing(row); setFormOpen(true) } },
            { label: 'Login ochish', icon: LogIn, hidden: !isRemote || !editable || Boolean(row.account) || row.status !== 'active', onClick: () => setLoginFor({ employee: row, mode: 'create' }) },
            { label: 'Parolni yangilash', icon: KeyRound, hidden: !isRemote || !editable || !row.account, onClick: () => setLoginFor({ employee: row, mode: 'reset' }) },
            { label: 'Loginni o‘chirish', icon: UserX, hidden: !isRemote || !editable || !row.account, destructive: true, onClick: () => setRevoking(row) },
            { label: row.status === 'active' ? 'Nofaol qilish' : 'Faollashtirish', icon: Power, hidden: !editable, destructive: row.status === 'active', separatorBefore: true, onClick: () => setToggling(row) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Xodimlar" description="Jamoa, lavozimlar va ish haqi shartlari" actions={editable && <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus /> Xodim qo‘shish</Button>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Faol xodimlar" value={formatNumber(active.length)} hint={`Jami ${db.employees.length} ta`} tone="info" />
        <StatCard label="Oylik fondi (belgilangan)" value={formatMoney(monthlyBill)} hint="Faol, oylik ish haqidagilar" tone="neutral" />
        <StatCard label="Oylik hisob-kitoblar" value="Oylik bo‘limi" hint="Avans, bonus, ushlab qolish" tone="success" to="/payroll" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Ism, lavozim yoki telefon…" className="sm:w-72" />
        <SimpleSelect value={status} onChange={setStatus} className="sm:w-44" aria-label="Holat" options={[{ value: 'all', label: 'Barchasi' }, { value: 'active', label: 'Faol' }, { value: 'inactive', label: 'Nofaol' }]} />
      </div>
      <DataTable data={rows} columns={columns} rowKey={(row) => row.id} defaultSort={{ key: 'name', dir: 'asc' }} caption="Xodimlar" emptyTitle="Xodim topilmadi" />
      <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <CalendarClock className="size-4 shrink-0" aria-hidden /> Davomat va xodimlar harakatlari tarixi keyingi versiyada qo‘shiladi (ma’lumotlar tuzilmasi tayyor).
      </p>
      <EmployeeFormSheet open={formOpen} onOpenChange={setFormOpen} employee={editing} />
      <EmployeeLoginSheet open={loginFor !== null} onOpenChange={(next) => !next && setLoginFor(null)} employee={loginFor?.employee ?? null} mode={loginFor?.mode ?? 'create'} />
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(next) => !next && setRevoking(null)}
        title="Loginni o‘chirish"
        description={`“${revoking?.name}” endi tizimga kira olmaydi. Xodim yozuvi va savdolari tarixi saqlanadi.`}
        confirmLabel="O‘chirish"
        destructive
        onConfirm={async () => {
          if (!revoking) return
          const result = await run((api) => api.revokeEmployeeLogin(revoking.id), 'Login o‘chirildi')
          return result.ok
        }}
      />
      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(next) => !next && setToggling(null)}
        title={toggling?.status === 'active' ? 'Xodimni nofaol qilish' : 'Xodimni faollashtirish'}
        description={toggling?.status === 'active' ? `“${toggling?.name}” keyingi oylik hisob-kitoblar va savdo sotuvchilari ro‘yxatidan chiqariladi.` : `“${toggling?.name}” yana faol xodimlar qatoriga qo‘shiladi.`}
        confirmLabel="Tasdiqlash"
        destructive={toggling?.status === 'active'}
        onConfirm={async () => {
          if (!toggling) return
          const { id: _id, ...rest } = toggling
          void _id
          const result = await run((api) => api.updateEmployee(toggling.id, { ...rest, status: toggling.status === 'active' ? 'inactive' : 'active' }), 'Xodim holati o‘zgartirildi')
          return result.ok
        }}
      />
    </div>
  )
}
