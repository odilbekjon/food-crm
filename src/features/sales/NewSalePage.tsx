import { isRemote } from '@/services/config'
import { ArrowLeft, Minus, Plus, Printer, ShoppingCart, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useDb, useNow, useRole, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Field, MoneyInput, SimpleSelect } from '@/components/common/form'
import { PageHeader } from '@/components/common/PageHeader'
import { ProductSearchBox } from '@/components/common/ProductSearchBox'
import { EmptyState } from '@/components/common/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CustomerFormSheet } from '@/features/customers/CustomerFormSheet'
import { canEdit } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { Product, Sale } from '@/types'
import { productSales } from '@/utils/analytics'
import { addDaysISO, rangeForPreset, toISODate } from '@/utils/date'
import { buildCustomerStats, roundMoney } from '@/utils/finance'
import { formatMoney, formatQty, round3 } from '@/utils/format'
import { sellableStockOf } from '@/utils/stock'
import { SaleReceipt } from './SaleReceipt'

interface Line {
  productId: string
  quantity: number | undefined
  unitPrice: number | undefined
}

type PayMode = 'cash' | 'card' | 'credit' | 'custom'

const PAY_MODES: Array<{ id: PayMode; label: string }> = [
  { id: 'cash', label: 'Naqd' },
  { id: 'card', label: 'Karta' },
  { id: 'credit', label: 'Nasiya' },
  { id: 'custom', label: 'Aralash' },
]

