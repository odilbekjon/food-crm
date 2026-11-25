import { ScanBarcode } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductSearchBoxProps {
  products: Product[]
  onSelect: (product: Product) => void
  placeholder?: string
  autoFocus?: boolean
  inputRef?: Ref<HTMLInputElement>
  /** Natija qatorining o'ng tomonidagi qo'shimcha ma'lumot (narx, qoldiq) */
  renderMeta?: (product: Product) => ReactNode
  /** Berilgan mahsulotlar tanlanmaydi (masalan allaqachon savatda) */
  isDisabled?: (product: Product) => boolean
  className?: string
}

const MAX_RESULTS = 8

/**
 * Mahsulot qidirish: nom, SKU yoki shtrix-kod bo'yicha. Shtrix-kod skaneri klaviatura kabi
 * raqamlarni kiritib `Enter` bosadi — aniq mos kelsa, mahsulot darhol tanlanadi.
 */
export function ProductSearchBox({
  products,
  onSelect,
  placeholder = 'Mahsulot nomi, SKU yoki shtrix-kod…',
  autoFocus,
  inputRef,
  renderMeta,
  isDisabled,
  className,
}: ProductSearchBoxProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = q
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(q) ||
            product.sku.toLowerCase().includes(q) ||
            product.barcode.includes(q),
        )
      : products
    return [...matches]
      .sort((a, b) => {
        const exactA = a.barcode === q || a.sku.toLowerCase() === q ? 0 : 1
        const exactB = b.barcode === q || b.sku.toLowerCase() === q ? 0 : 1
        return exactA - exactB || a.name.localeCompare(b.name, 'uz')
      })
      .slice(0, MAX_RESULTS)
  }, [products, query])

  const choose = (product: Product | undefined) => {
    if (!product || isDisabled?.(product)) return
    onSelect(product)
    setQuery('')
    setActive(0)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const q = query.trim().toLowerCase()
      // Skaner: aniq shtrix-kod/SKU mosligi bo'lsa, shuni tanlaymiz
      const exact = q ? products.find((product) => product.barcode === q || product.sku.toLowerCase() === q) : undefined
      choose(exact ?? results[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <ScanBarcode className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={inputRef}
        value={query}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder}
        className="pl-8"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Mahsulot qidirish"
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {results.length === 0 && <li className="px-2 py-3 text-center text-sm text-muted-foreground">Mahsulot topilmadi</li>}
          {results.map((product, index) => {
            const disabled = isDisabled?.(product)
            return (
              <li
                key={product.id}
                role="option"
                aria-selected={index === active}
                aria-disabled={disabled}
                // onMouseDown: input blur bo'lishidan oldin tanlash uchun
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(product)
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm',
                  index === active && 'bg-accent text-accent-foreground',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{product.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {product.sku} · {product.barcode}
                  </span>
                </span>
                {renderMeta && <span className="shrink-0 text-right text-xs">{renderMeta(product)}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
