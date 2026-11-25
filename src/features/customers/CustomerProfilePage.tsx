import { ArrowLeft, Banknote, MapPin, MessageSquarePlus, Pencil, Phone, ShoppingCart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDb, useLookups, useNow, useRole, useRun } from '@/app/hooks'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/states'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PayDebtDialog, type PayTarget } from '@/features/debts/PayDebtDialog'
import { canEdit } from '@/lib/permissions'
import type { Debt, Payment, Sale } from '@/types'
import { formatDate, formatDateTime } from '@/utils/date'
import { buildCustomerStats, debtRemaining, debtStatus, salePaymentState } from '@/utils/finance'
import { formatMoney, formatNumber } from '@/utils/format'
import { CUSTOMER_SEGMENT, DEBT_STATUS, ENTITY_STATUS, PAYMENT_METHOD, SALE_PAYMENT_STATE, SALE_STATUS } from '@/utils/labels'
import { CustomerFormSheet } from './CustomerFormSheet'

/** Mijozning barcha muhim ma'lumotlari bitta profil sahifasida. */
export default function CustomerProfilePage() {
  const { customerId } = useParams()
  const db = useDb()
  const now = useNow()
  const role = useRole()
  const run = useRun()
  const navigate = useNavigate()
  const lookups = useLookups()
  const editable = canEdit(role, 'customers')
  const canPay = canEdit(role, 'debts')

  const [editOpen, setEditOpen] = useState(false)
  const [pay, setPay] = useState<PayTarget | null>(null)
  const [noteText, setNoteText] = useState('')

  const customer = db.customers.find((item) => item.id === customerId)
  const stats = useMemo(() => buildCustomerStats(db).get(customerId ?? ''), [db, customerId])
  const sales = useMemo(() => db.sales.filter((sale) => sale.customerId === customerId), [db.sales, customerId])
  const debts = useMemo(() => db.debts.filter((debt) => debt.customerId === customerId && debt.state === 'active'), [db.debts, customerId])
  const payments = useMemo(() => db.payments.filter((payment) => payment.customerId === customerId), [db.payments, customerId])
  const debtBySale = useMemo(() => new Map(db.debts.map((debt) => [debt.saleId, debt])), [db.debts])

  if (!customer || !stats) {
    return (
      <EmptyState
        title="Mijoz topilmadi"
        action={<Link to="/customers" className={buttonVariants({ variant: 'outline' })}>Mijozlarga qaytish</Link>}
        className="py-24"
      />
    )
  }

  const average = stats.purchasesCount ? Math.round(stats.purchasesTotal / stats.purchasesCount) : 0
  const openDebts = debts.filter((debt) => debtRemaining(debt) > 0)

  const saleColumns: Column<Sale>[] = [
    { key: 'number', header: 'Chek', sortValue: (row) => row.number, cell: (row) => <Link to={`/sales?q=${row.number}`} className="font-medium hover:underline">{row.number}</Link> },
    { key: 'date', header: 'Sana', sortValue: (row) => row.date, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.date)}</span> },
    { key: 'items', header: 'Mahsulotlar', hideOnMobile: true, cell: (row) => row.items.map((item) => item.name).slice(0, 2).join(', ') + (row.items.length > 2 ? ` +${row.items.length - 2}` : '') },
    { key: 'total', header: 'Summa', align: 'right', sortValue: (row) => row.total, cell: (row) => <span className="font-medium tabular-nums">{formatMoney(row.total)}</span> },
    {
      key: 'status',
      header: 'Holat',
      cell: (row) => (row.status === 'completed' ? <StatusBadge status={SALE_PAYMENT_STATE[salePaymentState(row, debtBySale.get(row.id))]} /> : <StatusBadge status={SALE_STATUS[row.status]} />),
    },
  ]

  const debtColumns: Column<Debt>[] = [
    { key: 'sale', header: 'Chek', cell: (row) => row.saleNumber },
    { key: 'date', header: 'Qarz sanasi', sortValue: (row) => row.date, cell: (row) => <span className="tabular-nums">{formatDate(row.date)}</span> },
    { key: 'amount', header: 'Dastlabki', align: 'right', hideOnMobile: true, cell: (row) => <span className="tabular-nums">{formatMoney(row.amount)}</span> },
    { key: 'paid', header: 'To‘langan', align: 'right', hideOnMobile: true, cell: (row) => <span className="tabular-nums">{formatMoney(row.paid)}</span> },
    { key: 'rest', header: 'Qolgan', align: 'right', sortValue: (row) => debtRemaining(row), cell: (row) => <span className="font-semibold tabular-nums">{formatMoney(debtRemaining(row))}</span> },
    { key: 'due', header: 'Muddat', sortValue: (row) => row.dueDate, cell: (row) => <span className="tabular-nums">{formatDate(row.dueDate)}</span> },
    { key: 'status', header: 'Holat', cell: (row) => <StatusBadge status={DEBT_STATUS[debtStatus(row, now)]} /> },
  ]

  const paymentColumns: Column<Payment>[] = [
    { key: 'date', header: 'Sana', sortValue: (row) => row.date, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.date)}</span> },
    { key: 'kind', header: 'Turi', cell: (row) => (row.kind === 'debt_payment' ? 'Qarz to‘lovi' : 'Savdo to‘lovi') },
    { key: 'sale', header: 'Chek', hideOnMobile: true, cell: (row) => lookups.sales.get(row.saleId)?.number ?? '—' },
    { key: 'method', header: 'Usul', hideOnMobile: true, cell: (row) => PAYMENT_METHOD[row.method] },
    { key: 'amount', header: 'Summa', align: 'right', sortValue: (row) => row.amount, cell: (row) => <span className="font-medium tabular-nums">{formatMoney(row.amount)}</span> },
  ]

  const addNote = async () => {
    const result = await run((api) => api.addCustomerNote(customer.id, noteText), 'Izoh qo‘shildi')
    if (result.ok) setNoteText('')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={customer.name}
        description="Mijoz profili"
        actions={
          <>
            <Link to="/customers" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft /> Ro‘yxat
            </Link>
            {canEdit(role, 'sales') && customer.status === 'active' && (
              <Button variant="outline" onClick={() => navigate(`/sales/new?customer=${customer.id}`)}>
                <ShoppingCart /> Yangi savdo
              </Button>
            )}
            {canPay && stats.debtTotal > 0 && (
              <Button onClick={() => setPay({ kind: 'customer', customerId: customer.id, title: customer.name, subtitle: `${openDebts.length} ta ochiq qarz`, remaining: stats.debtTotal })}>
                <Banknote /> Qarz to‘lovi
              </Button>
            )}
            {editable && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil /> Tahrirlash
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <StatusBadge status={customer.status === 'archived' ? ENTITY_STATUS.archived : CUSTOMER_SEGMENT[stats.segment]} />
        <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" /> {customer.phone}</span>
        {customer.address && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {customer.address}</span>}
        <span>Mijoz bo‘lgan: {formatDate(customer.createdAt)}</span>
      </div>
      {customer.note && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{customer.note}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Xaridlar summasi" value={formatMoney(stats.purchasesTotal)} tone="success" />
        <StatCard label="Xaridlar soni" value={formatNumber(stats.purchasesCount)} hint={`O‘rtacha chek: ${formatMoney(average)}`} tone="info" />
        <StatCard label="Jami qarz" value={formatMoney(stats.debtTotal)} hint={`${openDebts.length} ta ochiq qarz`} tone={stats.debtTotal ? 'danger' : 'success'} />
        <StatCard label="Oxirgi xarid" value={formatDate(stats.lastPurchaseAt)} tone="neutral" />
        <StatCard label="Segment" value={CUSTOMER_SEGMENT[stats.segment].label} tone="neutral" />
      </div>

      <Tabs defaultValue="purchases">
        <div className="overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="purchases" className="px-3">Xaridlar ({sales.length})</TabsTrigger>
            <TabsTrigger value="debts" className="px-3">Qarzdorlik ({openDebts.length})</TabsTrigger>
            <TabsTrigger value="payments" className="px-3">To‘lovlar ({payments.length})</TabsTrigger>
            <TabsTrigger value="notes" className="px-3">Izohlar ({customer.notes.length})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="purchases" className="mt-3">
          <DataTable data={sales} columns={saleColumns} rowKey={(row) => row.id} defaultSort={{ key: 'date', dir: 'desc' }} emptyTitle="Xaridlar yo‘q" caption="Xaridlar tarixi" />
        </TabsContent>
        <TabsContent value="debts" className="mt-3 space-y-3">
          <DataTable
            data={debts}
            columns={[
              ...debtColumns,
              {
                key: 'pay',
                header: <span className="sr-only">To‘lov</span>,
                align: 'right',
                cell: (row) =>
                  canPay && debtRemaining(row) > 0 ? (
                    <Button size="sm" variant="outline" onClick={() => setPay({ kind: 'debt', debtId: row.id, title: customer.name, subtitle: `Chek ${row.saleNumber}`, remaining: debtRemaining(row) })}>
                      To‘lov
                    </Button>
                  ) : null,
              },
            ]}
            rowKey={(row) => row.id}
            defaultSort={{ key: 'due', dir: 'asc' }}
            emptyTitle="Qarzlar yo‘q"
            caption="Qarzdorlik tafsilotlari"
          />
        </TabsContent>
        <TabsContent value="payments" className="mt-3">
          <DataTable data={payments} columns={paymentColumns} rowKey={(row) => row.id} defaultSort={{ key: 'date', dir: 'desc' }} emptyTitle="To‘lovlar yo‘q" caption="To‘lovlar tarixi" />
        </TabsContent>
        <TabsContent value="notes" className="mt-3 space-y-3">
          {editable && (
            <div className="flex gap-2">
              <Textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={2} placeholder="Yangi izoh…" aria-label="Yangi izoh" />
              <Button onClick={addNote} disabled={!noteText.trim()} className="self-end">
                <MessageSquarePlus /> Qo‘shish
              </Button>
            </div>
          )}
          {customer.notes.length === 0 ? (
            <EmptyState title="Izohlar yo‘q" />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {customer.notes.map((note) => (
                <li key={note.id} className="px-4 py-3 text-sm">
                  <p>{note.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(note.date)}</p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <CustomerFormSheet open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <PayDebtDialog target={pay} onClose={() => setPay(null)} />
    </div>
  )
}
