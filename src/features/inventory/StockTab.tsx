import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDb } from '@/app/hooks'
import { SearchInput, SimpleSelect } from '@/components/common/form'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import type { Product } from '@/types'
import { formatMoney, formatQty } from '@/utils/format'
import { STOCK_STATE } from '@/utils/labels'
import { EMPTY_LEVELS, buildStockIndex, stockState } from '@/utils/stock'

/** Har bir mahsulotning sklad va do'kondagi qoldig'i alohida ustunlarda. */
export function StockTab() {
  const db = useDb()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [state, setState] = useState('all')

  const index = useMemo(() => buildStockIndex(db.batches), [db.batches])
  const categoryName = useMemo(() => new Map(db.categories.map((item) => [item.id, item.name])), [db.categories])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.products.filter((product) => {
      if (product.status !== 'active') return false
      if (category !== 'all' && product.categoryId !== category) return false
      if (q && !(product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q) || product.barcode.includes(q))) return false
      if (state !== 'all' && stockState((index.get(product.id) ?? EMPTY_LEVELS).sellable, product.minStock) !== state) return false
      return true
    })
  }, [db.products, search, category, state, index])

  const totalValue = rows.reduce((sum, product) => sum + (index.get(product.id) ?? EMPTY_LEVELS).total * product.costPrice, 0)

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Mahsulot',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-40">
          <Link to={`/products/${row.id}`} className="font-medium hover:underline">{row.name}</Link>
          <div className="text-xs text-muted-foreground">{categoryName.get(row.categoryId)}</div>
        </div>
      ),
    },
    { key: 'wh', header: 'Asosiy sklad', align: 'right', sortValue: (row) => (index.get(row.id) ?? EMPTY_LEVELS).warehouse, cell: (row) => <span className="tabular-nums">{formatQty((index.get(row.id) ?? EMPTY_LEVELS).warehouse, row.unit)}</span> },
    { key: 'store', header: 'Savdo do‘koni', align: 'right', sortValue: (row) => (index.get(row.id) ?? EMPTY_LEVELS).store, cell: (row) => <span className="tabular-nums">{formatQty((index.get(row.id) ?? EMPTY_LEVELS).store, row.unit)}</span> },
    { key: 'total', header: 'Jami', align: 'right', sortValue: (row) => (index.get(row.id) ?? EMPTY_LEVELS).total, cell: (row) => <span className="font-medium tabular-nums">{formatQty((index.get(row.id) ?? EMPTY_LEVELS).total, row.unit)}</span> },
    { key: 'min', header: 'Minimal', align: 'right', hideOnMobile: true, sortValue: (row) => row.minStock, cell: (row) => <span className="tabular-nums text-muted-foreground">{formatQty(row.minStock, row.unit)}</span> },
    { key: 'value', header: 'Qiymati (tannarx)', align: 'right', hideOnMobile: true, sortValue: (row) => (index.get(row.id) ?? EMPTY_LEVELS).total * row.costPrice, cell: (row) => <span className="tabular-nums">{formatMoney((index.get(row.id) ?? EMPTY_LEVELS).total * row.costPrice)}</span> },
    {
      key: 'state',
      header: 'Holat',
      cell: (row) => {
        const levels = index.get(row.id) ?? EMPTY_LEVELS
        return (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={STOCK_STATE[stockState(levels.sellable, row.minStock)]} />
            {levels.expired > 0 && <StatusBadge status={{ label: `Muddati o‘tgan: ${formatQty(levels.expired, row.unit)}`, tone: 'danger' }} />}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Mahsulot, SKU yoki shtrix-kod…" className="sm:w-72" />
        <SimpleSelect value={category} onChange={setCategory} className="sm:w-52" aria-label="Kategoriya" options={[{ value: 'all', label: 'Barcha kategoriyalar' }, ...db.categories.map((item) => ({ value: item.id, label: item.name }))]} />
        <SimpleSelect value={state} onChange={setState} className="sm:w-44" aria-label="Holat" options={[{ value: 'all', label: 'Barcha holatlar' }, { value: 'low', label: 'Kam qolgan' }, { value: 'out', label: 'Tugagan' }, { value: 'ok', label: 'Yetarli' }]} />
      </div>
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'name', dir: 'asc' }}
        pageSize={20}
        caption="Sklad va do‘kon qoldiqlari"
        emptyTitle="Mahsulot topilmadi"
        footer={<div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">Ro‘yxatdagi qoldiqlar qiymati (tannarxda): <span className="font-medium text-foreground">{formatMoney(totalValue)}</span></div>}
      />
    </div>
  )
}
