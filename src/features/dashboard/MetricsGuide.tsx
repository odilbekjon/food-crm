import { CircleHelp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useT } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/core'

const METRICS: Array<{ name: MessageKey; text: MessageKey }> = [
  { name: 'guide.sales.name', text: 'guide.sales.text' },
  { name: 'guide.revenue.name', text: 'guide.revenue.text' },
  { name: 'guide.cogs.name', text: 'guide.cogs.text' },
  { name: 'guide.gross.name', text: 'guide.gross.text' },
  { name: 'guide.expenses.name', text: 'guide.expenses.text' },
  { name: 'guide.net.name', text: 'guide.net.text' },
]

/** Dashboard ko'rsatkichlari izohi: mijozga loyihani tushuntirishda ham foydali. */
export function MetricsGuide() {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CircleHelp /> {t('dash.guide.open')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('guide.title')}</DialogTitle>
            <DialogDescription>{t('guide.desc')}</DialogDescription>
          </DialogHeader>
          <dl className="space-y-3">
            {METRICS.map((metric) => (
              <div key={metric.name} className="rounded-lg border p-3">
                <dt className="text-sm font-medium">{t(metric.name)}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{t(metric.text)}</dd>
              </div>
            ))}
          </dl>
          <section className="rounded-lg bg-primary/5 p-3">
            <h4 className="text-sm font-medium">{t('guide.example.title')}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{t('guide.example.text')}</p>
          </section>
          <section className="rounded-lg bg-muted/50 p-3">
            <h4 className="text-sm font-medium">{t('guide.period.title')}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{t('guide.period.text')}</p>
          </section>
        </DialogContent>
      </Dialog>
    </>
  )
}
