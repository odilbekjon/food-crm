import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface RowAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  destructive?: boolean
  hidden?: boolean
  disabled?: boolean
  /** Shu amaldan oldin ajratgich chiziladi */
  separatorBefore?: boolean
}

interface RowActionsProps {
  actions: RowAction[]
  label?: string
}

/** Jadval qatori uchun "⋯" amallar menyusi. */
export function RowActions({ actions, label = 'Amallar' }: RowActionsProps) {
  const visible = actions.filter((action) => !action.hidden)
  if (visible.length === 0) return null
  return (
    <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {visible.map((action) => (
            <div key={action.label}>
              {action.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant={action.destructive ? 'destructive' : 'default'}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.icon && <action.icon />}
                {action.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
