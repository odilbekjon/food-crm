import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDb, useNow } from '@/app/hooks'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatMoney, formatNumber } from '@/utils/format'
import { buildStockIndex, getExpiringBatches, getLowStock } from '@/utils/stock'
import { ExpiryTab, LowStockTab } from './AlertsTabs'
import { DiscrepancyTab } from './DiscrepancyTab'
import { DocsTab } from './DocsTab'
import { StockTab } from './StockTab'
import { TransfersTab } from './TransfersTab'

const TABS = [
  { id: 'stock', label: 'Qoldiqlar' },
  { id: 'transfers', label: 'O‘tkazmalar' },
  { id: 'docs', label: 'Kirim va hujjatlar' },
  { id: 'diff', label: 'Tafovutlar' },
  { id: 'low', label: 'Kam qolgan' },
  { id: 'expiry', label: 'Muddati yaqin' },
] as const

export default function InventoryPage() {
  const db = useDb()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((item) => item.id === params.get('tab')) ? (params.get('tab') as string) : 'stock'

  const summary = useMemo(() => {
    const index = buildStockIndex(db.batches)
    const costOf = new Map(db.products.map((product) => [product.id, product.costPrice]))
    let warehouseValue = 0
    let storeValue = 0
    for (const batch of db.batches) {
      const value = batch.quantity * (costOf.get(batch.productId) ?? 0)
      if (batch.locationId === 'warehouse') warehouseValue += value
      else storeValue += value
    }
    return {
      warehouseValue,
      storeValue,
      low: getLowStock(db, index).length,
      expiring: getExpiringBatches(db, now).length,
      inTransit: db.transfers.filter((transfer) => transfer.status === 'sent').length,
    }
  }, [db, now])

  return (
    <div className="space-y-4">
      <PageHeader title="Ombor va do‘kon qoldiqlari" description="Asosiy sklad va savdo do‘koni qoldiqlari alohida yuritiladi. Qoldiq faqat tasdiqlangan harakat bilan o‘zgaradi." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Sklad qiymati" value={formatMoney(summary.warehouseValue)} hint="Tannarxda" />
        <StatCard label="Do‘kon qiymati" value={formatMoney(summary.storeValue)} hint="Tannarxda" />
        <StatCard label="Yo‘ldagi o‘tkazmalar" value={formatNumber(summary.inTransit)} hint="Qabul qilinishi kutilmoqda" tone={summary.inTransit ? 'info' : 'neutral'} />
        <StatCard label="Kam qolgan" value={formatNumber(summary.low)} tone={summary.low ? 'warning' : 'success'} />
        <StatCard label="Muddati yaqin / o‘tgan" value={formatNumber(summary.expiring)} hint="Partiyalar soni" tone={summary.expiring ? 'warning' : 'success'} />
      </div>
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: String(value) }, { replace: true })}>
        <div className="overflow-x-auto pb-1">
          <TabsList>
            {TABS.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="px-3">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="stock"><StockTab /></TabsContent>
        <TabsContent value="transfers"><TransfersTab /></TabsContent>
        <TabsContent value="docs"><DocsTab /></TabsContent>
        <TabsContent value="diff"><DiscrepancyTab /></TabsContent>
        <TabsContent value="low"><LowStockTab /></TabsContent>
        <TabsContent value="expiry"><ExpiryTab /></TabsContent>
      </Tabs>
    </div>
  )
}
