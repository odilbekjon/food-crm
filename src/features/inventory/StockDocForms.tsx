import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useDb, useNow, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormSheet } from '@/components/common/FormSheet'
import { Field, MoneyInput, SimpleSelect } from '@/components/common/form'
import { LineField, LineItemsEditor } from '@/components/common/LineItemsEditor'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { LocationId } from '@/types'
import { addDaysISO, toISODate } from '@/utils/date'
import { formatQty, round3 } from '@/utils/format'
import { LOCATION_IDS, LOCATION_LABELS, stockOf } from '@/utils/stock'

const LOCATION_OPTIONS = LOCATION_IDS.map((id) => ({ value: id, label: LOCATION_LABELS[id] }))

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function useUnitDecimals() {
  const db = useDb()
  return (unitId: string) => (db.settings.units.find((unit) => unit.id === unitId)?.allowDecimal ? 3 : 0)
}

/* ----------------------------- Kirim ----------------------------- */

interface ReceiptLine {
  productId: string
  quantity?: number
  expiryDate: string
}

export function ReceiptFormSheet({ open, onOpenChange }: SheetProps) {
  const db = useDb()
  const now = useNow()
  const run = useRun()
  const decimals = useUnitDecimals()
  const [locationId, setLocationId] = useState<LocationId>('warehouse')
  const [lines, setLines] = useState<ReceiptLine[]>([])
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setLocationId('warehouse')
      setLines([])
      setNote('')
      setSubmitted(false)
    }
  }, [open])

  const products = useMemo(() => db.products.filter((product) => product.status === 'active'), [db.products])

  const lineError = (line: ReceiptLine) => {
    if (!submitted) return undefined
    if (!line.quantity || line.quantity <= 0) return 'Miqdorni kiriting'
    if (line.expiryDate && line.expiryDate < toISODate(now)) return 'Muddati o‘tgan tovarni kirim qilib bo‘lmaydi'
    return undefined
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (lines.length === 0 || lines.some((line) => !line.quantity || line.quantity <= 0 || (line.expiryDate && line.expiryDate < toISODate(now)))) return
    setBusy(true)
    const result = await run(
      (api) =>
        api.createStockReceipt({
          locationId,
          note,
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity ?? 0, expiryDate: line.expiryDate || null })),
        }),
      'Kirim qayd etildi',
    )
    setBusy(false)
    if (result.ok) onOpenChange(false)
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Qo‘lda kirim" description="Xarid hujjatisiz tovarni sklad yoki do‘konga kirim qilish" size="md" submitLabel="Kirim qilish" submitting={busy} onSubmit={onSubmit}>
      <Field label="Kirim joyi" required>
        {(props) => <SimpleSelect {...props} value={locationId} onChange={(value) => setLocationId(value as LocationId)} options={LOCATION_OPTIONS} />}
      </Field>
      {submitted && lines.length === 0 && <p role="alert" className="text-sm text-destructive">Kamida bitta mahsulot qo‘shing</p>}
      <LineItemsEditor<ReceiptLine>
        products={products}
        lines={lines}
        onChange={setLines}
        lineError={lineError}
        createLine={(product) => ({
          productId: product.id,
          expiryDate: product.shelfLifeDays ? addDaysISO(now, product.shelfLifeDays) : '',
        })}
        renderControls={(line, update, product) => (
          <>
            <LineField label={`Miqdor (${product.unit})`} className="block w-36 space-y-1">
              <MoneyInput value={line.quantity} onChange={(value) => update({ quantity: value })} decimals={decimals(product.unit)} aria-label={`${product.name} miqdori`} />
            </LineField>
            <LineField label="Yaroqlilik muddati" className="block w-44 space-y-1">
              <Input type="date" value={line.expiryDate} onChange={(event) => update({ expiryDate: event.target.value })} aria-label={`${product.name} yaroqlilik muddati`} />
            </LineField>
          </>
        )}
      />
      <Field label="Izoh">{(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Ixtiyoriy" />}</Field>
    </FormSheet>
  )
}

