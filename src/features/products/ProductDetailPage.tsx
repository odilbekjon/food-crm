import { ArrowLeft, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDb, useNow, useRole } from '@/app/hooks'
import { EmptyState } from '@/components/common/states'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { canEdit } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { StockBatch, StockMovement } from '@/types'
import { diffInDays, formatDate, formatDateTime, rangeForPreset } from '@/utils/date'
import { formatMoney, formatQty } from '@/utils/format'
import { ENTITY_STATUS, MOVEMENT_TYPE, STOCK_STATE } from '@/utils/labels'
import { EMPTY_LEVELS, LOCATION_LABELS, buildStockIndex, expiryLabel, expiryWarningDays, stockState } from '@/utils/stock'
import { productSales } from '@/utils/analytics'
import { ProductFormSheet } from './ProductFormSheet'

export default function ProductDetailPage() {
  const { productId } = useParams()
  const db = useDb()
  const now = useNow()
  const role = useRole()
  const [editOpen, setEditOpen] = useState(false)

  const product = db.products.find((item) => item.id === productId)
  const levels = useMemo(() => (product ? buildStockIndex(db.batches).get(product.id) ?? EMPTY_LEVELS : EMPTY_LEVELS), [db.batches, product])
  const batches = useMemo(
    () =>
      db.batches
        .filter((batch) => batch.productId === productId)
        .sort((a, b) => (a.expiryDate ?? '9999') < (b.expiryDate ?? '9999') ? -1 : 1),
    [db.batches, productId],
  )
  const movements = useMemo(
    () => db.movements.filter((movement) => movement.productId === productId).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [db.movements, productId],
  )
  const monthSales = useMemo(
    () => productSales(db, rangeForPreset('30d', now)).find((row) => row.productId === productId),
    [db, now, productId],
  )

  if (!product) {
    return (
      <EmptyState
        title="Mahsulot topilmadi"
        action={<Link to="/products" className={buttonVariants({ variant: 'outline' })}>Mahsulotlarga qaytish</Link>}
        className="py-24"
      />
    )
  }

  const category = db.categories.find((item) => item.id === product.categoryId)?.name ?? '—'
  const state = stockState(levels.sellable, product.minStock)
  const margin = product.salePrice > 0 ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100) : 0

  const batchColumns: Column<StockBatch>[] = [
    { key: 'batch', header: 'Partiya', cell: (row) => <span className="font-medium">{row.batchNo}</span> },
    { key: 'loc', header: 'Joy', cell: (row) => LOCATION_LABELS[row.locationId] },
    { key: 'qty', header: 'Miqdor', align: 'right', sortValue: (row) => row.quantity, cell: (row) => <span className="tabular-nums">{formatQty(row.quantity, product.unit)}</span> },
    { key: 'received', header: 'Kelgan sana', hideOnMobile: true, sortValue: (row) => row.receivedAt, cell: (row) => formatDate(row.receivedAt) },
    {
      key: 'expiry',
      header: 'Yaroqlilik muddati',
      sortValue: (row) => row.expiryDate,
      cell: (row) => {
        if (!row.expiryDate) return <span className="text-muted-foreground">Muddatsiz</span>
        const left = diffInDays(row.expiryDate, now)
        const warn = left <= expiryWarningDays(product)
        return (
          <div>
            <div className="tabular-nums">{formatDate(row.expiryDate)}</div>
            <div className={cn('text-xs', left < 0 ? 'text-red-600 dark:text-red-400' : warn ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{expiryLabel(left)}</div>
          </div>
        )
      },
    },
  ]

  const movementColumns: Column<StockMovement>[] = [
    { key: 'date', header: 'Sana', sortValue: (row) => row.date, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.date)}</span> },
    { key: 'type', header: 'Amal', cell: (row) => MOVEMENT_TYPE[row.type] },
    { key: 'loc', header: 'Joy', hideOnMobile: true, cell: (row) => LOCATION_LABELS[row.locationId] },
    {
      key: 'qty',
      header: 'Miqdor',
      align: 'right',
      sortValue: (row) => row.quantity,
      cell: (row) => (
        <span className={cn('font-medium tabular-nums', row.quantity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
          {row.quantity > 0 ? '+' : ''}
          {formatQty(row.quantity, product.unit)}
        </span>
      ),
    },
    { key: 'ref', header: 'Hujjat', hideOnMobile: true, cell: (row) => row.refNumber },
    { key: 'note', header: 'Izoh', hideOnMobile: true, cell: (row) => <span className="text-muted-foreground">{row.note || '—'}</span> },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title={product.name}
        description={`${category} · ${product.sku} · ${product.barcode || 'shtrix-kodsiz'}`}
        actions={
          <>
            <Link to="/products" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft /> Ro‘yxat
            </Link>
            {canEdit(role, 'products') && (
              <Button onClick={() => setEditOpen(true)}>
                <Pencil /> Tahrirlash
              </Button>
            )}
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={product.status === 'archived' ? ENTITY_STATUS.archived : STOCK_STATE[state]} />
        {levels.expired > 0 && <StatusBadge status={{ label: `Muddati o‘tgan: ${formatQty(levels.expired, product.unit)}`, tone: 'danger' }} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami qoldiq" value={formatQty(levels.total, product.unit)} hint={`Minimal zaxira: ${formatQty(product.minStock, product.unit)}`} tone={state === 'ok' ? 'success' : 'warning'} />
        <StatCard label="Asosiy sklad" value={formatQty(levels.warehouse, product.unit)} tone="neutral" />
        <StatCard label="Savdo do‘koni" value={formatQty(levels.store, product.unit)} tone="neutral" />
        <StatCard label="Sotuv / xarid narxi" value={formatMoney(product.salePrice)} hint={`Xarid: ${formatMoney(product.costPrice)} · marja ${margin}%`} tone="info" />
      </div>
      <p className="text-sm text-muted-foreground">
        So‘nggi 30 kunda sotilgan:{' '}
        <span className="font-medium text-foreground">
          {formatQty(monthSales?.quantity ?? 0, product.unit)} ({formatMoney(monthSales?.amount ?? 0)})
        </span>
        {monthSales ? ` · yalpi foyda ${formatMoney(monthSales.profit)}` : ''}
      </p>

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">Partiyalar va muddat</TabsTrigger>
          <TabsTrigger value="movements">Harakatlar tarixi ({movements.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="batches" className="mt-3">
          <DataTable data={batches} columns={batchColumns} rowKey={(row) => row.id} emptyTitle="Qoldiq yo‘q" emptyDescription="Mahsulot hozir hech bir joyda mavjud emas." caption="Partiyalar" />
        </TabsContent>
        <TabsContent value="movements" className="mt-3">
          <DataTable data={movements} columns={movementColumns} rowKey={(row) => row.id} defaultSort={{ key: 'date', dir: 'desc' }} emptyTitle="Harakatlar yo‘q" caption="Harakatlar tarixi" />
        </TabsContent>
      </Tabs>

      <ProductFormSheet open={editOpen} onOpenChange={setEditOpen} product={product} />
    </div>
  )
}
