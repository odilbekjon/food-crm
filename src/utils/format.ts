import { t } from '@/i18n/core'

/** Sonlarni o'qilishi oson formatda ko'rsatish (1 234 567). */
export function formatNumber(value: number, maxFractionDigits = 0): string {
  if (!Number.isFinite(value)) return '0'
  const fixed = Math.abs(value).toFixed(maxFractionDigits)
  const [intPart, fracPart] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const frac = fracPart ? fracPart.replace(/0+$/, '') : ''
  const sign = value < 0 && Number(fixed) !== 0 ? '−' : ''
  return `${sign}${grouped}${frac ? `,${frac}` : ''}`
}

/** UZS formatida (qo'shimcha belgi tilga qarab: so'm / сум / UZS). */
export function formatMoney(value: number): string {
  return `${formatNumber(Math.round(value))} ${t('currency')}`
}

/** Katta summalarni qisqa ko'rinishda (grafik o'qlari uchun). */
export function formatCompactMoney(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 1)} ${t('compact.billion')}`
  if (abs >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)} ${t('compact.million')}`
  if (abs >= 1_000) return `${formatNumber(value / 1_000, 0)} ${t('compact.thousand')}`
  return formatNumber(value)
}

export function formatQty(value: number, unit?: string): string {
  const text = formatNumber(value, 3)
  return unit ? `${text} ${unit}` : text
}

export function formatPercent(value: number, digits = 1): string {
  return `${formatNumber(value, digits)}%`
}

export function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Telefon raqamini +998 90 123 45 67 ko'rinishida chiqaradi. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
  }
  return phone
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