/* ----------------------------- Qaytarish ----------------------------- */

interface ReturnLine {
  productId: string
  quantity?: number
}

export function ReturnFormSheet({ open, onOpenChange }: SheetProps) {
  const db = useDb()
  const run = useRun()
  const decimals = useUnitDecimals()
  const [locationId, setLocationId] = useState<LocationId>('warehouse')
  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState<ReturnLine[]>([])
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (open) {
      setLocationId('warehouse')
      setSupplierId('')
      setLines([])
      setNote('')
      setSubmitted(false)
    }
  }, [open])

  const products = useMemo(() => db.products.filter((product) => product.status === 'active'), [db.products])
  const available = (productId: string) => stockOf(db.batches, productId, locationId)

  const lineError = (line: ReturnLine) => {
    if (!submitted) return undefined
    if (!line.quantity || line.quantity <= 0) return 'Miqdorni kiriting'
    if (line.quantity > available(line.productId)) return `Yetarli emas: ${formatQty(available(line.productId))} mavjud`
    return undefined
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (lines.length === 0 || lines.some((line) => !line.quantity || line.quantity <= 0 || line.quantity > available(line.productId))) return
    setConfirm(true)
  }

  const save = async () => {
    setBusy(true)
    const result = await run(
      (api) =>
        api.createStockReturn({
          locationId,
          supplierId: supplierId || null,
          note,
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity ?? 0 })),
        }),
      'Qaytarish rasmiylashtirildi',
    )
    setBusy(false)
    if (result.ok) onOpenChange(false)
    return result.ok
  }

  return (
    <>
      <FormSheet open={open} onOpenChange={onOpenChange} title="Yetkazib beruvchiga qaytarish" description="Qaytarilgan tovar joydagi qoldiqdan chiqariladi" size="md" submitLabel="Qaytarish" submitting={busy} onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Qaysi joydan" required>
            {(props) => <SimpleSelect {...props} value={locationId} onChange={(value) => { setLocationId(value as LocationId); setLines([]) }} options={LOCATION_OPTIONS} />}
          </Field>
          <Field label="Yetkazib beruvchi">
            {(props) => (
              <SimpleSelect {...props} value={supplierId} onChange={setSupplierId} placeholder="Ixtiyoriy" options={db.suppliers.filter((s) => s.status === 'active').map((s) => ({ value: s.id, label: s.name }))} />
            )}
          </Field>
        </div>
        {submitted && lines.length === 0 && <p role="alert" className="text-sm text-destructive">Kamida bitta mahsulot qo‘shing</p>}
        <LineItemsEditor<ReturnLine>
          products={products}
          lines={lines}
          onChange={setLines}
          lineError={lineError}
          createLine={(product) => ({ productId: product.id })}
          renderSearchMeta={(product) => <span className="tabular-nums">{formatQty(available(product.id), product.unit)}</span>}
          renderControls={(line, update, product) => (
            <LineField label={`Miqdor (${product.unit})`} className="block w-40 space-y-1">
              <MoneyInput value={line.quantity} onChange={(value) => update({ quantity: value })} decimals={decimals(product.unit)} aria-label={`${product.name} miqdori`} />
              <span className="block text-[11px] text-muted-foreground">Mavjud: {formatQty(available(product.id), product.unit)}</span>
            </LineField>
          )}
        />
        <Field label="Sabab / izoh">{(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Masalan: yaroqsiz, qadoq shikastlangan" />}</Field>
      </FormSheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Qaytarishni tasdiqlash"
        description={`${lines.length} xil mahsulot ${LOCATION_LABELS[locationId]}dan chiqariladi. Bu amalni bekor qilib bo‘lmaydi.`}
        confirmLabel="Qaytarish"
        destructive
        onConfirm={save}
      />
    </>
  )
}

/* ----------------------------- Inventarizatsiya ----------------------------- */

interface AuditLine {
  productId: string
  counted?: number
}

export function AuditFormSheet({ open, onOpenChange }: SheetProps) {
  const db = useDb()
  const run = useRun()
  const decimals = useUnitDecimals()
  const [locationId, setLocationId] = useState<LocationId>('store')
  const [lines, setLines] = useState<AuditLine[]>([])
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const products = useMemo(() => db.products.filter((product) => product.status === 'active'), [db.products])
  const expected = (productId: string) => stockOf(db.batches, productId, locationId)

  // Joy tanlanganda shu joyda qoldig'i bor barcha mahsulotlar sanash ro'yxatiga qo'shiladi
  useEffect(() => {
    if (!open) return
    setLines(products.filter((product) => stockOf(db.batches, product.id, locationId) > 0).map((product) => ({ productId: product.id, counted: stockOf(db.batches, product.id, locationId) })))
    setSubmitted(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, locationId])

  useEffect(() => {
    if (open) {
      setLocationId('store')
      setNote('')
    }
  }, [open])

  const changed = lines.filter((line) => line.counted !== undefined && round3(line.counted - expected(line.productId)) !== 0)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (lines.length === 0 || lines.some((line) => line.counted === undefined || line.counted < 0)) return
    setConfirm(true)
  }

  const save = async () => {
    setBusy(true)
    const result = await run(
      (api) => api.createAudit({ locationId, note, items: lines.map((line) => ({ productId: line.productId, counted: line.counted ?? 0 })) }),
      changed.length ? `Inventarizatsiya yakunlandi: ${changed.length} ta tafovut tuzatildi` : 'Inventarizatsiya yakunlandi: tafovut yo‘q',
    )
    setBusy(false)
    if (result.ok) onOpenChange(false)
    return result.ok
  }

  return (
    <>
      <FormSheet open={open} onOpenChange={onOpenChange} title="Inventarizatsiya" description="Haqiqatda sanalgan miqdorni kiriting. Tafovutlar tuzatish sifatida qoldiqqa qo‘llanadi." size="md" submitLabel="Yakunlash" submitting={busy} onSubmit={onSubmit}>
        <Field label="Joy" required>
          {(props) => <SimpleSelect {...props} value={locationId} onChange={(value) => setLocationId(value as LocationId)} options={LOCATION_OPTIONS} />}
        </Field>
        <LineItemsEditor<AuditLine>
          products={products}
          lines={lines}
          onChange={setLines}
          createLine={(product) => ({ productId: product.id, counted: expected(product.id) })}
          lineError={(line) => (submitted && (line.counted === undefined || line.counted < 0) ? 'Sanalgan miqdorni kiriting' : undefined)}
          renderControls={(line, update, product) => {
            const diff = line.counted === undefined ? 0 : round3(line.counted - expected(product.id))
            return (
              <>
                <LineField label="Tizimda" className="block w-28 space-y-1">
                  <span className="flex h-8 items-center text-sm tabular-nums">{formatQty(expected(product.id), product.unit)}</span>
                </LineField>
                <LineField label="Sanalgan" className="block w-36 space-y-1">
                  <MoneyInput value={line.counted} onChange={(value) => update({ counted: value })} decimals={decimals(product.unit)} aria-label={`${product.name} sanalgan miqdor`} />
                </LineField>
                <LineField label="Tafovut" className="block w-24 space-y-1">
                  <span className={cn('flex h-8 items-center text-sm font-medium tabular-nums', diff < 0 && 'text-red-600 dark:text-red-400', diff > 0 && 'text-emerald-600 dark:text-emerald-400')}>
                    {diff > 0 ? '+' : ''}
                    {formatQty(diff)}
                  </span>
                </LineField>
              </>
            )
          }}
        />
        <Field label="Izoh">{(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Masalan: oylik inventarizatsiya" />}</Field>
      </FormSheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Inventarizatsiyani yakunlash"
        description={changed.length ? `${changed.length} ta mahsulotda tafovut aniqlandi. Qoldiqlar sanalgan miqdorga tuzatiladi.` : 'Tafovut aniqlanmadi. Hujjat qayd etiladi.'}
        confirmLabel="Yakunlash"
        onConfirm={save}
      />
    </>
  )
}
