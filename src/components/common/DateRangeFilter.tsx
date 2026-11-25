import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/core'
import { cn } from '@/lib/utils'
import { endOfDay, parseISO, rangeForPreset, startOfDay, toISODate, type DateRange, type RangePreset } from '@/utils/date'

export interface DateRangeState {
  preset: RangePreset
  from: string
  to: string
}

const PRESETS: Array<{ id: RangePreset; labelKey: MessageKey }> = [
  { id: 'today', labelKey: 'range.today' },
  { id: '7d', labelKey: 'range.7d' },
  { id: '30d', labelKey: 'range.30d' },
  { id: 'custom', labelKey: 'range.custom' },
]

function initialState(preset: RangePreset): DateRangeState {
  const base = rangeForPreset(preset === 'custom' ? '30d' : preset)
  return { preset, from: toISODate(base.from), to: toISODate(base.to) }
}

/** Sana oralig'i holati va undan hisoblangan `range` (kirish tartibsiz bo'lsa, almashtiriladi). */
export function useDateRange(initial: RangePreset = '7d') {
  const [state, setState] = useState<DateRangeState>(() => initialState(initial))
  const range = useMemo<DateRange>(() => {
    if (state.preset !== 'custom') return rangeForPreset(state.preset)
    const a = state.from ? startOfDay(parseISO(state.from)) : startOfDay(new Date())
    const b = state.to ? endOfDay(parseISO(state.to)) : endOfDay(new Date())
    return a <= b ? { from: a, to: b } : { from: startOfDay(b), to: endOfDay(a) }
  }, [state])
  return { state, setState, range }
}

interface DateRangeFilterProps {
  state: DateRangeState
  onChange: (state: DateRangeState) => void
  className?: string
}

export function DateRangeFilter({ state, onChange, className }: DateRangeFilterProps) {
  const t = useT()
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div role="group" aria-label={t('range.group')} className="inline-flex rounded-lg bg-muted p-[3px]">
        {PRESETS.map((preset) => {
          const active = state.preset === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (preset.id === 'custom') onChange({ ...state, preset: 'custom' })
                else {
                  const base = rangeForPreset(preset.id)
                  onChange({ preset: preset.id, from: toISODate(base.from), to: toISODate(base.to) })
                }
              }}
              className={cn(
                'rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                active && 'bg-background text-foreground shadow-sm dark:bg-input/40',
              )}
            >
              {t(preset.labelKey)}
            </button>
          )
        })}
      </div>
      {state.preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={state.from}
            max={state.to || undefined}
            onChange={(event) => onChange({ ...state, from: event.target.value })}
            aria-label={t('range.from')}
            className="w-36"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="date"
            value={state.to}
            min={state.from || undefined}
            onChange={(event) => onChange({ ...state, to: event.target.value })}
            aria-label={t('range.to')}
            className="w-36"
          />
        </div>
      )}
    </div>
  )
}
