import { Ban, Banknote, CheckCheck, Eye, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDb, useLookups, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Field, MoneyInput, SearchInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { canEdit } from '@/lib/permissions'
import type { Purchase, PurchaseStatus } from '@/types'
import { formatDate, formatDateTime } from '@/utils/date'
import { purchasePaid, purchaseRemaining } from '@/utils/finance'
import { formatMoney, formatNumber, formatQty } from '@/utils/format'
import { PURCHASE_STATUS } from '@/utils/labels'
import { PurchaseFormSheet } from './PurchaseFormSheet'

export default function PurchasesPage() {
  const db = useDb()
  const role = useRole()
  const run = useRun()
  const lookups = useLookups()
  const [params] = useSearchParams()
  const editable = canEdit(role, 'purchases')

  const [search, setSearch] = useState('')
  const [supplier, setSupplier] = useState(params.get('supplier') ?? 'all')
  const [status, setStatus] = useState<'all' | PurchaseStatus>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Purchase | null>(null)
  const [cancelling, setCancelling] = useState<Purchase | null>(null)
  const [paying, setPaying] = useState<Purchase | null>(null)
  const [payAmount, setPayAmount] = useState<number | undefined>(undefined)
  const [payNote, setPayNote] = useState('')
  const [payError, setPayError] = useState('')

  useEffect(() => {
    if (paying) {
      setPayAmount(purchaseRemaining(paying))
      setPayNote('')
      setPayError('')
    }
  }, [paying])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.purchases.filter((purchase) => {
      if (supplier !== 'all' && purchase.supplierId !== supplier) return false
      if (status !== 'all' && purchase.status !== status) return false
      if (q && !`${purchase.number} ${lookups.suppliers.get(purchase.supplierId)?.name ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [db.purchases, search, supplier, status, lookups.suppliers])

  const confirmed = db.purchases.filter((purchase) => purchase.status === 'confirmed')
  const totalAmount = confirmed.reduce((sum, purchase) => sum + purchase.total, 0)
  const totalDebt = confirmed.reduce((sum, purchase) => sum + purchaseRemaining(purchase), 0)
  const detail = detailId ? db.purchases.find((purchase) => purchase.id === detailId) ?? null : null

  const columns: Column<Purchase>[] = [
    { key: 'number', header: 'Raqam', sortValue: (row) => row.number, cell: (row) => <span className="font-medium">{row.number}</span> },
    { key: 'date', header: 'Sana', sortValue: (row) => row.date, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.date)}</span> },
    { key: 'supplier', header: 'Yetkazib beruvchi', sortValue: (row) => lookups.suppliers.get(row.supplierId)?.name, cell: (row) => lookups.suppliers.get(row.supplierId)?.name ?? '—' },
    { key: 'items', header: 'Pozitsiyalar', align: 'right', hideOnMobile: true, cell: (row) => row.items.length },
    { key: 'total', header: 'Jami', align: 'right', sortValue: (row) => row.total, cell: (row) => <span className="font-medium tabular-nums">{formatMoney(row.total)}</span> },
    { key: 'paid', header: 'To‘langan', align: 'right', hideOnMobile: true, sortValue: (row) => purchasePaid(row), cell: (row) => <span className="tabular-nums">{formatMoney(purchasePaid(row))}</span> },
    {
      key: 'rest',
      header: 'Qolgan',
      align: 'right',
      sortValue: (row) => purchaseRemaining(row),
      cell: (row) => <span className={purchaseRemaining(row) > 0 ? 'font-medium tabular-nums text-amber-600 dark:text-amber-400' : 'tabular-nums text-muted-foreground'}>{formatMoney(purchaseRemaining(row))}</span>,
    },
    { key: 'status', header: 'Holat', cell: (row) => <StatusBadge status={PURCHASE_STATUS[row.status]} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label={`${row.number}: amallar`}
          actions={[
            { label: 'Ko‘rish', icon: Eye, onClick: () => setDetailId(row.id) },
            { label: 'Tasdiqlash va kirim qilish', icon: CheckCheck, hidden: !editable || row.status !== 'draft', onClick: () => setConfirming(row) },
            { label: 'To‘lov kiritish', icon: Banknote, hidden: !editable || purchaseRemaining(row) <= 0, onClick: () => setPaying(row) },
            { label: 'Bekor qilish', icon: Ban, destructive: true, separatorBefore: true, hidden: !editable || row.status !== 'draft', onClick: () => setCancelling(row) },
          ]}
        />
      ),
    },
  ]

  const submitPayment = async () => {
    if (!paying) return false
    if (!payAmount || payAmount <= 0) {
      setPayError('To‘lov summasini kiriting')
      return false
    }
    if (payAmount > purchaseRemaining(paying)) {
      setPayError(`Qolgan qarzdan oshmasligi kerak (${formatMoney(purchaseRemaining(paying))})`)
      return false
    }
    const result = await run((api) => api.paySupplier(paying.id, payAmount, payNote), 'To‘lov qayd etildi')
    return result.ok
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Xaridlar" description="Yetkazib beruvchilardan kirim hujjatlari va ular bilan hisob-kitob" actions={editable && <Button onClick={() => setFormOpen(true)}><Plus /> Yangi xarid</Button>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Tasdiqlangan xaridlar" value={formatNumber(confirmed.length)} tone="info" />
        <StatCard label="Xaridlar summasi" value={formatMoney(totalAmount)} tone="success" />
        <StatCard label="Yetkazib beruvchilarga qarz" value={formatMoney(totalDebt)} tone={totalDebt ? 'warning' : 'success'} to="/suppliers" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Raqam yoki yetkazib beruvchi…" className="sm:w-72" />
        <SimpleSelect value={supplier} onChange={setSupplier} className="sm:w-56" aria-label="Yetkazib beruvchi" options={[{ value: 'all', label: 'Barcha yetkazib beruvchilar' }, ...db.suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
        <SimpleSelect value={status} onChange={(value) => setStatus(value as typeof status)} className="sm:w-44" aria-label="Holat" options={[{ value: 'all', label: 'Barcha holatlar' }, ...(Object.keys(PURCHASE_STATUS) as PurchaseStatus[]).map((id) => ({ value: id, label: PURCHASE_STATUS[id].label }))]} />
      </div>
      <DataTable data={rows} columns={columns} rowKey={(row) => row.id} defaultSort={{ key: 'date', dir: 'desc' }} onRowClick={(row) => setDetailId(row.id)} caption="Xaridlar" emptyTitle="Xarid topilmadi" emptyDescription="Yangi xarid yarating yoki filtrlarni o‘zgartiring." />

      <PurchaseFormSheet open={formOpen} onOpenChange={setFormOpen} defaultSupplierId={supplier !== 'all' ? supplier : undefined} />

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(next) => !next && setConfirming(null)}
        title="Xaridni tasdiqlash"
        description={`${confirming?.number}: ${confirming?.items.length} xil mahsulot asosiy skladga kirim qilinadi va tannarx yangilanadi.`}
        confirmLabel="Tasdiqlash"
        onConfirm={async () => {
          if (!confirming) return
          const result = await run((api) => api.confirmPurchase(confirming.id), 'Xarid tasdiqlandi, kirim qilindi')
          return result.ok
        }}
      />
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(next) => !next && setCancelling(null)}
        title="Xaridni bekor qilish"
        description={`${cancelling?.number} qoralamasi bekor qilinadi. Qoldiqqa ta’sir qilmaydi.`}
        confirmLabel="Bekor qilish"
        destructive
        onConfirm={async () => {
          if (!cancelling) return
          const result = await run((api) => api.cancelPurchase(cancelling.id), 'Xarid bekor qilindi')
          return result.ok
        }}
      />

      <Dialog open={paying !== null} onOpenChange={(next) => !next && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yetkazib beruvchiga to‘lov</DialogTitle>
            <DialogDescription>{paying && `${paying.number} · ${lookups.suppliers.get(paying.supplierId)?.name} · qolgan ${formatMoney(purchaseRemaining(paying))}`}</DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (await submitPayment()) setPaying(null)
            }}
          >
            <Field label="Summa" required error={payError}>
              {(props) => (
                <div className="flex gap-2">
                  <MoneyInput {...props} value={payAmount} onChange={setPayAmount} suffix="so‘m" />
                  <Button type="button" variant="outline" onClick={() => paying && setPayAmount(purchaseRemaining(paying))}>To‘liq</Button>
                </div>
              )}
            </Field>
            <Field label="Izoh">{(props) => <Input {...props} value={payNote} onChange={(event) => setPayNote(event.target.value)} placeholder="Ixtiyoriy" />}</Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>Bekor qilish</Button>
              <Button type="submit">To‘lovni qayd etish</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detail !== null} onOpenChange={(next) => !next && setDetailId(null)}>
        <DialogContent className="sm:max-w-xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Xarid {detail.number} <StatusBadge status={PURCHASE_STATUS[detail.status]} className="ml-1 align-middle" />
                </DialogTitle>
                <DialogDescription>
                  {lookups.suppliers.get(detail.supplierId)?.name} · {formatDate(detail.date)}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Mahsulot</th>
                      <th className="px-3 py-1.5 text-right font-medium">Miqdor</th>
                      <th className="px-3 py-1.5 text-right font-medium">Narx</th>
                      <th className="px-3 py-1.5 text-right font-medium">Summa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.items.map((item) => {
                      const product = lookups.products.get(item.productId)
                      return (
                        <tr key={item.productId}>
                          <td className="px-3 py-1.5">
                            {product?.name}
                            {item.expiryDate && <span className="block text-xs text-muted-foreground">Muddati: {formatDate(item.expiryDate)}</span>}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatQty(item.quantity, product?.unit)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(item.costPrice)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(item.quantity * item.costPrice)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Jami</dt><dd className="font-semibold tabular-nums">{formatMoney(detail.total)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">To‘langan</dt><dd className="font-medium tabular-nums">{formatMoney(purchasePaid(detail))}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Qolgan</dt><dd className="font-medium tabular-nums">{formatMoney(detail.status === 'confirmed' ? purchaseRemaining(detail) : detail.total - purchasePaid(detail))}</dd></div>
              </dl>
              {detail.payments.length > 0 && (
                <ul className="divide-y rounded-lg border text-sm">
                  {detail.payments.map((payment) => (
                    <li key={payment.id} className="flex justify-between px-3 py-1.5">
                      <span>{formatDateTime(payment.date)}{payment.note ? ` · ${payment.note}` : ''}</span>
                      <span className="tabular-nums">{formatMoney(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {detail.note && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{detail.note}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
