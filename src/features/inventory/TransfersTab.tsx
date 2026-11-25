import { ArrowRight, Ban, CheckCheck, Eye, Plus, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDb, useLookups, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SimpleSelect } from '@/components/common/form'
import { RowActions } from '@/components/common/RowActions'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { canEdit } from '@/lib/permissions'
import type { Transfer, TransferStatus } from '@/types'
import { formatDate, formatDateTime } from '@/utils/date'
import { formatQty } from '@/utils/format'
import { TRANSFER_STATUS } from '@/utils/labels'
import { LOCATION_LABELS } from '@/utils/stock'
import { TransferFormSheet } from './TransferFormSheet'

type Action = { kind: 'send' | 'receive' | 'cancel'; transfer: Transfer }

const ACTION_TEXT = {
  send: { title: 'O‘tkazmani yuborish', confirm: 'Yuborish', done: 'O‘tkazma yuborildi', text: (t: Transfer) => `${LOCATION_LABELS[t.from]}dagi qoldiq kamayadi, tovar “yo‘lda” bo‘ladi.` },
  receive: { title: 'O‘tkazmani qabul qilish', confirm: 'Qabul qilish', done: 'O‘tkazma qabul qilindi', text: (t: Transfer) => `Tovar ${LOCATION_LABELS[t.to]}ga kirim qilinadi va qoldiq oshadi.` },
  cancel: { title: 'O‘tkazmani bekor qilish', confirm: 'Bekor qilish', done: 'O‘tkazma bekor qilindi', text: (t: Transfer) => (t.status === 'sent' ? `Yo‘ldagi tovar ${LOCATION_LABELS[t.from]}ga qaytariladi.` : 'Qoralama bekor qilinadi.') },
} as const

export function TransfersTab() {
  const db = useDb()
  const role = useRole()
  const run = useRun()
  const lookups = useLookups()
  const editable = canEdit(role, 'inventory')
  const [status, setStatus] = useState<'all' | TransferStatus>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [action, setAction] = useState<Action | null>(null)
  const [detail, setDetail] = useState<Transfer | null>(null)

  const rows = useMemo(
    () => db.transfers.filter((transfer) => status === 'all' || transfer.status === status),
    [db.transfers, status],
  )

  const columns: Column<Transfer>[] = [
    { key: 'number', header: 'Raqam', sortValue: (row) => row.number, cell: (row) => <span className="font-medium">{row.number}</span> },
    { key: 'date', header: 'Sana', sortValue: (row) => row.createdAt, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.createdAt)}</span> },
    {
      key: 'route',
      header: 'Yo‘nalish',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {LOCATION_LABELS[row.from]} <ArrowRight className="size-3.5 text-muted-foreground" /> {LOCATION_LABELS[row.to]}
        </span>
      ),
    },
    { key: 'items', header: 'Pozitsiyalar', align: 'right', hideOnMobile: true, sortValue: (row) => row.items.length, cell: (row) => row.items.length },
    { key: 'status', header: 'Holat', sortValue: (row) => row.status, cell: (row) => <StatusBadge status={TRANSFER_STATUS[row.status]} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label={`${row.number}: amallar`}
          actions={[
            { label: 'Ko‘rish', icon: Eye, onClick: () => setDetail(row) },
            { label: 'Yuborish', icon: Send, hidden: !editable || row.status !== 'draft', onClick: () => setAction({ kind: 'send', transfer: row }) },
            { label: 'Qabul qilish', icon: CheckCheck, hidden: !editable || row.status !== 'sent', onClick: () => setAction({ kind: 'receive', transfer: row }) },
            { label: 'Bekor qilish', icon: Ban, destructive: true, separatorBefore: true, hidden: !editable || (row.status !== 'draft' && row.status !== 'sent'), onClick: () => setAction({ kind: 'cancel', transfer: row }) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SimpleSelect
          value={status}
          onChange={(value) => setStatus(value as typeof status)}
          className="sm:w-48"
          aria-label="Holat"
          options={[{ value: 'all', label: 'Barcha holatlar' }, ...(Object.keys(TRANSFER_STATUS) as TransferStatus[]).map((id) => ({ value: id, label: TRANSFER_STATUS[id].label }))]}
        />
        {editable && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Yangi o‘tkazma
          </Button>
        )}
      </div>
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'date', dir: 'desc' }}
        onRowClick={setDetail}
        caption="O‘tkazmalar tarixi"
        emptyTitle="O‘tkazmalar yo‘q"
        emptyDescription="Sklad va do‘kon o‘rtasida tovar ko‘chirish uchun yangi o‘tkazma yarating."
      />

      <TransferFormSheet open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(next) => !next && setAction(null)}
        title={action ? ACTION_TEXT[action.kind].title : ''}
        description={action ? `${action.transfer.number}: ${ACTION_TEXT[action.kind].text(action.transfer)}` : undefined}
        confirmLabel={action ? ACTION_TEXT[action.kind].confirm : undefined}
        destructive={action?.kind === 'cancel'}
        onConfirm={async () => {
          if (!action) return
          const id = action.transfer.id
          const result = await run(
            (api) => (action.kind === 'send' ? api.sendTransfer(id) : action.kind === 'receive' ? api.receiveTransfer(id) : api.cancelTransfer(id)),
            ACTION_TEXT[action.kind].done,
          )
          return result.ok
        }}
      />

      <Dialog open={detail !== null} onOpenChange={(next) => !next && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  O‘tkazma {detail.number} <StatusBadge status={TRANSFER_STATUS[detail.status]} className="ml-1 align-middle" />
                </DialogTitle>
                <DialogDescription>
                  {LOCATION_LABELS[detail.from]} → {LOCATION_LABELS[detail.to]} · {formatDateTime(detail.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Mahsulot</th>
                      <th className="px-3 py-1.5 text-right font-medium">Miqdor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.items.map((item) => {
                      const product = lookups.products.get(item.productId)
                      return (
                        <tr key={item.productId}>
                          <td className="px-3 py-1.5">
                            {product?.name ?? item.productId}
                            {item.allocations.length > 0 && (
                              <span className="block text-xs text-muted-foreground">
                                Partiya: {item.allocations.map((a) => `${a.batchNo}${a.expiryDate ? ` (${formatDate(a.expiryDate)})` : ''}`).join(', ')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatQty(item.quantity, product?.unit)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <dt>Yuborilgan</dt>
                <dd className="text-right text-foreground">{formatDateTime(detail.sentAt)}</dd>
                <dt>Qabul qilingan</dt>
                <dd className="text-right text-foreground">{formatDateTime(detail.receivedAt)}</dd>
                <dt>Bekor qilingan</dt>
                <dd className="text-right text-foreground">{formatDateTime(detail.cancelledAt)}</dd>
                <dt>Mas’ul</dt>
                <dd className="text-right text-foreground">{detail.createdBy}</dd>
              </dl>
              {detail.note && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{detail.note}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
