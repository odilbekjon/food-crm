import { ArrowLeftRight } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useDb, useNow, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormSheet } from '@/components/common/FormSheet'
import { Field, MoneyInput, SimpleSelect } from '@/components/common/form'
import { LineField, LineItemsEditor } from '@/components/common/LineItemsEditor'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { LocationId } from '@/types'
import { toISODate } from '@/utils/date'
import { formatQty } from '@/utils/format'
import { LOCATION_IDS, LOCATION_LABELS, sellableStockOf } from '@/utils/stock'

interface Line {
  productId: string
  quantity?: number
}

interface TransferFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Boshlang'ich qatorlar (masalan "Kam qolgan" tabidan) */
  initialLines?: Line[]
}

const LOCATION_OPTIONS = LOCATION_IDS.map((id) => ({ value: id, label: LOCATION_LABELS[id] }))

export function TransferFormSheet({ open, onOpenChange, initialLines }: TransferFormSheetProps) {
  const db = useDb()
  const now = useNow()
  const run = useRun()
  const today = toISODate(now)

  const [from, setFrom] = useState<LocationId>('warehouse')
  const [to, setTo] = useState<LocationId>('store')
  const [lines, setLines] = useState<Line[]>([])
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)

  useEffect(() => {
    if (open) {
      setFrom('warehouse')
      setTo('store')
      setLines(initialLines ?? [])
      setNote('')
      setSubmitted(false)
    }
  }, [open, initialLines])

  const products = useMemo(() => db.products.filter((product) => product.status === 'active'), [db.products])
  const available = (productId: string) => sellableStockOf(db.batches, productId, from, today)

  const lineError = (line: Line): string | undefined => {
    if (!submitted) return undefined
    const product = db.products.find((item) => item.id === line.productId)
    if (!line.quantity || line.quantity <= 0) return 'Miqdorni kiriting'
    if (line.quantity > available(line.productId)) return `Yetarli emas: ${LOCATION_LABELS[from]}da ${formatQty(available(line.productId), product?.unit)} bor`
    const unit = db.settings.units.find((item) => item.id === product?.unit)
    if (!unit?.allowDecimal && !Number.isInteger(line.quantity)) return 'Faqat butun miqdor kiritiladi'
    return undefined
  }

  const errors = (() => {
    if (from === to) return 'Jo‘natuvchi va qabul qiluvchi joy bir xil bo‘lmasligi kerak'
    if (lines.length === 0) return 'Kamida bitta mahsulot qo‘shing'
    return undefined
  })()

  const validate = (): boolean => {
    setSubmitted(true)
    if (errors) return false
    return lines.every((line) => {
      const product = db.products.find((item) => item.id === line.productId)
      const unit = db.settings.units.find((item) => item.id === product?.unit)
      return (
        !!line.quantity &&
        line.quantity > 0 &&
        line.quantity <= available(line.productId) &&
        (unit?.allowDecimal || Number.isInteger(line.quantity))
      )
    })
  }

  const save = async (send: boolean) => {
    setBusy(true)
    const result = await run(
      (api) =>
        api.createTransfer({
          from,
          to,
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity ?? 0 })),
          note,
          send,
        }),
      send ? 'O‘tkazma yuborildi' : 'O‘tkazma qoralama sifatida saqlandi',
    )
    setBusy(false)
    if (result.ok) onOpenChange(false)
    return result.ok
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (validate()) setConfirmSend(true)
  }

  return (
    <>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Yangi o‘tkazma"
        description="Sklad va do‘kon o‘rtasida tovar ko‘chirish. Qoldiq yuborilganda chiqadi, qabul qilinganda kiradi."
        size="md"
        submitLabel="Yuborish"
        submitting={busy}
        onSubmit={onSubmit}
        extraActions={
          <Button type="button" variant="secondary" disabled={busy} onClick={() => validate() && void save(false)}>
            Qoralama
          </Button>
        }
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Field label="Qayerdan" required>
            {(props) => <SimpleSelect {...props} value={from} onChange={(value) => setFrom(value as LocationId)} options={LOCATION_OPTIONS} />}
          </Field>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setFrom(to)
              setTo(from)
            }}
            aria-label="Joylarni almashtirish"
          >
            <ArrowLeftRight />
          </Button>
          <Field label="Qayerga" required>
            {(props) => <SimpleSelect {...props} value={to} onChange={(value) => setTo(value as LocationId)} options={LOCATION_OPTIONS} />}
          </Field>
        </div>
        {submitted && errors && <p role="alert" className="text-sm text-destructive">{errors}</p>}

        <LineItemsEditor<Line>
          products={products}
          lines={lines}
          onChange={setLines}
          createLine={(product) => ({ productId: product.id })}
          lineError={lineError}
          renderSearchMeta={(product) => <span className="tabular-nums">{formatQty(available(product.id), product.unit)}</span>}
          renderControls={(line, update, product) => {
            const unit = db.settings.units.find((item) => item.id === product.unit)
            return (
              <LineField label={`Miqdor (${product.unit})`} className="block w-40 space-y-1">
                <MoneyInput
                  value={line.quantity}
                  onChange={(value) => update({ quantity: value })}
                  decimals={unit?.allowDecimal ? 3 : 0}
                  aria-label={`${product.name} miqdori`}
                  aria-invalid={Boolean(lineError(line))}
                />
                <span className="block text-[11px] text-muted-foreground">Mavjud: {formatQty(available(product.id), product.unit)}</span>
              </LineField>
            )
          }}
        />

        <Field label="Izoh">
          {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Ixtiyoriy" />}
        </Field>
      </FormSheet>
      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title="O‘tkazmani yuborish"
        description={`${lines.length} xil mahsulot ${LOCATION_LABELS[from]}dan chiqariladi va “yo‘lda” holatiga o‘tadi. Qoldiq ${LOCATION_LABELS[to]}ga qabul qilinganda qo‘shiladi.`}
        confirmLabel="Yuborish"
        onConfirm={() => save(true)}
      />
    </>
  )
}
