import { Check, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LANGUAGES } from '@/i18n/core'
import { useI18n } from '@/i18n/I18nProvider'

export function LanguageSwitcher({ showLabel = true }: { showLabel?: boolean }) {
  const { lang, setLang, t } = useI18n()
  const current = LANGUAGES.find((item) => item.id === lang)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size={showLabel ? 'default' : 'icon'} aria-label={t('common.language')} />}>
        <Globe />
        {showLabel && <span className="text-xs font-medium">{current?.short}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGUAGES.map((item) => (
          <DropdownMenuItem key={item.id} onClick={() => setLang(item.id)}>
            {item.name}
            {lang === item.id && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
