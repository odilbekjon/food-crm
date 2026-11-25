import { ClipboardCheck, PackagePlus, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDb, useLookups, useRole } from '@/app/hooks'
import { SimpleSelect } from '@/components/common/form'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { canEdit } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { StockDoc, StockDocKind } from '@/types'
import { formatDateTime } from '@/utils/date'
import { formatQty, round3 } from '@/utils/format'
import { STOCK_DOC_KIND } from '@/utils/labels'
import { LOCATION_LABELS } from '@/utils/stock'
import { AuditFormSheet, ReceiptFormSheet, ReturnFormSheet } from './StockDocForms'

/** Kirim, qaytarish va inventarizatsiya hujjatlari. */
export function DocsTab() {
  const db = useDb()
  const role = useRole()
  const lookups = useLookups()
  const editable = canEdit(role, 'inventory')
  const [kind, setKind] = useState<'all' | StockDocKind>('all')
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [detail, setDetail] = useState<StockDoc | null>(null)

  const rows = useMemo(() => db.stockDocs.filter((doc) => kind === 'all' || doc.kind === kind), [db.stockDocs, kind])

  const columns: Column<StockDoc>[] = [
    { key: 'number', header: 'Raqam', sortValue: (row) => row.number, cell: (row) => <span className="font-medium">{row.number}</span> },
    { key: 'date', header: 'Sana', sortValue: (row) => row.date, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.date)}</span> },
    { key: 'kind', header: 'Turi', sortValue: (row) => row.kind, cell: (row) => STOCK_DOC_KIND[row.kind] },
    { key: 'loc', header: 'Joy', hideOnMobile: true, cell: (row) => LOCATION_LABELS[row.locationId] },
    { key: 'items', header: 'Pozitsiyalar', align: 'right', cell: (row) => row.items.length },
    {
      key: 'info',
      header: 'Izoh',
      hideOnMobile: true,
      cell: (row) => {
        const diffs = row.kind === 'audit' ? row.items.filter((item) => round3(item.quantity - (item.expectedQty ?? 0)) !== 0).length : null
        return (
          <span className="text-muted-foreground">
            {diffs !== null ? `Tafovut: ${diffs} ta. ` : ''}
            {row.kind === 'return' && row.supplierId ? `${lookups.suppliers.get(row.supplierId)?.name ?? ''}. ` : ''}
            {row.note}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SimpleSelect
          value={kind}
          onChange={(value) => setKind(value as typeof kind)}
          className="sm:w-48"
          aria-label="Hujjat turi"
          options={[{ value: 'all', label: 'Barcha hujjatlar' }, ...(Object.keys(STOCK_DOC_KIND) as StockDocKind[]).map((id) => ({ value: id, label: STOCK_DOC_KIND[id] }))]}
        />
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setReceiptOpen(true)}><PackagePlus /> Kirim</Button>
            <Button variant="outline" onClick={() => setReturnOpen(true)}><Undo2 /> Qaytarish</Button>
            <Button variant="outline" onClick={() => setAuditOpen(true)}><ClipboardCheck /> Inventarizatsiya</Button>
          </div>
        )}
      </div>
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'date', dir: 'desc' }}
        onRowClick={setDetail}
        caption="Ombor hujjatlari"
        emptyTitle="Hujjatlar yo‘q"
        emptyDescription="Kirim, qaytarish yoki inventarizatsiya qayd etilganda shu yerda ko‘rinadi."
      />
      <ReceiptFormSheet open={receiptOpen} onOpenChange={setReceiptOpen} />
      <ReturnFormSheet open={returnOpen} onOpenChange={setReturnOpen} />
      <AuditFormSheet open={auditOpen} onOpenChange={setAuditOpen} />

      <Dialog open={detail !== null} onOpenChange={(next) => !next && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {STOCK_DOC_KIND[detail.kind]} {detail.number}
                </DialogTitle>
                <DialogDescription>
                  {LOCATION_LABELS[detail.locationId]} · {formatDateTime(detail.date)} · {detail.createdBy}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Mahsulot</th>
                      {detail.kind === 'audit' && <th className="px-3 py-1.5 text-right font-medium">Tizimda</th>}
                      <th className="px-3 py-1.5 text-right font-medium">{detail.kind === 'audit' ? 'Sanalgan' : 'Miqdor'}</th>
                      {detail.kind === 'audit' && <th className="px-3 py-1.5 text-right font-medium">Tafovut</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.items.map((item) => {
                      const product = lookups.products.get(item.productId)
                      const diff = round3(item.quantity - (item.expectedQty ?? 0))
                      return (
                        <tr key={item.productId}>
                          <td className="px-3 py-1.5">{product?.name ?? item.productId}</td>
                          {detail.kind === 'audit' && <td className="px-3 py-1.5 text-right tabular-nums">{formatQty(item.expectedQty ?? 0, product?.unit)}</td>}
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatQty(item.quantity, product?.unit)}</td>
                          {detail.kind === 'audit' && (
                            <td className={cn('px-3 py-1.5 text-right font-medium tabular-nums', diff < 0 && 'text-red-600 dark:text-red-400', diff > 0 && 'text-emerald-600 dark:text-emerald-400')}>
                              {diff > 0 ? '+' : ''}
                              {formatQty(diff)}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {detail.note && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{detail.note}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
