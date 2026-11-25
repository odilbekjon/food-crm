import { Archive, ArchiveRestore, Eye, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDb, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SearchInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { canEdit } from '@/lib/permissions'
import type { Customer } from '@/types'
import { formatDate } from '@/utils/date'
import { buildCustomerStats, isRegularCustomer, type CustomerStats } from '@/utils/finance'
import { formatMoney, formatNumber } from '@/utils/format'
import { CUSTOMER_SEGMENT, ENTITY_STATUS } from '@/utils/labels'
import { CustomerFormSheet } from './CustomerFormSheet'

const EMPTY_STATS: CustomerStats = { purchasesTotal: 0, purchasesCount: 0, debtTotal: 0, lastPurchaseAt: null, segment: 'new' }

export default function CustomersPage() {
  const db = useDb()
  const run = useRun()
  const role = useRole()
  const navigate = useNavigate()
  const editable = canEdit(role, 'customers')

  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('all')
  const [debt, setDebt] = useState('all')
  const [status, setStatus] = useState('active')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [archiving, setArchiving] = useState<Customer | null>(null)

  const stats = useMemo(() => buildCustomerStats(db), [db])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return db.customers.filter((customer) => {
      if (status !== 'all' && customer.status !== status) return false
      const s = stats.get(customer.id) ?? EMPTY_STATS
      if (segment === 'regular' && !isRegularCustomer(s.segment)) return false
      if ((segment === 'new' || segment === 'vip') && s.segment !== segment) return false
      if (debt === 'debtors' && s.debtTotal <= 0) return false
      if (debt === 'clean' && s.debtTotal > 0) return false
      if (q && !(customer.name.toLowerCase().includes(q) || (digits.length >= 3 && customer.phone.replace(/\D/g, '').includes(digits)))) return false
      return true
    })
  }, [db.customers, stats, search, segment, debt, status])

  const active = db.customers.filter((customer) => customer.status === 'active')
  const regular = active.filter((customer) => isRegularCustomer((stats.get(customer.id) ?? EMPTY_STATS).segment)).length
  const debtors = active.filter((customer) => (stats.get(customer.id) ?? EMPTY_STATS).debtTotal > 0).length
  const totalDebt = [...stats.values()].reduce((sum, item) => sum + item.debtTotal, 0)

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Mijoz',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-40">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.phone}</div>
        </div>
      ),
    },
    { key: 'total', header: 'Xaridlar summasi', align: 'right', sortValue: (row) => (stats.get(row.id) ?? EMPTY_STATS).purchasesTotal, cell: (row) => <span className="tabular-nums">{formatMoney((stats.get(row.id) ?? EMPTY_STATS).purchasesTotal)}</span> },
    { key: 'count', header: 'Xaridlar soni', align: 'right', hideOnMobile: true, sortValue: (row) => (stats.get(row.id) ?? EMPTY_STATS).purchasesCount, cell: (row) => (stats.get(row.id) ?? EMPTY_STATS).purchasesCount },
    {
      key: 'debt',
      header: 'Jami qarz',
      align: 'right',
      sortValue: (row) => (stats.get(row.id) ?? EMPTY_STATS).debtTotal,
      cell: (row) => {
        const value = (stats.get(row.id) ?? EMPTY_STATS).debtTotal
        return <span className={value > 0 ? 'font-semibold tabular-nums text-red-600 dark:text-red-400' : 'tabular-nums text-muted-foreground'}>{formatMoney(value)}</span>
      },
    },
    { key: 'last', header: 'Oxirgi xarid', hideOnMobile: true, sortValue: (row) => (stats.get(row.id) ?? EMPTY_STATS).lastPurchaseAt, cell: (row) => <span className="tabular-nums">{formatDate((stats.get(row.id) ?? EMPTY_STATS).lastPurchaseAt)}</span> },
    {
      key: 'segment',
      header: 'Segment',
      cell: (row) => (row.status === 'archived' ? <StatusBadge status={ENTITY_STATUS.archived} /> : <StatusBadge status={CUSTOMER_SEGMENT[(stats.get(row.id) ?? EMPTY_STATS).segment]} />),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label={`${row.name}: amallar`}
          actions={[
            { label: 'Profil', icon: Eye, onClick: () => navigate(`/customers/${row.id}`) },
            { label: 'Tahrirlash', icon: Pencil, hidden: !editable, onClick: () => { setEditing(row); setFormOpen(true) } },
            row.status === 'active'
              ? { label: 'Arxivlash', icon: Archive, hidden: !editable, destructive: true, separatorBefore: true, onClick: () => setArchiving(row) }
              : { label: 'Faollashtirish', icon: ArchiveRestore, hidden: !editable, separatorBefore: true, onClick: () => void run((api) => api.setCustomerStatus(row.id, 'active'), 'Mijoz faollashtirildi') },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mijozlar"
        description="Mijozlar bazasi, xaridlar tarixi va qarzdorlik"
        actions={editable && <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus /> Mijoz qo‘shish</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faol mijozlar" value={formatNumber(active.length)} tone="info" />
        <StatCard label="Doimiy mijozlar" value={formatNumber(regular)} hint="8+ xarid yoki 8 mln so‘mdan ko‘p xarid" tone="success" />
        <StatCard label="Qarzdor mijozlar" value={formatNumber(debtors)} tone={debtors ? 'warning' : 'success'} />
        <StatCard label="Jami qarz" value={formatMoney(totalDebt)} tone={totalDebt ? 'danger' : 'success'} to="/debts" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Ism yoki telefon raqami…" className="sm:w-72" />
        <SimpleSelect value={segment} onChange={setSegment} className="sm:w-44" aria-label="Segment" options={[{ value: 'all', label: 'Barcha segmentlar' }, { value: 'regular', label: 'Doimiy mijozlar' }, { value: 'vip', label: 'VIP' }, { value: 'new', label: 'Yangi' }]} />
        <SimpleSelect value={debt} onChange={setDebt} className="sm:w-44" aria-label="Qarzdorlik" options={[{ value: 'all', label: 'Barchasi' }, { value: 'debtors', label: 'Qarzdorlar' }, { value: 'clean', label: 'Qarzsiz' }]} />
        <SimpleSelect value={status} onChange={setStatus} className="sm:w-40" aria-label="Holat" options={[{ value: 'active', label: 'Faol' }, { value: 'archived', label: 'Arxivlangan' }, { value: 'all', label: 'Barchasi' }]} />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'total', dir: 'desc' }}
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
        caption="Mijozlar ro‘yxati"
        emptyTitle="Mijoz topilmadi"
        emptyDescription="Qidiruv yoki filtrlarni o‘zgartirib ko‘ring."
        emptyAction={editable ? <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus /> Mijoz qo‘shish</Button> : undefined}
      />

      <CustomerFormSheet open={formOpen} onOpenChange={setFormOpen} customer={editing} />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(next) => !next && setArchiving(null)}
        title="Mijozni arxivlash"
        description={`“${archiving?.name ?? ''}” arxivlanadi. Qarzi bor mijozni arxivlab bo‘lmaydi; tarix saqlanadi.`}
        confirmLabel="Arxivlash"
        destructive
        onConfirm={async () => {
          if (!archiving) return
          const result = await run((api) => api.setCustomerStatus(archiving.id, 'archived'), 'Mijoz arxivlandi')
          return result.ok
        }}
      />
    </div>
  )
}
