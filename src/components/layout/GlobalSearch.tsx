import { Package, Receipt, Search, User } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDb, useRole } from '@/app/hooks'
import { Input } from '@/components/ui/input'
import { canView } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/utils/format'

interface Hit {
  id: string
  group: 'Mahsulotlar' | 'Mijozlar' | 'Savdolar'
  title: string
  subtitle: string
  href: string
}

const ICONS = { Mahsulotlar: Package, Mijozlar: User, Savdolar: Receipt } as const
const LIMIT = 4

/** Global qidiruv: mahsulot, mijoz (telefon bo'yicha ham) va chek raqami bo'yicha. */
export function GlobalSearch({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const db = useDb()
  const role = useRole()
  const navigate = useNavigate()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  // "/" tugmasi qidiruvga o'tkazadi
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const digits = q.replace(/\D/g, '')
    const result: Hit[] = []
    if (canView(role, 'products')) {
      db.products
        .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q))
        .slice(0, LIMIT)
        .forEach((p) =>
          result.push({ id: p.id, group: 'Mahsulotlar', title: p.name, subtitle: `${p.sku} · ${formatMoney(p.salePrice)}`, href: `/products/${p.id}` }),
        )
    }
    if (canView(role, 'customers')) {
      db.customers
        .filter((c) => c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)))
        .slice(0, LIMIT)
        .forEach((c) => result.push({ id: c.id, group: 'Mijozlar', title: c.name, subtitle: c.phone, href: `/customers/${c.id}` }))
    }
    if (canView(role, 'sales')) {
      db.sales
        .filter((s) => s.number.toLowerCase().includes(q))
        .slice(-LIMIT)
        .reverse()
        .forEach((s) =>
          result.push({ id: s.id, group: 'Savdolar', title: s.number, subtitle: formatMoney(s.total), href: `/sales?q=${encodeURIComponent(s.number)}` }),
        )
    }
    return result
  }, [db, query, role])

  const go = (hit: Hit | undefined) => {
    if (!hit) return
    navigate(hit.href)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, hits.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(hits[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showList = open && query.trim().length >= 2

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={inputRef}
        value={query}
        autoFocus={autoFocus}
        placeholder="Qidirish: mahsulot, mijoz, chek…  ( / )"
        className="pl-8"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-label="Global qidiruv"
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-96 w-full min-w-72 overflow-y-auto rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10"
        >
          {hits.length === 0 && <li className="px-2 py-3 text-center text-sm text-muted-foreground">Hech narsa topilmadi</li>}
          {hits.map((hit, index) => {
            const Icon = ICONS[hit.group]
            const newGroup = index === 0 || hits[index - 1].group !== hit.group
            return (
              <li key={`${hit.group}-${hit.id}`} role="presentation">
                {newGroup && <p className="px-2 pt-1.5 pb-0.5 text-[11px] font-medium uppercase text-muted-foreground">{hit.group}</p>}
                <div
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    go(hit)
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={cn('flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm', index === active && 'bg-accent')}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{hit.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
