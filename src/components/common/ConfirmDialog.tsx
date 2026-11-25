import { Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  /** Promise qaytarsa, tugaguncha tugma bloklanadi; `false` qaytarsa oyna yopilmaydi. */
  onConfirm: () => void | boolean | Promise<void | boolean>
  children?: ReactNode
}

/** Muhim amallar uchun tasdiqlash oynasi. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Tasdiqlash',
  cancelLabel = 'Bekor qilish',
  destructive,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  const handleConfirm = async () => {
    setBusy(true)
    try {
      const result = await onConfirm()
      if (result !== false) onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={busy} onClick={handleConfirm}>
            {busy && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
