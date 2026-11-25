import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useDb, useLookups, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DateRangeFilter, useDateRange } from '@/components/common/DateRangeFilter'
import { FormSheet } from '@/components/common/FormSheet'
import { Field, MoneyInput, SearchInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { StatCard } from '@/components/common/StatCard'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { canEdit } from '@/lib/permissions'
import type { Expense, ExpenseCategory } from '@/types'
import { formatDate, isInRange, toISODate } from '@/utils/date'
import { payrollCost } from '@/utils/finance'
import { formatMoney, formatNumber, formatPercent } from '@/utils/format'
import { EXPENSE_CATEGORY } from '@/utils/labels'

const CATEGORY_IDS = Object.keys(EXPENSE_CATEGORY) as ExpenseCategory[]

const schema = z.object({
  date: z.string().min(1, 'Sanani kiriting'),
  category: z.enum(['rent', 'utilities', 'transport', 'repair', 'other'], { error: 'Kategoriyani tanlang' }),
  amount: z.number({ error: 'Summani kiriting' }).positive('Summa noldan katta bo‘lishi kerak'),
  note: z.string().trim().min(2, 'Izoh kiriting'),
  employeeId: z.string().min(1, 'Mas’ul xodimni tanlang'),
})
type FormValues = z.infer<typeof schema>

function ExpenseFormSheet({ open, onOpenChange, expense }: { open: boolean; onOpenChange: (open: boolean) => void; expense: Expense | null }) {
  const db = useDb()
  const run = useRun()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset(
        expense
          ? { date: expense.date, category: expense.category, amount: expense.amount, note: expense.note, employeeId: expense.employeeId }
          : { date: toISODate(new Date()), category: undefined, amount: undefined, note: '', employeeId: '' },
      )
    }
  }, [open, expense, reset])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    const result = await run((api) => (expense ? api.updateExpense(expense.id, values) : api.createExpense(values)), expense ? 'Xarajat yangilandi' : 'Xarajat qo‘shildi')
    setSubmitting(false)
    if (result.ok) onOpenChange(false)
  })

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={expense ? 'Xarajatni tahrirlash' : 'Yangi xarajat'} submitting={submitting} onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sana" required error={errors.date?.message}>{(props) => <Input {...props} {...register('date')} type="date" max={toISODate(new Date())} />}</Field>
        <Field label="Kategoriya" required error={errors.category?.message}>
          {(props) => <Controller control={control} name="category" render={({ field }) => <SimpleSelect {...props} value={field.value ?? ''} onChange={field.onChange} options={CATEGORY_IDS.map((id) => ({ value: id, label: EXPENSE_CATEGORY[id] }))} />} />}
        </Field>
      </div>
      <Field label="Summa" required error={errors.amount?.message}>
        {(props) => <Controller control={control} name="amount" render={({ field }) => <MoneyInput {...props} value={field.value} onChange={field.onChange} suffix="so‘m" />} />}
      </Field>
      <Field label="Mas’ul xodim" required error={errors.employeeId?.message}>
        {(props) => (
          <Controller control={control} name="employeeId" render={({ field }) => <SimpleSelect {...props} value={field.value ?? ''} onChange={field.onChange} options={db.employees.filter((e) => e.status === 'active').map((e) => ({ value: e.id, label: `${e.name} · ${e.position}` }))} />} />
        )}
      </Field>
      <Field label="Izoh" required error={errors.note?.message}>{(props) => <Textarea {...props} {...register('note')} rows={3} placeholder="Masalan: oktabr oyi ijarasi" />}</Field>
    </FormSheet>
  )
}

