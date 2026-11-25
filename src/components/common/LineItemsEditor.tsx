import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { ProductSearchBox } from '@/components/common/ProductSearchBox'
import { Button } from '@/components/ui/button'
import type { Product } from '@/types'

export interface BaseLine {
  productId: string
}

interface LineItemsEditorProps<T extends BaseLine> {
  products: Product[]
  lines: T[]
  onChange: (lines: T[]) => void
  /** Mahsulot tanlanganda yangi qator yaratadi */
  createLine: (product: Product) => T
  /** Qator boshqaruv elementlari (miqdor, narx, muddat…) */
  renderControls: (line: T, update: (patch: Partial<T>) => void, product: Product) => ReactNode
  /** Qator ostida ko'rsatiladigan xato */
  lineError?: (line: T, index: number) => string | undefined
  /** Qidiruv natijasida ko'rsatiladigan qo'shimcha ma'lumot (masalan qoldiq) */
  renderSearchMeta?: (product: Product) => ReactNode
  emptyText?: string
  /** Mahsulotni qayta qo'shish: true bo'lsa, mavjud qatorga qaytadi (default: dublikat qo'shilmaydi) */
  searchPlaceholder?: string
}

/** Mahsulot qatorlarini tahrirlash: qidirib qo'shish, o'chirish, har bir qator uchun maydonlar. */
export function LineItemsEditor<T extends BaseLine>({
  products,
  lines,
  onChange,
  createLine,
  renderControls,
  lineError,
  renderSearchMeta,
  emptyText = 'Mahsulot qo‘shish uchun yuqoridagi qidiruvdan foydalaning',
  searchPlaceholder,
}: LineItemsEditorProps<T>) {
  const productMap = new Map(products.map((product) => [product.id, product]))
  const inList = new Set(lines.map((line) => line.productId))

  return (
    <div className="space-y-3">
      <ProductSearchBox
        products={products}
        onSelect={(product) => onChange([...lines, createLine(product)])}
        isDisabled={(product) => inList.has(product.id)}
        renderMeta={renderSearchMeta}
        placeholder={searchPlaceholder}
      />
      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {lines.map((line, index) => {
            const product = productMap.get(line.productId)
            if (!product) return null
            const error = lineError?.(line, index)
            return (
              <li key={line.productId} className="space-y-1.5 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.sku} · {product.unit}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onChange(lines.filter((_, i) => i !== index))}
                    aria-label={`${product.name}ni olib tashlash`}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  {renderControls(
                    line,
                    (patch) => onChange(lines.map((item, i) => (i === index ? { ...item, ...patch } : item))),
                    product,
                  )}
                </div>
                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Qator ichidagi kichik maydon uchun label + kontrol. */
export function LineField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={className ?? 'block w-32 space-y-1'}>
      <span className="block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
