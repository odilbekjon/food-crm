import { useDb, useLookups } from '@/app/hooks'
import type { Sale } from '@/types'
import { formatDateTime } from '@/utils/date'
import { debtRemaining, salePaymentState } from '@/utils/finance'
import { formatMoney, formatQty } from '@/utils/format'
import { SALE_PAYMENT_STATE, SALE_STATUS } from '@/utils/labels'

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between font-semibold' : 'flex justify-between'}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

/** Chek ko'rinishi. `print-area` sinfi chop etishda faqat chekni qoldiradi. */
export function SaleReceipt({ sale }: { sale: Sale }) {
  const db = useDb()
  const lookups = useLookups()
  const customer = sale.customerId ? lookups.customers.get(sale.customerId) : null
  const cashier = lookups.employees.get(sale.cashierId)
  const debt = db.debts.find((item) => item.saleId === sale.id)
  const paymentState = salePaymentState(sale, debt)
  const remaining = debt ? debtRemaining(debt) : 0

  return (
    <div className="print-area mx-auto w-full max-w-sm rounded-lg border bg-card p-4 font-mono text-xs leading-relaxed">
      <div className="text-center">
        <p className="text-sm font-semibold">{db.settings.storeName}</p>
        <p>{db.settings.storeAddress}</p>
        <p>{db.settings.storePhone}</p>
      </div>
      <div className="my-2 border-t border-dashed" />
      <Row label="Chek №" value={sale.number} />
      <Row label="Sana" value={formatDateTime(sale.date)} />
      <Row label="Sotuvchi" value={cashier?.name ?? '—'} />
      <Row label="Mijoz" value={customer?.name ?? 'Mijozsiz'} />
      <div className="my-2 border-t border-dashed" />
      <ul className="space-y-1.5">
        {sale.items.map((item) => (
          <li key={item.productId}>
            <p>{item.name}</p>
            <div className="flex justify-between text-muted-foreground">
              <span>
                {formatQty(item.quantity, item.unit)} × {formatMoney(item.unitPrice)}
              </span>
              <span className="tabular-nums text-foreground">{formatMoney(item.total)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="my-2 border-t border-dashed" />
      <Row label="Oraliq jami" value={formatMoney(sale.subtotal)} />
      {sale.discount > 0 && <Row label="Chegirma" value={`− ${formatMoney(sale.discount)}`} />}
      <Row label="JAMI" value={formatMoney(sale.total)} strong />
      <div className="my-2 border-t border-dashed" />
      {sale.paidCash > 0 && <Row label="Naqd" value={formatMoney(sale.paidCash)} />}
      {sale.paidCard > 0 && <Row label="Karta" value={formatMoney(sale.paidCard)} />}
      {sale.debtAmount > 0 && <Row label="Nasiya" value={formatMoney(sale.debtAmount)} />}
      {sale.debtAmount > 0 && <Row label="Qolgan qarz" value={formatMoney(remaining)} />}
      <div className="my-2 border-t border-dashed" />
      <p className="text-center">
        {SALE_STATUS[sale.status].label} · {SALE_PAYMENT_STATE[paymentState].label}
      </p>
      {sale.status !== 'completed' && sale.cancelReason && <p className="mt-1 text-center text-muted-foreground">Sabab: {sale.cancelReason}</p>}
      <p className="mt-2 text-center text-muted-foreground">Xaridingiz uchun rahmat!</p>
    </div>
  )
}
