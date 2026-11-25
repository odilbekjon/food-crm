import { CheckCircle2, Moon, Store, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/I18nProvider'
import { isRemote } from '@/services/config'
import { useTheme } from '@/hooks/use-theme'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const t = useT()
  const { resolvedTheme, setTheme } = useTheme()
  const points = [t('auth.brand.p1'), t('auth.brand.p2'), t('auth.brand.p3')]

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Store className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold">{t('app.name')}</span>
        </div>
        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">{t('auth.brand.headline')}</h2>
          <ul className="space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-primary-foreground/90">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/70">{t('app.tagline')}</p>
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2 lg:invisible">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4" aria-hidden />
            </span>
            <span className="text-sm font-semibold">{t('app.name')}</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label={resolvedTheme === 'dark' ? t('topbar.lightMode') : t('topbar.darkMode')}
            >
              {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            <p className="text-center text-sm text-muted-foreground">{footer}</p>
            {!isRemote && <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">{t('auth.demoNote')}</p>}
          </div>
        </main>
      </div>
    </div>
  )
}
