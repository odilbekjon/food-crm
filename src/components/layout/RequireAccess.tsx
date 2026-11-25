import { ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useRole } from '@/app/hooks'
import { EmptyState } from '@/components/common/states'
import { buttonVariants } from '@/components/ui/button'
import { useT } from '@/i18n/I18nProvider'
import { canView, type ModuleId } from '@/lib/permissions'

/** Demo ruxsat tekshiruvi. Haqiqiy tekshiruv backend'da bo'ladi (UI'da yashirish xavfsizlik emas). */
export function RequireAccess({ module, children }: { module: ModuleId; children: ReactNode }) {
  const role = useRole()
  const t = useT()
  if (canView(role, module)) return <>{children}</>
  return (
    <EmptyState
      icon={<ShieldAlert className="size-5" aria-hidden />}
      title={t('access.deniedTitle')}
      description={t('access.deniedDesc', { module: t(`nav.${module}`), role: t(`role.${role}`) })}
      action={
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          {t('access.home')}
        </Link>
      }
      className="py-24"
    />
  )
}
