import {
  addDays,
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns'
import { t, type MessageKey } from '@/i18n/core'

export interface DateRange {
  from: Date
  to: Date
}

export type RangePreset = 'today' | '7d' | '30d' | 'custom'

export const DATE_FORMAT = 'dd.MM.yyyy'
export const DATETIME_FORMAT = 'dd.MM.yyyy HH:mm'

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  return isValid(date) ? format(date, DATE_FORMAT) : '—'
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  return isValid(date) ? format(date, DATETIME_FORMAT) : '—'
}

export function formatTime(value: string | Date): string {
  const date = toDate(value)
  return isValid(date) ? format(date, 'HH:mm') : '—'
}

/** Date -> YYYY-MM-DD (mahalliy vaqt bo'yicha) */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

export function periodOf(value: string | Date): string {
  return format(toDate(value), 'yyyy-MM')
}

/** 2026-10 -> "oktabr 2026" (oy nomi joriy tilda) */
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const key = `month.${month ?? 1}` as MessageKey
  return `${t(key)} ${year}`
}

export function rangeForPreset(preset: Exclude<RangePreset, 'custom'>, now: Date = new Date()): DateRange {
  const to = endOfDay(now)
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to }
    case '7d':
      return { from: startOfDay(subDays(now, 6)), to }
    case '30d':
      return { from: startOfDay(subDays(now, 29)), to }
  }
}

export function isInRange(value: string | Date, range: DateRange): boolean {
  const date = toDate(value)
  return date >= range.from && date <= range.to
}

export function daysBetween(range: DateRange): number {
  return Math.round((startOfDay(range.to).getTime() - startOfDay(range.from).getTime()) / 86_400_000) + 1
}

export function addDaysISO(date: string | Date, days: number): string {
  return toISODate(addDays(toDate(date), days))
}

export function diffInDays(later: string | Date, earlier: string | Date): number {
  return Math.round((startOfDay(toDate(later)).getTime() - startOfDay(toDate(earlier)).getTime()) / 86_400_000)
}

export function weekKey(value: string | Date): string {
  return toISODate(startOfWeek(toDate(value), { weekStartsOn: 1 }))
}

export function monthKey(value: string | Date): string {
  return toISODate(startOfMonth(toDate(value)))
}

export { addDays, endOfDay, parseISO, startOfDay, subDays }
