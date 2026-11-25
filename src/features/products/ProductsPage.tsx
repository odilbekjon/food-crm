import { Archive, ArchiveRestore, Eye, FolderCog, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDb, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SearchInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { StatusBadge } from '@/components/common/StatusBadge'
import { StockCell } from '@/components/common/StockCell'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { canEdit } from '@/lib/permissions'
import type { Product } from '@/types'
import { formatMoney } from '@/utils/format'
import { ENTITY_STATUS, STOCK_STATE } from '@/utils/labels'
import { EMPTY_LEVELS, buildStockIndex, stockState } from '@/utils/stock'
import { CategoriesDialog } from './CategoriesDialog'
import { ProductFormSheet } from './ProductFormSheet'

export default function ProductsPage() {
  const db = useDb()
  const run = useRun()
  const role = useRole()
  const navigate = useNavigate()
  const editable = canEdit(role, 'products')

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('active')
  const [stock, setStock] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [archiving, setArchiving] = useState<Product | null>(null)

  const stockIndex = useMemo(() => buildStockIndex(db.batches), [db.batches])
  const categoryName = useMemo(() => new Map(db.categories.map((item) => [item.id, item.name])), [db.categories])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.products.filter((product) => {
      if (status !== 'all' && product.status !== status) return false
      if (category !== 'all' && product.categoryId !== category) return false
      if (q && !(product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q) || product.barcode.includes(q))) return false
      if (stock !== 'all') {
        const levels = stockIndex.get(product.id) ?? EMPTY_LEVELS
        if (stockState(levels.sellable, product.minStock) !== stock) return false
      }
      return true
    })
  }, [db.products, search, category, status, stock, stockIndex])

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Mahsulot',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-44">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.sku} · {row.barcode || 'shtrix-kodsiz'}
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Kategoriya', hideOnMobile: true, sortValue: (row) => categoryName.get(row.categoryId), cell: (row) => categoryName.get(row.categoryId) ?? '—' },
    { key: 'unit', header: 'Birlik', hideOnMobile: true, cell: (row) => row.unit },
    { key: 'cost', header: 'Xarid narxi', align: 'right', hideOnMobile: true, sortValue: (row) => row.costPrice, cell: (row) => <span className="tabular-nums">{formatMoney(row.costPrice)}</span> },
    { key: 'price', header: 'Sotuv narxi', align: 'right', sortValue: (row) => row.salePrice, cell: (row) => <span className="font-medium tabular-nums">{formatMoney(row.salePrice)}</span> },
    {
      key: 'stock',
      header: 'Qoldiq',
      align: 'right',
      sortValue: (row) => (stockIndex.get(row.id) ?? EMPTY_LEVELS).total,
      cell: (row) => <div className="flex justify-end"><StockCell levels={stockIndex.get(row.id) ?? EMPTY_LEVELS} unit={row.unit} /></div>,
    },
    {
      key: 'status',
      header: 'Holat',
      cell: (row) => {
        if (row.status === 'archived') return <StatusBadge status={ENTITY_STATUS.archived} />
        const levels = stockIndex.get(row.id) ?? EMPTY_LEVELS
        return <StatusBadge status={STOCK_STATE[stockState(levels.sellable, row.minStock)]} />
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label={`${row.name}: amallar`}
          actions={[
            { label: 'Tafsilotlar', icon: Eye, onClick: () => navigate(`/products/${row.id}`) },
            { label: 'Tahrirlash', icon: Pencil, hidden: !editable, onClick: () => { setEditing(row); setFormOpen(true) } },
            row.status === 'active'
              ? { label: 'Arxivlash', icon: Archive, hidden: !editable, destructive: true, separatorBefore: true, onClick: () => setArchiving(row) }
              : { label: 'Faollashtirish', icon: ArchiveRestore, hidden: !editable, separatorBefore: true, onClick: () => void run((api) => api.setProductStatus(row.id, 'active'), 'Mahsulot faollashtirildi') },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mahsulotlar"
        description={`${db.products.filter((p) => p.status === 'active').length} ta faol mahsulot, ${db.categories.length} ta kategoriya`}
        actions={
          editable && (
            <>
              <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
                <FolderCog /> Kategoriyalar
              </Button>
              <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus /> Mahsulot qo‘shish
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Nomi, SKU yoki shtrix-kod…" className="sm:w-72" />
        <SimpleSelect
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'Barcha kategoriyalar' }, ...db.categories.map((item) => ({ value: item.id, label: item.name }))]}
          className="sm:w-52"
          aria-label="Kategoriya"
        />
        <SimpleSelect
          value={status}
          onChange={setStatus}
          options={[{ value: 'active', label: 'Faol' }, { value: 'archived', label: 'Arxivlangan' }, { value: 'all', label: 'Barchasi' }]}
          className="sm:w-40"
          aria-label="Holat"
        />
        <SimpleSelect
          value={stock}
          onChange={setStock}
          options={[{ value: 'all', label: 'Barcha qoldiqlar' }, { value: 'low', label: 'Kam qolgan' }, { value: 'out', label: 'Tugagan' }, { value: 'ok', label: 'Yetarli' }]}
          className="sm:w-44"
          aria-label="Qoldiq holati"
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'name', dir: 'asc' }}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
        caption="Mahsulotlar ro‘yxati"
        emptyTitle="Mahsulot topilmadi"
        emptyDescription="Qidiruv yoki filtrlarni o‘zgartirib ko‘ring."
        emptyAction={editable ? <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus /> Mahsulot qo‘shish</Button> : undefined}
      />

      <ProductFormSheet open={formOpen} onOpenChange={setFormOpen} product={editing} />
      <CategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(next) => !next && setArchiving(null)}
        title="Mahsulotni arxivlash"
        description={`“${archiving?.name ?? ''}” arxivlanadi: yangi savdo va xaridlarda ko‘rinmaydi, lekin tarixi saqlanadi.`}
        confirmLabel="Arxivlash"
        destructive
        onConfirm={async () => {
          if (!archiving) return
          const result = await run((api) => api.setProductStatus(archiving.id, 'archived'), 'Mahsulot arxivlandi')
          return result.ok
        }}
      />
    </div>
  )
}
