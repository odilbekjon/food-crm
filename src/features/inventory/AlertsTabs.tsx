import { ArrowLeftRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDb, useNow, useRole } from '@/app/hooks'
import { SimpleSelect } from '@/components/common/form'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { canEdit } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import { formatQty } from '@/utils/format'
import { STOCK_STATE } from '@/utils/labels'
import { LOCATION_LABELS, expiryLabel, getExpiringBatches, getLowStock, type ExpiringRow, type LowStockRow } from '@/utils/stock'
import { TransferFormSheet } from './TransferFormSheet'

/** Minimal zaxiradan oshmagan mahsulotlar; sklad qoldig'i bo'lsa, do'konga o'tkazma taklif qilinadi. */
export function LowStockTab() {
  const db = useDb()
  const role = useRole()
  const editable = canEdit(role, 'inventory')
  const rows = useMemo(() => getLowStock(db), [db])
  const [transferOpen, setTransferOpen] = useState(false)
  const [lines, setLines] = useState<Array<{ productId: string; quantity?: number }>>([])

  const suggest = (row: LowStockRow) => {
    const need = Math.max(row.product.minStock * 2 - row.levels.store, 0)
    const quantity = Math.min(row.levels.warehouse, Math.ceil(need))
    setLines([{ productId: row.product.id, quantity: quantity > 0 ? quantity : undefined }])
    setTransferOpen(true)
  }

  const columns: Column<LowStockRow>[] = [
    { key: 'name', header: 'Mahsulot', sortValue: (row) => row.product.name, cell: (row) => <Link to={`/products/${row.product.id}`} className="font-medium hover:underline">{row.product.name}</Link> },
    { key: 'wh', header: 'Sklad', align: 'right', cell: (row) => <span className="tabular-nums">{formatQty(row.levels.warehouse, row.product.unit)}</span> },
    { key: 'store', header: 'Do‘kon', align: 'right', cell: (row) => <span className="tabular-nums">{formatQty(row.levels.store, row.product.unit)}</span> },
    { key: 'total', header: 'Yaroqli jami', align: 'right', sortValue: (row) => row.levels.sellable, cell: (row) => <span className="font-medium tabular-nums">{formatQty(row.levels.sellable, row.product.unit)}</span> },
    { key: 'min', header: 'Minimal', align: 'right', hideOnMobile: true, cell: (row) => <span className="tabular-nums text-muted-foreground">{formatQty(row.product.minStock, row.product.unit)}</span> },
    { key: 'state', header: 'Holat', cell: (row) => <StatusBadge status={STOCK_STATE[row.state]} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Amal</span>,
      align: 'right',
      cell: (row) =>
        editable && row.levels.warehouse > 0 && row.levels.store <= row.product.minStock ? (
          <Button size="sm" variant="outline" onClick={() => suggest(row)}>
            <ArrowLeftRight /> Do‘konga o‘tkazish
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <DataTable data={rows} columns={columns} rowKey={(row) => row.product.id} caption="Kam qolgan mahsulotlar" emptyTitle="Kam qolgan mahsulot yo‘q" emptyDescription="Barcha mahsulotlar minimal zaxiradan yuqori." />
      <TransferFormSheet open={transferOpen} onOpenChange={setTransferOpen} initialLines={lines} />
    </>
  )
}

/** Muddati tugagan yoki tugashiga yaqin partiyalar. */
export function ExpiryTab() {
  const db = useDb()
  const now = useNow()
  const [window, setWindow] = useState('auto')
  const rows = useMemo(() => getExpiringBatches(db, now, window === 'auto' ? undefined : Number(window)), [db, now, window])

  const columns: Column<ExpiringRow>[] = [
    { key: 'name', header: 'Mahsulot', sortValue: (row) => row.product.name, cell: (row) => <Link to={`/products/${row.product.id}`} className="font-medium hover:underline">{row.product.name}</Link> },
    { key: 'batch', header: 'Partiya', hideOnMobile: true, cell: (row) => row.batch.batchNo },
    { key: 'loc', header: 'Joy', cell: (row) => LOCATION_LABELS[row.batch.locationId] },
    { key: 'qty', header: 'Miqdor', align: 'right', sortValue: (row) => row.batch.quantity, cell: (row) => <span className="tabular-nums">{formatQty(row.batch.quantity, row.product.unit)}</span> },
    { key: 'expiry', header: 'Muddati', sortValue: (row) => row.daysLeft, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.batch.expiryDate)}</span> },
    {
      key: 'left',
      header: 'Qolgan',
      sortValue: (row) => row.daysLeft,
      cell: (row) => (
        <span className={cn('whitespace-nowrap font-medium', row.daysLeft < 0 ? 'text-red-600 dark:text-red-400' : row.daysLeft <= 3 ? 'text-amber-600 dark:text-amber-400' : '')}>
          {expiryLabel(row.daysLeft)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SimpleSelect
          value={window}
          onChange={setWindow}
          className="sm:w-60"
          aria-label="Muddat oynasi"
          options={[
            { value: 'auto', label: 'Mahsulotga mos ogohlantirish' },
            { value: '7', label: '7 kun ichida' },
            { value: '14', label: '14 kun ichida' },
            { value: '30', label: '30 kun ichida' },
          ]}
        />
        <p className="text-sm text-muted-foreground">Muddati o‘tgan tovar sotilmaydi va o‘tkazilmaydi — inventarizatsiya orqali hisobdan chiqaring.</p>
      </div>
      <DataTable data={rows} columns={columns} rowKey={(row) => row.batch.id} defaultSort={{ key: 'left', dir: 'asc' }} caption="Muddati yaqin partiyalar" emptyTitle="Muddati yaqin mahsulot yo‘q" />
    </div>
  )
}