export default function NewSalePage() {
  const db = useDb()
  const now = useNow()
  const role = useRole()
  const run = useRun()
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)
  const today = toISODate(now)

  const defaultCashier = db.employees.find((e) => e.role === 'cashier' && e.status === 'active')?.id ?? db.employees[0]?.id ?? ''

  const [lines, setLines] = useState<Line[]>([])
  const [searchParams] = useSearchParams()
  const [customerId, setCustomerId] = useState(() => {
    const preset = searchParams.get('customer') ?? ''
    return db.customers.some((customer) => customer.id === preset && customer.status === 'active') ? preset : ''
  })
  const [cashierId, setCashierId] = useState(defaultCashier)
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount')
  const [discountValue, setDiscountValue] = useState<number | undefined>(undefined)
  const [payMode, setPayMode] = useState<PayMode>('cash')
  const [cashInput, setCashInput] = useState<number | undefined>(undefined)
  const [cardInput, setCardInput] = useState<number | undefined>(undefined)
  const [dueDate, setDueDate] = useState(addDaysISO(now, db.settings.defaultDebtDays))
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDebt, setConfirmDebt] = useState(false)
  const [customerFormOpen, setCustomerFormOpen] = useState(false)
  const [completed, setCompleted] = useState<Sale | null>(null)

  const products = useMemo(() => db.products.filter((product) => product.status === 'active'), [db.products])
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const available = (productId: string) => sellableStockOf(db.batches, productId, 'store', today)
  const customerStats = useMemo(() => buildCustomerStats(db), [db])

  const quick = useMemo(() => {
    const top = productSales(db, rangeForPreset('30d', now)).slice(0, 14)
    return top
      .map((row) => productMap.get(row.productId))
      .filter((product): product is Product => Boolean(product))
      .slice(0, 12)
  }, [db, now, productMap])

  /* ---------- Hisob-kitob ---------- */
  const subtotal = lines.reduce((sum, line) => sum + roundMoney((line.quantity ?? 0) * (line.unitPrice ?? 0)), 0)
  const rawDiscount =
    discountMode === 'percent' ? roundMoney((subtotal * Math.min(discountValue ?? 0, 100)) / 100) : discountValue ?? 0
  const discount = Math.min(rawDiscount, subtotal)
  const total = subtotal - discount

  const cash = payMode === 'cash' ? total : payMode === 'custom' ? cashInput ?? 0 : 0
  const card = payMode === 'card' ? total : payMode === 'custom' ? cardInput ?? 0 : 0
  const paid = cash + card
  const debt = total - paid

  /* ---------- Tekshiruvlar ---------- */
  const lineError = (line: Line): string | undefined => {
    const product = productMap.get(line.productId)
    if (!product) return 'Mahsulot topilmadi'
    if (!line.quantity || line.quantity <= 0) return 'Miqdorni kiriting'
    const unit = db.settings.units.find((item) => item.id === product.unit)
    if (!unit?.allowDecimal && !Number.isInteger(line.quantity)) return 'Faqat butun miqdor'
    if (line.quantity > available(line.productId)) return `Do‘konda ${formatQty(available(line.productId), product.unit)} bor`
    if (line.unitPrice === undefined || line.unitPrice < 0) return 'Narxni kiriting'
    return undefined
  }

  const problems: string[] = []
  if (lines.length === 0) problems.push('Savat bo‘sh')
  if (lines.some((line) => lineError(line))) problems.push('Savatdagi ba’zi qatorlarni to‘g‘rilang')
  if (rawDiscount > subtotal) problems.push('Chegirma jami summadan oshib ketdi')
  if (paid > total) problems.push('To‘lov jami summadan oshib ketdi')
  if (debt > 0 && !customerId) problems.push('Nasiya yoki qisman to‘lov uchun mijozni tanlang')
  if (debt > 0 && customerId && dueDate < today) problems.push('Nasiya muddati o‘tgan sana bo‘lmasligi kerak')

  /* ---------- Savat amallari ---------- */
  const addProduct = (product: Product) => {
    const stock = available(product.id)
    if (stock <= 0) {
      toast.error(`“${product.name}” do‘konda yo‘q. Avval skladdan o‘tkazing.`)
      return
    }
    setLines((prev) => {
      const existing = prev.find((line) => line.productId === product.id)
      if (existing) {
        const next = round3((existing.quantity ?? 0) + 1)
        return prev.map((line) => (line.productId === product.id ? { ...line, quantity: next } : line))
      }
      return [...prev, { productId: product.id, quantity: 1, unitPrice: product.salePrice }]
    })
    searchRef.current?.focus()
  }

  const updateLine = (productId: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((line) => (line.productId === productId ? { ...line, ...patch } : line)))

  const step = (product: Product, direction: 1 | -1) => {
    const line = lines.find((item) => item.productId === product.id)
    if (!line) return
    const next = round3((line.quantity ?? 0) + direction)
    if (next <= 0) setLines((prev) => prev.filter((item) => item.productId !== product.id))
    else updateLine(product.id, { quantity: next })
  }

  const reset = () => {
    setLines([])
    setCustomerId('')
    setDiscountValue(undefined)
    setPayMode('cash')
    setCashInput(undefined)
    setCardInput(undefined)
    setNote('')
    setSubmitted(false)
    setDueDate(addDaysISO(new Date(), db.settings.defaultDebtDays))
    setCompleted(null)
    searchRef.current?.focus()
  }

  /* ---------- Yakunlash ---------- */
  const checkout = () => {
    setSubmitted(true)
    if (problems.length > 0) {
      toast.error(problems[0])
      return
    }
    if (debt > 0) setConfirmDebt(true)
    else void submit()
  }

  const submit = async (): Promise<boolean> => {
    setBusy(true)
    const result = await run(
      (api) =>
        api.createSale({
          customerId: customerId || null,
          cashierId,
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity ?? 0, unitPrice: line.unitPrice ?? 0 })),
          discount,
          paidCash: cash,
          paidCard: card,
          dueDate: debt > 0 ? dueDate : null,
          note,
        }),
      'Savdo muvaffaqiyatli yakunlandi',
    )
    setBusy(false)
    if (result.ok) setCompleted(result.value)
    return result.ok
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !completed) {
        event.preventDefault()
        checkout()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!canEdit(role, 'sales')) {
    return <EmptyState title="Savdo qilish huquqi yo‘q" description="Bu rol faqat savdolarni ko‘rishi mumkin (demo)." className="py-24" />
  }

  const customer = customerId ? db.customers.find((item) => item.id === customerId) : null
  const customerDebt = customerId ? customerStats.get(customerId)?.debtTotal ?? 0 : 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yangi savdo"
        description="Shtrix-kod skaneri klaviatura kabi ishlaydi: kodni skanerlang — mahsulot savatga tushadi. Ctrl+Enter — savdoni yakunlash."
        actions={
          <Link to="/sales" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Savdolar
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Chap: qidiruv + savat */}
        <div className="space-y-3">
          <ProductSearchBox
            products={products}
            onSelect={addProduct}
            autoFocus
            inputRef={searchRef}
            isDisabled={(product) => available(product.id) <= 0}
            renderMeta={(product) => (
              <>
                <span className="block font-medium tabular-nums">{formatMoney(product.salePrice)}</span>
                <span className="block text-muted-foreground">{formatQty(available(product.id), product.unit)}</span>
              </>
            )}
          />

          {quick.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tez tanlash — ko‘p sotiladiganlar</p>
              <div className="flex flex-wrap gap-1.5">
                {quick.map((product) => (
                  <Button key={product.id} type="button" size="sm" variant="outline" onClick={() => addProduct(product)} disabled={available(product.id) <= 0}>
                    {product.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <section aria-label="Savat" className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="size-4" /> Savat ({lines.length})
              </h3>
              {lines.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setLines([])}>
                  Tozalash
                </Button>
              )}
            </div>
            {lines.length === 0 ? (
              <EmptyState title="Savat bo‘sh" description="Mahsulot nomi yoki shtrix-kodini kiriting." icon={<ShoppingCart className="size-5" />} />
            ) : (
              <ul className="divide-y">
                {lines.map((line) => {
                  const product = productMap.get(line.productId)
                  if (!product) return null
                  const error = submitted || (line.quantity ?? 0) > available(product.id) ? lineError(line) : undefined
                  const unit = db.settings.units.find((item) => item.id === product.unit)
                  return (
                    <li key={line.productId} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Do‘konda: {formatQty(available(product.id), product.unit)} · asl narx {formatMoney(product.salePrice)}
                        </p>
                        {error && <p role="alert" className="mt-0.5 text-xs text-destructive">{error}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon-sm" variant="outline" onClick={() => step(product, -1)} aria-label={`${product.name}: kamaytirish`}>
                          <Minus />
                        </Button>
                        <div className="w-24">
                          <MoneyInput
                            value={line.quantity}
                            onChange={(value) => updateLine(line.productId, { quantity: value })}
                            decimals={unit?.allowDecimal ? 3 : 0}
                            className="text-center"
                            aria-label={`${product.name} miqdori`}
                            aria-invalid={Boolean(error)}
                          />
                        </div>
                        <Button type="button" size="icon-sm" variant="outline" onClick={() => step(product, 1)} aria-label={`${product.name}: ko‘paytirish`}>
                          <Plus />
                        </Button>
                      </div>
                      <div className="w-32">
                        <MoneyInput
                          value={line.unitPrice}
                          onChange={(value) => updateLine(line.productId, { unitPrice: value })}
                          suffix="so‘m"
                          aria-label={`${product.name} narxi`}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <span className="w-28 text-right text-sm font-semibold tabular-nums">{formatMoney(roundMoney((line.quantity ?? 0) * (line.unitPrice ?? 0)))}</span>
                        <Button type="button" size="icon-sm" variant="ghost" onClick={() => setLines((prev) => prev.filter((item) => item.productId !== line.productId))} aria-label={`${product.name}ni olib tashlash`}>
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* O'ng: mijoz, chegirma, to'lov */}
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <Field label="Mijoz" hint={customer ? `Mavjud qarzi: ${formatMoney(customerDebt)}` : 'Mijozsiz savdo faqat to‘liq to‘lov bilan'}>
              {(props) => (
                <div className="flex gap-2">
                  <SimpleSelect
                    {...props}
                    value={customerId}
                    onChange={setCustomerId}
                    placeholder="Mijozsiz"
                    options={[{ value: '', label: 'Mijozsiz' }, ...db.customers.filter((c) => c.status === 'active').map((c) => ({ value: c.id, label: `${c.name} · ${c.phone}` }))]}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setCustomerFormOpen(true)} aria-label="Yangi mijoz qo‘shish">
                    <UserPlus />
                  </Button>
                </div>
              )}
            </Field>
            {/* Server rejimida sotuvchi serverda aniqlanadi (kirgan xodim), shuning uchun tanlanmaydi */}
            {!isRemote && (
              <Field label="Sotuvchi">
                {(props) => <SimpleSelect {...props} value={cashierId} onChange={setCashierId} options={db.employees.filter((e) => e.status === 'active').map((e) => ({ value: e.id, label: e.name }))} />}
              </Field>
            )}
            <Field label="Chegirma">
              {(props) => (
                <div className="flex gap-2">
                  <MoneyInput {...props} value={discountValue} onChange={setDiscountValue} decimals={discountMode === 'percent' ? 1 : 0} suffix={discountMode === 'percent' ? '%' : 'so‘m'} placeholder="0" />
                  <div role="group" aria-label="Chegirma turi" className="inline-flex shrink-0 rounded-lg bg-muted p-[3px]">
                    {(['amount', 'percent'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={discountMode === mode}
                        onClick={() => {
                          setDiscountMode(mode)
                          setDiscountValue(undefined)
                        }}
                        className={cn('rounded-md px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', discountMode === mode && 'bg-background text-foreground shadow-sm dark:bg-input/40')}
                      >
                        {mode === 'amount' ? 'so‘m' : '%'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Oraliq jami</span>
                <span className="tabular-nums">{formatMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Chegirma</span>
                  <span className="tabular-nums">− {formatMoney(discount)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-1">
                <span className="font-medium">Jami</span>
                <span className="text-2xl font-semibold tabular-nums" aria-live="polite">{formatMoney(total)}</span>
              </div>
            </div>

            <div role="group" aria-label="To‘lov turi" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-[3px]">
              {PAY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={payMode === mode.id}
                  onClick={() => {
                    setPayMode(mode.id)
                    if (mode.id === 'custom') {
                      setCashInput(total)
                      setCardInput(0)
                    }
                  }}
                  className={cn('rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', payMode === mode.id && 'bg-background text-foreground shadow-sm dark:bg-input/40')}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {payMode === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Naqd">{(props) => <MoneyInput {...props} value={cashInput} onChange={setCashInput} suffix="so‘m" />}</Field>
                <Field label="Karta">{(props) => <MoneyInput {...props} value={cardInput} onChange={setCardInput} suffix="so‘m" />}</Field>
              </div>
            )}

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">To‘lanadi</dt>
                <dd className="font-medium tabular-nums">{formatMoney(paid)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Nasiya (qarz)</dt>
                <dd className={cn('font-medium tabular-nums', debt > 0 && 'text-amber-600 dark:text-amber-400', debt < 0 && 'text-destructive')}>{formatMoney(Math.max(debt, 0))}</dd>
              </div>
            </dl>

            {debt > 0 && (
              <Field label="Qarz muddati">
                {(props) => <Input {...props} type="date" min={today} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />}
              </Field>
            )}
            {submitted && problems.length > 0 && (
              <ul role="alert" className="list-disc space-y-0.5 pl-4 text-xs text-destructive">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
            <Field label="Izoh">{(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} rows={1} placeholder="Ixtiyoriy" />}</Field>
            <Button size="lg" className="h-11 w-full text-base" disabled={busy} onClick={checkout}>
              {busy ? 'Saqlanmoqda…' : 'Savdoni yakunlash'}
            </Button>
          </section>
        </aside>
      </div>

      <CustomerFormSheet open={customerFormOpen} onOpenChange={setCustomerFormOpen} onSaved={(created) => setCustomerId(created.id)} />

      <ConfirmDialog
        open={confirmDebt}
        onOpenChange={setConfirmDebt}
        title="Nasiya savdoni tasdiqlash"
        description={`${formatMoney(debt)} ${customer?.name ?? 'mijoz'} qarziga yoziladi (muddat: ${dueDate}). To‘lanadigan qism: ${formatMoney(paid)}.`}
        confirmLabel="Tasdiqlash"
        onConfirm={submit}
      />

      <Dialog open={completed !== null} onOpenChange={(next) => !next && reset()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Savdo yakunlandi</DialogTitle>
            <DialogDescription>Qoldiq kamaytirildi{completed && completed.debtAmount > 0 ? ', nasiya mijoz qarziga yozildi' : ''}.</DialogDescription>
          </DialogHeader>
          {completed && <SaleReceipt sale={completed} />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Chop etish
            </Button>
            <Button variant="outline" onClick={() => navigate('/sales')}>
              Savdolar ro‘yxati
            </Button>
            <Button onClick={reset} autoFocus>
              Yangi savdo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
