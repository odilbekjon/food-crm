import { Banknote, History } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDb, useLookups, useNow, useRole } from '@/app/hooks'
import { SearchInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { canEdit } from '@/lib/permissions'
import type { Debt } from '@/types'
import { receivableSummary } from '@/utils/analytics'
import { diffInDays, formatDate, formatDateTime, isInRange, rangeForPreset } from '@/utils/date'
import { debtRemaining, debtStatus } from '@/utils/finance'
import { formatMoney, formatNumber } from '@/utils/format'
import { DEBT_STATUS, PAYMENT_METHOD } from '@/utils/labels'
import { PayDebtDialog, type PayTarget } from './PayDebtDialog'

type StatusFilter = 'active' | 'overdue' | 'paid' | 'all'

export default function DebtsPage() {
  const db = useDb()
  const now = useNow()
  const role = useRole()
  const lookups = useLookups()
  const [params] = useSearchParams()
  const editable = canEdit(role, 'debts')

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>(params.get('status') === 'overdue' ? 'overdue' : 'active')
  const [pay, setPay] = useState<PayTarget | null>(null)
  const [historyOf, setHistoryOf] = useState<Debt | null>(null)

  const summary = useMemo(() => receivableSummary(db, now), [db, now])
  const collected = useMemo(() => {
    const range = rangeForPreset('30d', now)
    return db.payments.filter((payment) => payment.kind === 'debt_payment' && isInRange(payment.date, range)).reduce((sum, payment) => sum + payment.amount, 0)
  }, [db.payments, now])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.debts.filter((debt) => {
      if (debt.state === 'cancelled') return false
      const status = debtStatus(debt, now)
      if (filter === 'active' && status === 'paid') return false
      if (filter === 'overdue' && status !== 'overdue') return false
      if (filter === 'paid' && status !== 'paid') return false
      if (q) {
        const customer = lookups.customers.get(debt.customerId)
        if (!`${customer?.name ?? ''} ${customer?.phone ?? ''} ${debt.saleNumber}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [db.debts, filter, search, now, lookups.customers])

  const payments = historyOf ? db.payments.filter((payment) => payment.debtId === historyOf.id).sort((a, b) => (a.date < b.date ? -1 : 1)) : []

  const openPay = (debt: Debt) =>
    setPay({
      kind: 'debt',
      debtId: debt.id,
      title: lookups.customers.get(debt.customerId)?.name ?? 'Mijoz',
      subtitle: `Chek ${debt.saleNumber}`,
      remaining: debtRemaining(debt),
    })

  const columns: Column<Debt>[] = [
    {
      key: 'customer',
      header: 'Mijoz',
      sortValue: (row) => lookups.customers.get(row.customerId)?.name,
      cell: (row) => (
        <Link to={`/customers/${row.customerId}`} onClick={(event) => event.stopPropagation()} className="font-medium hover:underline">
          {lookups.customers.get(row.customerId)?.name ?? '—'}
        </Link>
      ),
    },
    { key: 'date', header: 'Qarz sanasi', hideOnMobile: true, sortValue: (row) => row.date, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.date)}</span> },
    { key: 'sale', header: 'Chek', hideOnMobile: true, cell: (row) => row.saleNumber },
    { key: 'amount', header: 'Dastlabki', align: 'right', hideOnMobile: true, sortValue: (row) => row.amount, cell: (row) => <span className="tabular-nums">{formatMoney(row.amount)}</span> },
    { key: 'paid', header: 'To‘langan', align: 'right', hideOnMobile: true, sortValue: (row) => row.paid, cell: (row) => <span className="tabular-nums">{formatMoney(row.paid)}</span> },
    { key: 'remaining', header: 'Qolgan qarz', align: 'right', sortValue: (row) => debtRemaining(row), cell: (row) => <span className="font-semibold tabular-nums">{formatMoney(debtRemaining(row))}</span> },
    {
      key: 'due',
      header: 'Muddat',
      sortValue: (row) => row.dueDate,
      cell: (row) => {
        const late = diffInDays(now, row.dueDate)
        return (
          <div className="whitespace-nowrap">
            <div className="tabular-nums">{formatDate(row.dueDate)}</div>
            {debtRemaining(row) > 0 && late > 0 && <div className="text-xs text-red-600 dark:text-red-400">{late} kun kechikkan</div>}
          </div>
        )
      },
    },
    { key: 'status', header: 'Holat', cell: (row) => <StatusBadge status={DEBT_STATUS[debtStatus(row, now)]} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label={`${row.saleNumber}: amallar`}
          actions={[
            { label: 'To‘lov kiritish', icon: Banknote, hidden: !editable || debtRemaining(row) <= 0, onClick: () => openPay(row) },
            { label: 'To‘lovlar tarixi', icon: History, onClick: () => setHistoryOf(row) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Qarzdorlik" description="Nasiya savdolar bo‘yicha mijoz qarzlari va to‘lovlar" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami olinadigan qarz" value={formatMoney(summary.total)} hint={`${formatNumber(summary.openCount)} ta ochiq qarz`} tone="danger" />
        <StatCard label="Muddati o‘tgan" value={formatMoney(summary.overdueTotal)} hint={`${formatNumber(summary.overdueCount)} ta qarz`} tone={summary.overdueCount ? 'danger' : 'success'} />
        <StatCard label="Qarzdorlar soni" value={formatNumber(summary.debtorCount)} tone="warning" />
        <StatCard label="So‘nggi 30 kunda undirilgan" value={formatMoney(collected)} hint="Qarz to‘lovlari" tone="success" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Mijoz, telefon yoki chek…" className="sm:w-72" />
        <SimpleSelect
          value={filter}
          onChange={(value) => setFilter(value as StatusFilter)}
          className="sm:w-52"
          aria-label="Holat"
          options={[
            { value: 'active', label: 'Faol qarzlar' },
            { value: 'overdue', label: 'Muddati o‘tgan' },
            { value: 'paid', label: 'To‘langan' },
            { value: 'all', label: 'Barchasi' },
          ]}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'remaining', dir: 'desc' }}
        onRowClick={editable ? (row) => debtRemaining(row) > 0 && openPay(row) : undefined}
        caption="Qarzlar ro‘yxati"
        emptyTitle="Qarz topilmadi"
        emptyDescription="Filtrni o‘zgartirib ko‘ring."
      />

      <PayDebtDialog target={pay} onClose={() => setPay(null)} />

      <Dialog open={historyOf !== null} onOpenChange={(next) => !next && setHistoryOf(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>To‘lovlar tarixi</DialogTitle>
            <DialogDescription>
              {historyOf && `${lookups.customers.get(historyOf.customerId)?.name} · chek ${historyOf.saleNumber}`}
            </DialogDescription>
          </DialogHeader>
          {historyOf && (
            <>
              <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Dastlabki</dt>
                  <dd className="font-medium tabular-nums">{formatMoney(historyOf.amount)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">To‘langan</dt>
                  <dd className="font-medium tabular-nums">{formatMoney(historyOf.paid)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Qolgan</dt>
                  <dd className="font-semibold tabular-nums">{formatMoney(debtRemaining(historyOf))}</dd>
                </div>
              </dl>
              {payments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Hali to‘lov kiritilmagan</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>
                        <span className="block tabular-nums">{formatDateTime(payment.date)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {PAYMENT_METHOD[payment.method]}
                          {payment.note ? ` · ${payment.note}` : ''}
                        </span>
                      </span>
                      <span className="font-medium tabular-nums">{formatMoney(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
