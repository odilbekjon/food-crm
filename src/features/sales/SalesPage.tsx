import { Ban, Eye, Plus, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDb, useLookups, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DateRangeFilter, useDateRange } from '@/components/common/DateRangeFilter'
import { Field, SearchInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { canEdit } from '@/lib/permissions'
import type { Sale, SaleStatus } from '@/types'
import { formatDateTime, isInRange } from '@/utils/date'
import { salePaymentState, salePaymentType, type SalePaymentState } from '@/utils/finance'
import { formatMoney, formatNumber } from '@/utils/format'
import { SALE_PAYMENT_STATE, SALE_PAYMENT_TYPE, SALE_STATUS } from '@/utils/labels'
import { SaleReceipt } from './SaleReceipt'

export default function SalesPage() {
  const db = useDb()
  const role = useRole()
  const run = useRun()
  const navigate = useNavigate()
  const lookups = useLookups()
  const [params, setParams] = useSearchParams()
  const editable = canEdit(role, 'sales')

  const { state, setState, range } = useDateRange('30d')
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [cashier, setCashier] = useState('all')
  const [payment, setPayment] = useState<'all' | SalePaymentState>('all')
  const [status, setStatus] = useState<'all' | SaleStatus>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null)
  const [cancelKind, setCancelKind] = useState<'cancelled' | 'returned'>('returned')
  const [reason, setReason] = useState('')

  const debtBySale = useMemo(() => new Map(db.debts.map((debt) => [debt.saleId, debt])), [db.debts])

  // Chek raqami bo'yicha kelgan havola (global qidiruv / dashboard) — davr filtrini chetlab o'tadi
  const searching = search.trim().length > 0 && params.get('q') === search

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.sales.filter((sale) => {
      if (!searching && !isInRange(sale.date, range)) return false
      if (cashier !== 'all' && sale.cashierId !== cashier) return false
      if (status !== 'all' && sale.status !== status) return false
      if (payment !== 'all' && salePaymentState(sale, debtBySale.get(sale.id)) !== payment) return false
      if (q) {
        const customer = sale.customerId ? lookups.customers.get(sale.customerId) : null
        const haystack = `${sale.number} ${customer?.name ?? ''} ${customer?.phone ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [db.sales, range, search, searching, cashier, status, payment, debtBySale, lookups.customers])

  const completed = rows.filter((sale) => sale.status === 'completed')
  const totalAmount = completed.reduce((sum, sale) => sum + sale.total, 0)
  const debtAmount = completed.reduce((sum, sale) => sum + sale.debtAmount, 0)

  const detail = detailId ? db.sales.find((sale) => sale.id === detailId) ?? null : null

  const columns: Column<Sale>[] = [
    { key: 'number', header: 'Chek', sortValue: (row) => row.number, cell: (row) => <span className="font-medium">{row.number}</span> },
    { key: 'date', header: 'Sana va vaqt', sortValue: (row) => row.date, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.date)}</span> },
    {
      key: 'customer',
      header: 'Mijoz',
      sortValue: (row) => (row.customerId ? lookups.customers.get(row.customerId)?.name : ''),
      cell: (row) =>
        row.customerId ? (
          <Link to={`/customers/${row.customerId}`} onClick={(event) => event.stopPropagation()} className="hover:underline">
            {lookups.customers.get(row.customerId)?.name}
          </Link>
        ) : (
          <span className="text-muted-foreground">Mijozsiz</span>
        ),
    },
    { key: 'cashier', header: 'Sotuvchi', hideOnMobile: true, cell: (row) => lookups.employees.get(row.cashierId)?.name ?? '—' },
    { key: 'items', header: 'Mahsulotlar', align: 'right', hideOnMobile: true, sortValue: (row) => row.items.length, cell: (row) => row.items.length },
    { key: 'total', header: 'Jami summa', align: 'right', sortValue: (row) => row.total, cell: (row) => <span className="font-medium tabular-nums">{formatMoney(row.total)}</span> },
    { key: 'type', header: 'To‘lov turi', hideOnMobile: true, cell: (row) => SALE_PAYMENT_TYPE[salePaymentType(row)] },
    {
      key: 'status',
      header: 'Holat',
      cell: (row) =>
        row.status === 'completed' ? (
          <StatusBadge status={SALE_PAYMENT_STATE[salePaymentState(row, debtBySale.get(row.id))]} />
        ) : (
          <StatusBadge status={SALE_STATUS[row.status]} />
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label={`${row.number}: amallar`}
          actions={[
            { label: 'Chekni ko‘rish', icon: Eye, onClick: () => setDetailId(row.id) },
            {
              label: 'Qaytarish / bekor qilish',
              icon: Ban,
              destructive: true,
              separatorBefore: true,
              hidden: !editable || row.status !== 'completed',
              onClick: () => {
                setCancelTarget(row)
                setCancelKind('returned')
                setReason('')
              },
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Savdolar"
        description="Cheklar tarixi, to‘lov holati va qaytarishlar"
        actions={
          editable && (
            <Button onClick={() => navigate('/sales/new')}>
              <Plus /> Yangi savdo
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Savdolar soni" value={formatNumber(completed.length)} hint="Yakunlangan cheklar" tone="info" />
        <StatCard label="Savdo summasi" value={formatMoney(totalAmount)} tone="success" />
        <StatCard label="Shundan nasiya" value={formatMoney(debtAmount)} hint="Qarzga yozilgan qism" tone={debtAmount ? 'warning' : 'neutral'} />
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <DateRangeFilter state={state} onChange={setState} />
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            if (params.has('q')) setParams({}, { replace: true })
          }}
          placeholder="Chek, mijoz yoki telefon…"
          className="lg:w-64"
        />
        <SimpleSelect
          value={cashier}
          onChange={setCashier}
          className="lg:w-48"
          aria-label="Sotuvchi"
          options={[{ value: 'all', label: 'Barcha sotuvchilar' }, ...db.employees.filter((e) => e.role === 'cashier' || e.role === 'manager' || e.role === 'owner').map((e) => ({ value: e.id, label: e.name }))]}
        />
        <SimpleSelect
          value={payment}
          onChange={(value) => setPayment(value as typeof payment)}
          className="lg:w-48"
          aria-label="To‘lov holati"
          options={[{ value: 'all', label: 'Barcha to‘lov holatlari' }, ...(Object.keys(SALE_PAYMENT_STATE) as SalePaymentState[]).map((id) => ({ value: id, label: SALE_PAYMENT_STATE[id].label }))]}
        />
        <SimpleSelect
          value={status}
          onChange={(value) => setStatus(value as typeof status)}
          className="lg:w-44"
          aria-label="Savdo holati"
          options={[{ value: 'all', label: 'Barcha holatlar' }, ...(Object.keys(SALE_STATUS) as SaleStatus[]).map((id) => ({ value: id, label: SALE_STATUS[id].label }))]}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'date', dir: 'desc' }}
        onRowClick={(row) => setDetailId(row.id)}
        caption="Savdolar jadvali"
        emptyTitle="Savdo topilmadi"
        emptyDescription="Davr yoki filtrlarni o‘zgartirib ko‘ring."
        emptyAction={editable ? <Button onClick={() => navigate('/sales/new')}><Plus /> Yangi savdo</Button> : undefined}
        rowClassName={(row) => (row.status !== 'completed' ? 'text-muted-foreground' : undefined)}
      />

      <Dialog open={detail !== null} onOpenChange={(next) => !next && setDetailId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chek {detail?.number}</DialogTitle>
            <DialogDescription>Savdo tafsilotlari</DialogDescription>
          </DialogHeader>
          {detail && <SaleReceipt sale={detail} />}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Chop etish
            </Button>
            {editable && detail?.status === 'completed' && (
              <Button
                variant="destructive"
                onClick={() => {
                  setCancelTarget(detail)
                  setCancelKind('returned')
                  setReason('')
                }}
              >
                <Ban /> Qaytarish
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(next) => !next && setCancelTarget(null)}
        title="Savdoni qaytarish yoki bekor qilish"
        description={
          cancelTarget
            ? `${cancelTarget.number} (${formatMoney(cancelTarget.total)}): mahsulotlar savdo do‘koni qoldig‘iga qaytariladi${cancelTarget.debtAmount > 0 ? ', nasiya qarzi bekor qilinadi' : ''}, savdo hisobotlardan chiqariladi.`
            : undefined
        }
        confirmLabel="Tasdiqlash"
        destructive
        onConfirm={async () => {
          if (!cancelTarget) return
          const target = cancelTarget
          const result = await run((api) => api.cancelSale({ saleId: target.id, kind: cancelKind, reason }), cancelKind === 'returned' ? 'Savdo qaytarildi' : 'Savdo bekor qilindi')
          if (result.ok) setDetailId(null)
          return result.ok
        }}
      >
        <div className="space-y-3">
          <Field label="Amal turi">
            {(props) => (
              <SimpleSelect {...props} value={cancelKind} onChange={(value) => setCancelKind(value as typeof cancelKind)} options={[{ value: 'returned', label: 'Qaytarish (mijoz qaytardi)' }, { value: 'cancelled', label: 'Bekor qilish (xato chek)' }]} />
            )}
          </Field>
          <Field label="Sabab" required>
            {(props) => <Textarea {...props} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Kamida 3 ta belgi" />}
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  )
}
