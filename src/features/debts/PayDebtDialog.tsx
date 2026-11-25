import { useEffect, useState } from 'react'
import { useRun } from '@/app/hooks'
import { Field, MoneyInput, SimpleSelect } from '@/components/common/form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatMoney } from '@/utils/format'

export type PayTarget =
  | { kind: 'debt'; debtId: string; title: string; subtitle: string; remaining: number }
  | { kind: 'customer'; customerId: string; title: string; subtitle: string; remaining: number }

interface PayDebtDialogProps {
  target: PayTarget | null
  onClose: () => void
}

/** Qarz to'lovi: bitta qarz bo'yicha yoki mijozning umumiy qarzi bo'yicha (eng eski qarzdan boshlab). */
export function PayDebtDialog({ target, onClose }: PayDebtDialogProps) {
  const run = useRun()
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (target) {
      setAmount(target.remaining)
      setMethod('cash')
      setNote('')
      setError('')
    }
  }, [target])

  const submit = async () => {
    if (!target) return
    if (!amount || amount <= 0) {
      setError('To‘lov summasini kiriting')
      return
    }
    if (amount > target.remaining) {
      setError(`Summa qolgan qarzdan oshmasligi kerak (${formatMoney(target.remaining)})`)
      return
    }
    setError('')
    setBusy(true)
    const result = await run(
      (api) =>
        target.kind === 'debt'
          ? api.payDebt({ debtId: target.debtId, amount, method, note })
          : api.payCustomerDebts({ customerId: target.customerId, amount, method, note }),
      amount === target.remaining ? 'Qarz to‘liq to‘landi' : 'To‘lov qabul qilindi',
    )
    setBusy(false)
    if (result.ok) onClose()
  }

  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>To‘lov kiritish</DialogTitle>
          <DialogDescription>
            {target?.title} · {target?.subtitle}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          className="space-y-4"
        >
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
            Qolgan qarz: <span className="font-semibold tabular-nums">{formatMoney(target?.remaining ?? 0)}</span>
            {target?.kind === 'customer' && <span className="block text-xs text-muted-foreground">To‘lov eng eski qarzdan boshlab taqsimlanadi.</span>}
          </div>
          <Field label="To‘lov summasi" required error={error}>
            {(props) => (
              <div className="flex gap-2">
                <MoneyInput {...props} value={amount} onChange={setAmount} suffix="so‘m" />
                <Button type="button" variant="outline" onClick={() => setAmount(target?.remaining)}>
                  To‘liq
                </Button>
              </div>
            )}
          </Field>
          <Field label="To‘lov usuli">
            {(props) => <SimpleSelect {...props} value={method} onChange={(value) => setMethod(value as 'cash' | 'card')} options={[{ value: 'cash', label: 'Naqd' }, { value: 'card', label: 'Karta' }]} />}
          </Field>
          <Field label="Izoh">{(props) => <Input {...props} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ixtiyoriy" />}</Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={busy}>
              To‘lovni qabul qilish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
