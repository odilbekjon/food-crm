import { Loader2 } from 'lucide-react'
import type { FormEventHandler, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'data-[side=right]:sm:max-w-md',
  md: 'data-[side=right]:sm:max-w-xl',
  lg: 'data-[side=right]:sm:max-w-3xl',
} as const

interface FormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: keyof typeof SIZES
  submitLabel?: string
  submitting?: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  children: ReactNode
  /** Forma yuborish tugmasidan tashqari qo'shimcha tugmalar */
  extraActions?: ReactNode
}

/** Qo'shish/tahrirlash formalari uchun o'ng tomondan chiquvchi drawer. */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  size = 'sm',
  submitLabel = 'Saqlash',
  submitting,
  onSubmit,
  children,
  extraActions,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <SheetContent className={cn('data-[side=right]:w-full gap-0', SIZES[size])}>
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
          <SheetFooter className="flex-row justify-end gap-2 border-t">
            {extraActions}
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
