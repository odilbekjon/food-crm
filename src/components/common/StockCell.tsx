import { formatQty } from '@/utils/format'
import type { StockLevels } from '@/utils/stock'

/** Jami qoldiq va ostida sklad / do'kon bo'yicha taqsimot. */
export function StockCell({ levels, unit }: { levels: StockLevels; unit: string }) {
  return (
    <div className="tabular-nums">
      <div className="font-medium">{formatQty(levels.total, unit)}</div>
      <div className="text-[11px] text-muted-foreground">
        Sklad {formatQty(levels.warehouse)} · Do‘kon {formatQty(levels.store)}
      </div>
    </div>
  )
}