export default function ExpensesPage() {
  const db = useDb()
  const run = useRun()
  const role = useRole()
  const lookups = useLookups()
  const editable = canEdit(role, 'expenses')
  const { state, setState, range } = useDateRange('30d')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)

  const inRange = useMemo(() => db.expenses.filter((expense) => isInRange(expense.date, range)), [db.expenses, range])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inRange.filter((expense) => (category === 'all' || expense.category === category) && (!q || expense.note.toLowerCase().includes(q)))
  }, [inRange, category, search])

  const total = inRange.reduce((sum, expense) => sum + expense.amount, 0)
  const byCategory = CATEGORY_IDS.map((id) => ({ id, amount: inRange.filter((e) => e.category === id).reduce((sum, e) => sum + e.amount, 0) })).sort((a, b) => b.amount - a.amount)
  const payrollTotal = db.payroll.filter((r) => r.approvedAt && isInRange(r.approvedAt, range)).reduce((sum, r) => sum + payrollCost(r), 0)

  const columns: Column<Expense>[] = [
    { key: 'date', header: 'Sana', sortValue: (row) => row.date, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.date)}</span> },
    { key: 'category', header: 'Kategoriya', sortValue: (row) => row.category, cell: (row) => EXPENSE_CATEGORY[row.category] },
    { key: 'note', header: 'Izoh', cell: (row) => row.note },
    { key: 'employee', header: 'Mas’ul', hideOnMobile: true, cell: (row) => lookups.employees.get(row.employeeId)?.name ?? '—' },
    { key: 'amount', header: 'Summa', align: 'right', sortValue: (row) => row.amount, cell: (row) => <span className="font-medium tabular-nums">{formatMoney(row.amount)}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label="Xarajat amallari"
          actions={[
            { label: 'Tahrirlash', icon: Pencil, hidden: !editable, onClick: () => { setEditing(row); setFormOpen(true) } },
            { label: 'O‘chirish', icon: Trash2, hidden: !editable, destructive: true, separatorBefore: true, onClick: () => setDeleting(row) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Xarajatlar" description="Do‘konning operatsion xarajatlari. Ular foyda hisobotlarida hisobga olinadi." actions={editable && <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus /> Xarajat qo‘shish</Button>} />
      <DateRangeFilter state={state} onChange={setState} />

      <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
        <div className="grid gap-3">
          <StatCard label="Davr xarajatlari" value={formatMoney(total)} hint={`${formatNumber(inRange.length)} ta yozuv`} tone="warning" />
          <StatCard label="Tasdiqlangan oyliklar" value={formatMoney(payrollTotal)} hint="Alohida: Oylik bo‘limida" tone="neutral" to="/payroll" />
        </div>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Kategoriyalar bo‘yicha</h3>
          <ul className="space-y-2.5">
            {byCategory.map((item) => {
              const share = total > 0 ? (item.amount / total) * 100 : 0
              return (
                <li key={item.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{EXPENSE_CATEGORY[item.id]}</span>
                    <span className="tabular-nums text-muted-foreground">{formatMoney(item.amount)} · {formatPercent(share, 0)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Izoh bo‘yicha qidirish…" className="sm:w-72" />
        <SimpleSelect value={category} onChange={setCategory} className="sm:w-56" aria-label="Kategoriya" options={[{ value: 'all', label: 'Barcha kategoriyalar' }, ...CATEGORY_IDS.map((id) => ({ value: id, label: EXPENSE_CATEGORY[id] }))]} />
      </div>

      <DataTable data={rows} columns={columns} rowKey={(row) => row.id} defaultSort={{ key: 'date', dir: 'desc' }} caption="Xarajatlar" emptyTitle="Xarajat topilmadi" emptyDescription="Davr yoki kategoriyani o‘zgartirib ko‘ring." />

      <ExpenseFormSheet open={formOpen} onOpenChange={setFormOpen} expense={editing} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Xarajatni o‘chirish"
        description={deleting ? `${formatDate(deleting.date)} · ${formatMoney(deleting.amount)} · ${deleting.note}` : undefined}
        confirmLabel="O‘chirish"
        destructive
        onConfirm={async () => {
          if (!deleting) return
          const result = await run((api) => api.deleteExpense(deleting.id), 'Xarajat o‘chirildi')
          return result.ok
        }}
      />
    </div>
  )
}
