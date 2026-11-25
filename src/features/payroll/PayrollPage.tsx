import { Banknote, CheckCheck, Info, Pencil, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { subMonths } from 'date-fns'
import { useDb, useLookups, useNow, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormSheet } from '@/components/common/FormSheet'
import { Field, MoneyInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { canEdit } from '@/lib/permissions'
import type { PayrollRecord } from '@/types'
import { formatDate, formatPeriod, periodOf } from '@/utils/date'
import { payrollAccrued, payrollPaid, payrollPayable, payrollRemaining } from '@/utils/finance'
import { formatMoney, formatNumber } from '@/utils/format'
import { PAYROLL_STATUS } from '@/utils/labels'

function EditSheet({ record, onClose }: { record: PayrollRecord | null; onClose: () => void }) {
  const run = useRun()
  const lookups = useLookups()
  const [form, setForm] = useState({ baseSalary: 0 as number | undefined, bonus: 0 as number | undefined, deduction: 0 as number | undefined, advance: 0 as number | undefined, note: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (record) {
      setForm({ baseSalary: record.baseSalary, bonus: record.bonus, deduction: record.deduction, advance: record.advance, note: record.note })
      setError('')
    }
  }, [record])

  const draft = record ? { ...record, baseSalary: form.baseSalary ?? 0, bonus: form.bonus ?? 0, deduction: form.deduction ?? 0, advance: form.advance ?? 0 } : null

  const submit = async () => {
    if (!record || !draft) return
    if (draft.advance > payrollAccrued(draft)) {
      setError('Avans hisoblangan oylikdan oshib ketdi')
      return
    }
    setError('')
    setBusy(true)
    const result = await run((api) => api.updatePayroll(record.id, { baseSalary: draft.baseSalary, bonus: draft.bonus, deduction: draft.deduction, advance: draft.advance, note: form.note }), 'Hisob-kitob yangilandi')
    setBusy(false)
    if (result.ok) onClose()
  }

  return (
    <FormSheet
      open={record !== null}
      onOpenChange={(next) => !next && onClose()}
      title="Hisob-kitobni tahrirlash"
      description={record ? `${lookups.employees.get(record.employeeId)?.name} · ${formatPeriod(record.period)}` : undefined}
      submitting={busy}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Field label="Belgilangan oylik">{(props) => <MoneyInput {...props} value={form.baseSalary} onChange={(value) => setForm((f) => ({ ...f, baseSalary: value }))} suffix="so‘m" />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bonus">{(props) => <MoneyInput {...props} value={form.bonus} onChange={(value) => setForm((f) => ({ ...f, bonus: value }))} suffix="so‘m" />}</Field>
        <Field label="Ushlab qolish">{(props) => <MoneyInput {...props} value={form.deduction} onChange={(value) => setForm((f) => ({ ...f, deduction: value }))} suffix="so‘m" />}</Field>
      </div>
      <Field label="Avans (oldin berilgan)" error={error} hint="Avans oxirgi to‘lovdan ayiriladi">
        {(props) => <MoneyInput {...props} value={form.advance} onChange={(value) => setForm((f) => ({ ...f, advance: value }))} suffix="so‘m" />}
      </Field>
      <Field label="Izoh">{(props) => <Textarea {...props} value={form.note} onChange={(event) => setForm((f) => ({ ...f, note: event.target.value }))} rows={2} />}</Field>
      {draft && (
        <dl className="space-y-1 rounded-lg bg-muted/60 p-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Hisoblangan</dt><dd className="font-medium tabular-nums">{formatMoney(payrollAccrued(draft))}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Avans ayirilgach to‘lanadi</dt><dd className="font-semibold tabular-nums">{formatMoney(payrollPayable(draft))}</dd></div>
        </dl>
      )}
    </FormSheet>
  )
}

export default function PayrollPage() {
  const db = useDb()
  const now = useNow()
  const role = useRole()
  const run = useRun()
  const lookups = useLookups()
  const editable = canEdit(role, 'payroll')

  const periods = useMemo(() => {
    const set = new Set<string>([periodOf(now), ...db.payroll.map((record) => record.period)])
    for (let i = 1; i <= 2; i++) set.add(periodOf(subMonths(now, i)))
    return [...set].sort().reverse()
  }, [db.payroll, now])
  const [period, setPeriod] = useState(periodOf(now))
  const [editing, setEditing] = useState<PayrollRecord | null>(null)
  const [approving, setApproving] = useState<PayrollRecord | null>(null)
  const [paying, setPaying] = useState<PayrollRecord | null>(null)
  const [payAmount, setPayAmount] = useState<number | undefined>(undefined)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    if (paying) {
      setPayAmount(payrollRemaining(paying))
      setPayError('')
    }
  }, [paying])

  const rows = useMemo(() => db.payroll.filter((record) => record.period === period), [db.payroll, period])
  const totals = rows.reduce(
    (acc, record) => ({
      accrued: acc.accrued + payrollAccrued(record),
      advance: acc.advance + record.advance,
      paid: acc.paid + payrollPaid(record),
      remaining: acc.remaining + payrollRemaining(record),
    }),
    { accrued: 0, advance: 0, paid: 0, remaining: 0 },
  )
  const draftCount = rows.filter((record) => record.status === 'draft').length
  const missing = db.employees.filter((employee) => employee.status === 'active' && !rows.some((record) => record.employeeId === employee.id)).length

  const columns: Column<PayrollRecord>[] = [
    { key: 'employee', header: 'Xodim', sortValue: (row) => lookups.employees.get(row.employeeId)?.name, cell: (row) => <div className="min-w-36"><div className="font-medium">{lookups.employees.get(row.employeeId)?.name}</div><div className="text-xs text-muted-foreground">{lookups.employees.get(row.employeeId)?.position}</div></div> },
    { key: 'base', header: 'Belgilangan', align: 'right', hideOnMobile: true, sortValue: (row) => row.baseSalary, cell: (row) => <span className="tabular-nums">{formatMoney(row.baseSalary)}</span> },
    { key: 'bonus', header: 'Bonus', align: 'right', hideOnMobile: true, cell: (row) => <span className="tabular-nums">{formatMoney(row.bonus)}</span> },
    { key: 'deduction', header: 'Ushlab qolish', align: 'right', hideOnMobile: true, cell: (row) => <span className="tabular-nums">{formatMoney(row.deduction)}</span> },
    { key: 'accrued', header: 'Hisoblangan', align: 'right', sortValue: (row) => payrollAccrued(row), cell: (row) => <span className="font-medium tabular-nums">{formatMoney(payrollAccrued(row))}</span> },
    { key: 'advance', header: 'Avans', align: 'right', hideOnMobile: true, cell: (row) => <span className="tabular-nums">{formatMoney(row.advance)}</span> },
    { key: 'paid', header: 'To‘langan', align: 'right', sortValue: (row) => payrollPaid(row), cell: (row) => <span className="tabular-nums">{formatMoney(payrollPaid(row))}</span> },
    { key: 'remaining', header: 'Qolgan', align: 'right', sortValue: (row) => payrollRemaining(row), cell: (row) => <span className="font-semibold tabular-nums">{formatMoney(payrollRemaining(row))}</span> },
    { key: 'date', header: 'To‘lov sanasi', hideOnMobile: true, cell: (row) => <span className="tabular-nums">{formatDate(row.paidAt)}</span> },
    { key: 'status', header: 'Holat', cell: (row) => <StatusBadge status={PAYROLL_STATUS[row.status]} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label="Oylik amallari"
          actions={[
            { label: 'Tahrirlash', icon: Pencil, hidden: !editable || row.status !== 'draft', onClick: () => setEditing(row) },
            { label: 'Tasdiqlash', icon: CheckCheck, hidden: !editable || row.status !== 'draft', onClick: () => setApproving(row) },
            { label: 'To‘lov kiritish', icon: Banknote, hidden: !editable || row.status !== 'approved', onClick: () => setPaying(row) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Oylik va ish haqi"
        description="Hisoblash davri bo‘yicha oyliklar. Tasdiqlanmagan hisob-kitob to‘langan oylik sifatida ko‘rsatilmaydi."
        actions={
          <>
            <SimpleSelect value={period} onChange={setPeriod} className="w-44" aria-label="Davr" options={periods.map((p) => ({ value: p, label: formatPeriod(p) }))} />
            {editable && (
              <Button
                variant={missing ? 'default' : 'outline'}
                disabled={missing === 0}
                onClick={() => void run((api) => api.generatePayroll(period), `${formatPeriod(period)} uchun hisob-kitoblar yaratildi`)}
              >
                <Plus /> Hisob-kitob yaratish {missing > 0 && `(${missing})`}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hisoblangan oylik" value={formatMoney(totals.accrued)} hint={`${rows.length} ta xodim`} tone="info" />
        <StatCard label="Avans berilgan" value={formatMoney(totals.advance)} tone="neutral" />
        <StatCard label="To‘langan" value={formatMoney(totals.paid)} hint="Faqat tasdiqlangan hisob-kitoblar" tone="success" />
        <StatCard label="Qolgan to‘lov" value={formatMoney(totals.remaining)} tone={totals.remaining ? 'warning' : 'success'} />
      </div>
      {draftCount > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formatNumber(draftCount)} ta hisob-kitob tasdiqlanmagan: ular to‘langan oylik yoki xarajat sifatida hisobga olinmaydi.
        </p>
      )}

      <DataTable data={rows} columns={columns} rowKey={(row) => row.id} defaultSort={{ key: 'employee', dir: 'asc' }} pageSize={20} caption="Oylik hisob-kitoblari" emptyTitle="Bu davr uchun hisob-kitob yo‘q" emptyDescription="“Hisob-kitob yaratish” tugmasi faol xodimlar uchun qoralama yaratadi." />

      <EditSheet record={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(next) => !next && setApproving(null)}
        title="Hisob-kitobni tasdiqlash"
        description={approving ? `${lookups.employees.get(approving.employeeId)?.name}: hisoblangan ${formatMoney(payrollAccrued(approving))}, avans ${formatMoney(approving.advance)}. Tasdiqlangandan keyin o‘zgartirib bo‘lmaydi va xarajat sifatida hisobga olinadi.` : undefined}
        confirmLabel="Tasdiqlash"
        onConfirm={async () => {
          if (!approving) return
          const result = await run((api) => api.approvePayroll(approving.id), 'Hisob-kitob tasdiqlandi')
          return result.ok
        }}
      />

      <Dialog open={paying !== null} onOpenChange={(next) => !next && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Oylik to‘lovi</DialogTitle>
            <DialogDescription>{paying && `${lookups.employees.get(paying.employeeId)?.name} · qolgan ${formatMoney(payrollRemaining(paying))}`}</DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (!paying) return
              if (!payAmount || payAmount <= 0) return setPayError('Summani kiriting')
              if (payAmount > payrollRemaining(paying)) return setPayError('Qolgan summadan oshib ketdi')
              const result = await run((api) => api.payPayroll(paying.id, payAmount), 'Oylik to‘lovi qayd etildi')
              if (result.ok) setPaying(null)
            }}
          >
            <Field label="To‘lov summasi" required error={payError}>
              {(props) => (
                <div className="flex gap-2">
                  <MoneyInput {...props} value={payAmount} onChange={setPayAmount} suffix="so‘m" />
                  <Button type="button" variant="outline" onClick={() => paying && setPayAmount(payrollRemaining(paying))}>To‘liq</Button>
                </div>
              )}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>Bekor qilish</Button>
              <Button type="submit">To‘lash</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
