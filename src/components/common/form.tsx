import { Search, X } from 'lucide-react'
import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format'

/* ----------------------------- Field ----------------------------- */

interface FieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  /** `id` ni bolaga berish uchun render funksiyasi */
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}

/** Label + xato xabari bilan forma maydoni (a11y bog'lanishlari bilan). */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/* ----------------------------- SimpleSelect ----------------------------- */

export interface Option {
  value: string
  label: string
}

interface SimpleSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-label'?: string
  size?: 'sm' | 'default'
}

export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = 'Tanlang',
  className,
  disabled,
  size,
  ...rest
}: SimpleSelectProps) {
  return (
    <Select
      items={options}
      value={value === '' ? null : value}
      onValueChange={(next) => onChange(next ?? '')}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-full', className)} size={size} {...rest}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/* ----------------------------- SearchInput ----------------------------- */

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  'aria-label'?: string
}

export function SearchInput({ value, onChange, placeholder = 'Qidirish…', className, ...rest }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
        aria-label={rest['aria-label'] ?? placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Qidiruvni tozalash"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/* ----------------------------- MoneyInput ----------------------------- */

interface MoneyInputProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Kasr qismga ruxsat (kg, litr miqdorlari uchun) */
  decimals?: number
  suffix?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-label'?: string
  onFocus?: () => void
}

/** Minglik ajratgichli son kiritish maydoni (1 234 567). */
export function MoneyInput({ value, onChange, decimals = 0, suffix, className, onFocus, ...rest }: MoneyInputProps) {
  const [text, setText] = useState(() => (value === undefined ? '' : formatNumber(value, decimals)))

  // Tashqaridan qiymat o'zgarganda (masalan form reset) matnni sinxronlaymiz
  useEffect(() => {
    const parsed = parse(text, decimals)
    if (parsed !== value) setText(value === undefined ? '' : formatNumber(value, decimals))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    const parsed = parse(raw, decimals)
    const cleaned = raw.replace(/[^\d.,]/g, '')
    if (parsed === undefined) {
      setText('')
    } else {
      const hasSeparator = /[.,]/.test(cleaned) && decimals > 0
      const [intPart, fracPart = ''] = cleaned.replace(',', '.').split('.')
      const groupedInt = formatNumber(Number(intPart || '0'), 0)
      setText(hasSeparator ? `${groupedInt},${fracPart.slice(0, decimals)}` : groupedInt)
    }
    onChange(parsed)
  }

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        autoComplete="off"
        value={text}
        onChange={handleChange}
        onFocus={(event) => {
          event.target.select()
          onFocus?.()
        }}
        className={cn('tabular-nums', suffix && 'pr-12', className)}
        {...rest}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}

function parse(text: string, decimals: number): number | undefined {
  const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.')
  if (cleaned === '' || cleaned === '.') return undefined
  const value = Number(decimals > 0 ? cleaned : cleaned.split('.')[0])
  return Number.isFinite(value) ? value : undefined
}
