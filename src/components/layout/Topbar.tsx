import { Check, LogOut, Menu, Moon, RotateCcw, Search, Sun, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { findNavItem } from '@/app/navigation'
import { useAppDispatch, useAppSelector, useRun } from '@/app/hooks'
import { setRole, signedOut } from '@/app/slices/session'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/use-theme'
import { useT } from '@/i18n/I18nProvider'
import { authApi } from '@/services/auth'
import { isRemote } from '@/services/config'
import type { RoleId } from '@/types'
import { GlobalSearch } from './GlobalSearch'
import { NotificationsMenu } from './NotificationsMenu'

const ROLES: RoleId[] = ['owner', 'manager', 'cashier', 'storekeeper', 'accountant']

interface TopbarProps {
  onOpenMenu: () => void
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const location = useLocation()
  const { resolvedTheme, setTheme } = useTheme()
  const dispatch = useAppDispatch()
  const role = useAppSelector((state) => state.session.role)
  const user = useAppSelector((state) => state.session.user)
  const run = useRun()
  const t = useT()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const nav = findNavItem(location.pathname)
  const title = nav ? t(nav.titleKey) : location.pathname.startsWith('/profile') ? t('nav.profile.title') : t('app.name')

  useEffect(() => {
    document.title = `${title} — ${t('app.name')}`
  }, [title, t])

  const logout = async () => {
    await authApi.logout()
    dispatch(signedOut())
    toast.success(t('auth.logout.done'))
    navigate('/login', { replace: true })
  }

  useEffect(() => setSearchOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu} aria-label={t('topbar.openMenu')}>
          <Menu />
        </Button>
        <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <GlobalSearch className="hidden w-72 sm:block lg:w-96" />
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setSearchOpen((value) => !value)}
            aria-label={t('topbar.search')}
            aria-expanded={searchOpen}
          >
            <Search />
          </Button>
          <NotificationsMenu />
          <LanguageSwitcher showLabel={false} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={resolvedTheme === 'dark' ? t('topbar.lightMode') : t('topbar.darkMode')}
          >
            {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-1.5" aria-label={t('topbar.profile')} />}>
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="size-4" />
              </span>
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-xs font-medium">{user?.name}</span>
                <span className="block text-[11px] text-muted-foreground">{t(`role.${role}`)}</span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <span className="block truncate text-sm font-medium text-foreground">{user?.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <UserRound /> {t('topbar.myProfile')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {!isRemote && (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t('topbar.demoRole')}</DropdownMenuLabel>
                    {ROLES.map((id) => (
                      <DropdownMenuItem key={id} onClick={() => dispatch(setRole(id))}>
                        {t(`role.${id}`)}
                        {role === id && <Check className="ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setResetOpen(true)}>
                    <RotateCcw /> {t('topbar.resetDemo')}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => void logout()}>
                <LogOut /> {t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {searchOpen && (
        <div className="border-t p-2 sm:hidden">
          <GlobalSearch autoFocus />
        </div>
      )}
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('topbar.resetTitle')}
        description={t('topbar.resetDesc')}
        confirmLabel={t('topbar.resetConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={async () => {
          const result = await run((api) => api.resetDemo(), t('topbar.resetDone'))
          return result.ok
        }}
      />
    </header>
  )
}
