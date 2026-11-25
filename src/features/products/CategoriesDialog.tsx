import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useDb, useRun } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Category } from '@/types'

interface CategoriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Kategoriyalarni boshqarish: qo'shish, nomini o'zgartirish, o'chirish (mahsuloti yo'q bo'lsa). */
export function CategoriesDialog({ open, onOpenChange }: CategoriesDialogProps) {
  const db = useDb()
  const run = useRun()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const counts = new Map<string, number>()
  for (const product of db.products) counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1)

  const add = async (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2) {
      setError('Nomi kamida 2 ta belgidan iborat bo‘lishi kerak')
      return
    }
    setError('')
    const result = await run((api) => api.createCategory(name), 'Kategoriya qo‘shildi')
    if (result.ok) setName('')
  }

  const saveRename = async () => {
    if (!editing) return
    const result = await run((api) => api.renameCategory(editing.id, editing.name), 'Kategoriya yangilandi')
    if (result.ok) setEditing(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kategoriyalar</DialogTitle>
            <DialogDescription>Mahsulotlarni guruhlash uchun kategoriyalar</DialogDescription>
          </DialogHeader>
          <form onSubmit={add} className="flex items-start gap-2" noValidate>
            <div className="flex-1">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Yangi kategoriya nomi"
                aria-label="Yangi kategoriya nomi"
                aria-invalid={Boolean(error)}
              />
              {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
            <Button type="submit">
              <Plus /> Qo‘shish
            </Button>
          </form>
          <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
            {db.categories.map((category) => (
              <li key={category.id} className="flex items-center gap-2 px-3 py-2">
                {editing?.id === category.id ? (
                  <>
                    <Input
                      value={editing.name}
                      onChange={(event) => setEditing({ id: category.id, name: event.target.value })}
                      onKeyDown={(event) => event.key === 'Enter' && saveRename()}
                      aria-label="Kategoriya nomi"
                      autoFocus
                    />
                    <Button size="icon-sm" onClick={saveRename} aria-label="Saqlash">
                      <Check />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)} aria-label="Bekor qilish">
                      <X />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{category.name}</span>
                    <span className="text-xs text-muted-foreground">{counts.get(category.id) ?? 0} ta mahsulot</span>
                    <Button size="icon-sm" variant="ghost" onClick={() => setEditing({ id: category.id, name: category.name })} aria-label={`${category.name}: nomini o‘zgartirish`}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => setDeleting(category)} aria-label={`${category.name}: o‘chirish`}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Kategoriyani o‘chirish"
        description={`“${deleting?.name ?? ''}” kategoriyasi o‘chiriladi. Mahsuloti bor kategoriyani o‘chirib bo‘lmaydi.`}
        confirmLabel="O‘chirish"
        destructive
        onConfirm={async () => {
          if (!deleting) return
          const result = await run((api) => api.deleteCategory(deleting.id), 'Kategoriya o‘chirildi')
          return result.ok
        }}
      />
    </>
  )
}
