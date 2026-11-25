import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDb } from '@/app/hooks'
import { SimpleSelect } from '@/components/common/form'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { cn } from '@/lib/utils'
import { formatMoney, formatQty, round3 } from '@/utils/format'
import { formatDateTime } from '@/utils/date'
import { LOCATION_LABELS } from '@/utils/stock'
import type { LocationId } from '@/types'

interface Row {
  id: string
  date: string
  docNumber: string
  locationId: LocationId
  productId: string
  name: string
  unit: string
  expected: number
  counted: number
  diff: number
  value: number
}

/** Inventarizatsiyada aniqlangan qoldiq tafovutlari (kam chiqqan / ortiqcha). */
export function DiscrepancyTab() {
  const db = useDb()
  const [location, setLocation] = useState('all')

  const rows = useMemo<Row[]>(() => {
    const products = new Map(db.products.map((product) => [product.id, product]))
    const result: Row[] = []
    for (const doc of db.stockDocs) {
      if (doc.kind !== 'audit') continue
      for (const item of doc.items) {
        const diff = round3(item.quantity - (item.expectedQty ?? 0))
        const product = products.get(item.productId)
        if (diff === 0 || !product) continue
        result.push({
          id: `${doc.id}-${item.productId}`,
          date: doc.date,
          docNumber: doc.number,
          locationId: doc.locationId,
          productId: product.id,
          name: product.name,
          unit: product.unit,
          expected: item.expectedQty ?? 0,
          counted: item.quantity,
          diff,
          value: diff * product.costPrice,
        })
      }
    }
    return result.filter((row) => location === 'all' || row.locationId === location)
  }, [db.stockDocs, db.products, location])

  const loss = rows.filter((row) => row.value < 0).reduce((sum, row) => sum + row.value, 0)
  const surplus = rows.filter((row) => row.value > 0).reduce((sum, row) => sum + row.value, 0)

  const columns: Column<Row>[] = [
    { key: 'date', header: 'Sana', sortValue: (row) => row.date, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.date)}</span> },
    { key: 'product', header: 'Mahsulot', sortValue: (row) => row.name, cell: (row) => <Link to={`/products/${row.productId}`} className="font-medium hover:underline">{row.name}</Link> },
    { key: 'loc', header: 'Joy', hideOnMobile: true, cell: (row) => LOCATION_LABELS[row.locationId] },
    { key: 'expected', header: 'Tizimda', align: 'right', cell: (row) => <span className="tabular-nums">{formatQty(row.expected, row.unit)}</span> },
    { key: 'counted', header: 'Sanalgan', align: 'right', cell: (row) => <span className="tabular-nums">{formatQty(row.counted, row.unit)}</span> },
    {
      key: 'diff',
      header: 'Tafovut',
      align: 'right',
      sortValue: (row) => row.diff,
      cell: (row) => (
        <span className={cn('font-medium tabular-nums', row.diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
          {row.diff > 0 ? '+' : ''}
          {formatQty(row.diff, row.unit)}
        </span>
      ),
    },
    { key: 'value', header: 'Qiymati', align: 'right', sortValue: (row) => row.value, cell: (row) => <span className="tabular-nums">{formatMoney(row.value)}</span> },
    { key: 'doc', header: 'Hujjat', hideOnMobile: true, cell: (row) => row.docNumber },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SimpleSelect
          value={location}
          onChange={setLocation}
          className="sm:w-48"
          aria-label="Joy"
          options={[{ value: 'all', label: 'Barcha joylar' }, { value: 'warehouse', label: LOCATION_LABELS.warehouse }, { value: 'store', label: LOCATION_LABELS.store }]}
        />
        <p className="text-sm text-muted-foreground">
          Kamomad: <span className="font-medium text-red-600 dark:text-red-400">{formatMoney(loss)}</span> · Ortiqcha: <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatMoney(surplus)}</span>
        </p>
      </div>
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'date', dir: 'desc' }}
        caption="Qoldiq tafovutlari"
        emptyTitle="Tafovutlar yo‘q"
        emptyDescription="Inventarizatsiyada sanalgan va tizimdagi miqdor farq qilganda shu yerda ko‘rinadi."
      />
    </div>
  )
}
