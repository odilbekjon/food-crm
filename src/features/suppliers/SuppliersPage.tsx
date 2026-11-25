import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, ArchiveRestore, Pencil, Plus, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useDb, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormSheet } from '@/components/common/FormSheet'
import { Field, SearchInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { phoneSchema } from '@/features/customers/CustomerFormSheet'
import { canEdit } from '@/lib/permissions'
import type { Supplier } from '@/types'
import { supplierDebt } from '@/utils/finance'
import { formatMoney, formatNumber } from '@/utils/format'
import { ENTITY_STATUS } from '@/utils/labels'

const schema = z.object({
  name: z.string().trim().min(2, 'Nomi kamida 2 ta belgidan iborat bo‘lishi kerak'),
  phone: phoneSchema,
  address: z.string().trim(),
  note: z.string().trim(),
})
type FormValues = z.infer<typeof schema>

function SupplierFormSheet({ open, onOpenChange, supplier }: { open: boolean; onOpenChange: (open: boolean) => void; supplier: Supplier | null }) {
  const run = useRun()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '+998 ', address: '', note: '' } })

  useEffect(() => {
    if (open) reset(supplier ? { name: supplier.name, phone: supplier.phone, address: supplier.address, note: supplier.note } : { name: '', phone: '+998 ', address: '', note: '' })
  }, [open, supplier, reset])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    const result = await run((api) => (supplier ? api.updateSupplier(supplier.id, values) : api.createSupplier(values)), supplier ? 'Yetkazib beruvchi yangilandi' : 'Yetkazib beruvchi qo‘shildi')
    setSubmitting(false)
    if (result.ok) onOpenChange(false)
  })

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={supplier ? 'Yetkazib beruvchini tahrirlash' : 'Yangi yetkazib beruvchi'} submitting={submitting} onSubmit={onSubmit}>
      <Field label="Nomi" required error={errors.name?.message}>{(props) => <Input {...props} {...register('name')} autoFocus />}</Field>
      <Field label="Telefon" required error={errors.phone?.message}>{(props) => <Input {...props} {...register('phone')} type="tel" inputMode="tel" />}</Field>
      <Field label="Manzil" error={errors.address?.message}>{(props) => <Input {...props} {...register('address')} />}</Field>
      <Field label="Izoh" error={errors.note?.message}>{(props) => <Textarea {...props} {...register('note')} rows={3} />}</Field>
    </FormSheet>
  )
}

export default function SuppliersPage() {
  const db = useDb()
  const run = useRun()
  const role = useRole()
  const navigate = useNavigate()
  const editable = canEdit(role, 'suppliers')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [archiving, setArchiving] = useState<Supplier | null>(null)

  const purchaseCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const purchase of db.purchases) if (purchase.status === 'confirmed') map.set(purchase.supplierId, (map.get(purchase.supplierId) ?? 0) + 1)
    return map
  }, [db.purchases])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.suppliers.filter((supplier) => (status === 'all' || supplier.status === status) && (!q || `${supplier.name} ${supplier.phone}`.toLowerCase().includes(q)))
  }, [db.suppliers, search, status])

  const totalDebt = db.suppliers.reduce((sum, supplier) => sum + supplierDebt(db.purchases, supplier), 0)

  const columns: Column<Supplier>[] = [
    { key: 'name', header: 'Yetkazib beruvchi', sortValue: (row) => row.name, cell: (row) => <div className="min-w-40"><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.phone}</div></div> },
    { key: 'address', header: 'Manzil', hideOnMobile: true, cell: (row) => row.address || '—' },
    { key: 'purchases', header: 'Xaridlar', align: 'right', hideOnMobile: true, sortValue: (row) => purchaseCounts.get(row.id) ?? 0, cell: (row) => purchaseCounts.get(row.id) ?? 0 },
    {
      key: 'debt',
      header: 'Bizning qarzimiz',
      align: 'right',
      sortValue: (row) => supplierDebt(db.purchases, row),
      cell: (row) => {
        const debt = supplierDebt(db.purchases, row)
        return <span className={debt > 0 ? 'font-semibold tabular-nums text-amber-600 dark:text-amber-400' : 'tabular-nums text-muted-foreground'}>{formatMoney(debt)}</span>
      },
    },
    { key: 'note', header: 'Izoh', hideOnMobile: true, cell: (row) => <span className="text-muted-foreground">{row.note || '—'}</span> },
    { key: 'status', header: 'Holat', cell: (row) => <StatusBadge status={ENTITY_STATUS[row.status]} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      cell: (row) => (
        <RowActions
          label={`${row.name}: amallar`}
          actions={[
            { label: 'Xaridlarni ko‘rish', icon: Truck, onClick: () => navigate(`/purchases?supplier=${row.id}`) },
            { label: 'Tahrirlash', icon: Pencil, hidden: !editable, onClick: () => { setEditing(row); setFormOpen(true) } },
            row.status === 'active'
              ? { label: 'Arxivlash', icon: Archive, hidden: !editable, destructive: true, separatorBefore: true, onClick: () => setArchiving(row) }
              : { label: 'Faollashtirish', icon: ArchiveRestore, hidden: !editable, separatorBefore: true, onClick: () => void run((api) => api.setSupplierStatus(row.id, 'active'), 'Yetkazib beruvchi faollashtirildi') },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Yetkazib beruvchilar" description="Hamkorlar va ularga bo‘lgan qarzdorlik" actions={editable && <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus /> Qo‘shish</Button>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Faol yetkazib beruvchilar" value={formatNumber(db.suppliers.filter((s) => s.status === 'active').length)} tone="info" />
        <StatCard label="Jami qarzimiz" value={formatMoney(totalDebt)} hint="Tasdiqlangan xaridlar bo‘yicha to‘lanmagan qism" tone={totalDebt ? 'warning' : 'success'} />
        <StatCard label="Tasdiqlangan xaridlar" value={formatNumber(db.purchases.filter((p) => p.status === 'confirmed').length)} tone="neutral" to="/purchases" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Nomi yoki telefon…" className="sm:w-72" />
        <SimpleSelect value={status} onChange={setStatus} className="sm:w-44" aria-label="Holat" options={[{ value: 'active', label: 'Faol' }, { value: 'archived', label: 'Arxivlangan' }, { value: 'all', label: 'Barchasi' }]} />
      </div>
      <DataTable data={rows} columns={columns} rowKey={(row) => row.id} defaultSort={{ key: 'name', dir: 'asc' }} caption="Yetkazib beruvchilar" emptyTitle="Yetkazib beruvchi topilmadi" />
      <SupplierFormSheet open={formOpen} onOpenChange={setFormOpen} supplier={editing} />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(next) => !next && setArchiving(null)}
        title="Yetkazib beruvchini arxivlash"
        description={`“${archiving?.name ?? ''}” yangi xaridlarda ko‘rinmaydi; avvalgi xaridlar saqlanadi.`}
        confirmLabel="Arxivlash"
        destructive
        onConfirm={async () => {
          if (!archiving) return
          const result = await run((api) => api.setSupplierStatus(archiving.id, 'archived'), 'Yetkazib beruvchi arxivlandi')
          return result.ok
        }}
      />
    </div>
  )
}
