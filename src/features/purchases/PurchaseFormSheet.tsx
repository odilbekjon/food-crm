import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useDb, useNow, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormSheet } from '@/components/common/FormSheet'
import { Field, MoneyInput, SimpleSelect } from '@/components/common/form'
import { LineField, LineItemsEditor } from '@/components/common/LineItemsEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { addDaysISO, toISODate } from '@/utils/date'
import { roundMoney } from '@/utils/finance'
import { formatMoney } from '@/utils/format'

interface Line {
  productId: string
  quantity?: number
  costPrice?: number
  expiryDate: string
}

interface PurchaseFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSupplierId?: string
}

export function PurchaseFormSheet({ open, onOpenChange, defaultSupplierId }: PurchaseFormSheetProps) {
  const db = useDb()
  const now = useNow()
  const run = useRun()
  const today = toISODate(now)

  const [supplierId, setSupplierId] = useState('')
  const [date, setDate] = useState(today)
  const [lines, setLines] = useState<Line[]>([])
  const [paid, setPaid] = useState<number | undefined>(undefined)
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setSupplierId(defaultSupplierId ?? '')
      setDate(toISODate(new Date()))
      setLines([])
      setPaid(undefined)
      setNote('')
      setSubmitted(false)
    }
  }, [open, defaultSupplierId])

  const products = useMemo(() => db.products.filter((product) => product.status === 'active'), [db.products])
  const total = lines.reduce((sum, line) => sum + roundMoney((line.quantity ?? 0) * (line.costPrice ?? 0)), 0)

  const lineError = (line: Line): string | undefined => {
    if (!submitted) return undefined
    const product = db.products.find((item) => item.id === line.productId)
    const unit = db.settings.units.find((item) => item.id === product?.unit)
    if (!line.quantity || line.quantity <= 0) return 'Miqdorni kiriting'
    if (!unit?.allowDecimal && !Number.isInteger(line.quantity)) return 'Faqat butun miqdor'
    if (line.costPrice === undefined || line.costPrice < 0) return 'Xarid narxini kiriting'
    return undefined
  }

  const errors: string[] = []
  if (!supplierId) errors.push('Yetkazib beruvchini tanlang')
  if (!date) errors.push('Sanani kiriting')
  if (lines.length === 0) errors.push('Kamida bitta mahsulot qo‘shing')
  if ((paid ?? 0) > total) errors.push('To‘langan summa jami summadan oshmasligi kerak')

  const validate = () => {
    setSubmitted(true)
    return errors.length === 0 && lines.every((line) => {
      const product = db.products.find((item) => item.id === line.productId)
      const unit = db.settings.units.find((item) => item.id === product?.unit)
      return !!line.quantity && line.quantity > 0 && line.costPrice !== undefined && line.costPrice >= 0 && (unit?.allowDecimal || Number.isInteger(line.quantity))
    })
  }

  const save = async (confirm: boolean) => {
    setBusy(true)
    const result = await run(
      (api) =>
        api.createPurchase({
          supplierId,
          date,
          paid: paid ?? 0,
          note,
          confirm,
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity ?? 0, costPrice: line.costPrice ?? 0, expiryDate: line.expiryDate || null })),
        }),
      confirm ? 'Xarid tasdiqlandi, mahsulotlar skladga kirim qilindi' : 'Xarid qoralama sifatida saqlandi',
    )
    setBusy(false)
    if (result.ok) onOpenChange(false)
    return result.ok
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (validate()) setConfirmOpen(true)
  }

  return (
    <>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Yangi xarid"
        description="Tasdiqlangan xarid mahsulotlarni asosiy skladga kirim qiladi"
        size="lg"
        submitLabel="Tasdiqlash"
        submitting={busy}
        onSubmit={onSubmit}
        extraActions={
          <Button type="button" variant="secondary" disabled={busy} onClick={() => validate() && void save(false)}>
            Qoralama
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Yetkazib beruvchi" required error={submitted && !supplierId ? 'Yetkazib beruvchini tanlang' : undefined}>
            {(props) => <SimpleSelect {...props} value={supplierId} onChange={setSupplierId} placeholder="Tanlang" options={db.suppliers.filter((s) => s.status === 'active').map((s) => ({ value: s.id, label: s.name }))} />}
          </Field>
          <Field label="Xarid sanasi" required error={submitted && !date ? 'Sanani kiriting' : undefined}>
            {(props) => <Input {...props} type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />}
          </Field>
        </div>
        {submitted && lines.length === 0 && <p role="alert" className="text-sm text-destructive">Kamida bitta mahsulot qo‘shing</p>}
        <LineItemsEditor
          products={products}
          lines={lines}
          onChange={setLines}
          lineError={lineError}
          createLine={(product) => ({
            productId: product.id,
            costPrice: product.costPrice,
            expiryDate: product.shelfLifeDays ? addDaysISO(now, product.shelfLifeDays) : '',
          })}
          renderControls={(line, update, product) => {
            const unit = db.settings.units.find((item) => item.id === product.unit)
            return (
              <>
                <LineField label={`Miqdor (${product.unit})`} className="block w-32 space-y-1">
                  <MoneyInput value={line.quantity} onChange={(value) => update({ quantity: value })} decimals={unit?.allowDecimal ? 3 : 0} aria-label={`${product.name} miqdori`} />
                </LineField>
                <LineField label="Xarid narxi" className="block w-36 space-y-1">
                  <MoneyInput value={line.costPrice} onChange={(value) => update({ costPrice: value })} suffix="so‘m" aria-label={`${product.name} xarid narxi`} />
                </LineField>
                <LineField label="Yaroqlilik muddati" className="block w-40 space-y-1">
                  <Input type="date" value={line.expiryDate} onChange={(event) => update({ expiryDate: event.target.value })} aria-label={`${product.name} yaroqlilik muddati`} />
                </LineField>
                <div className="ml-auto pb-1.5 text-right text-sm font-semibold tabular-nums">{formatMoney(roundMoney((line.quantity ?? 0) * (line.costPrice ?? 0)))}</div>
              </>
            )
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hozir to‘langan" error={submitted && (paid ?? 0) > total ? 'Jami summadan oshmasligi kerak' : undefined} hint="Qolgan qismi yetkazib beruvchiga qarz bo‘ladi">
            {(props) => <MoneyInput {...props} value={paid} onChange={setPaid} suffix="so‘m" placeholder="0" />}
          </Field>
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Jami summa</span><span className="font-semibold tabular-nums">{formatMoney(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Qoladigan qarz</span><span className="font-medium tabular-nums">{formatMoney(Math.max(total - (paid ?? 0), 0))}</span></div>
          </div>
        </div>
        <Field label="Izoh">{(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Ixtiyoriy" />}</Field>
      </FormSheet>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xaridni tasdiqlash"
        description={`${lines.length} xil mahsulot (${formatMoney(total)}) asosiy skladga kirim qilinadi va tannarx yangilanadi.`}
        confirmLabel="Tasdiqlash"
        onConfirm={() => save(true)}
      />
    </>
  )
}
