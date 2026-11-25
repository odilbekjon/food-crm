import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n/I18nProvider'

/** Parolni ko'rsatish/yashirish tugmasi bilan kiritish maydoni. */
export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const t = useT()
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-9" />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={visible ? t('auth.hide') : t('auth.show')}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
