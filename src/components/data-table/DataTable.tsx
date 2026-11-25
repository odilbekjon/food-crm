import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { EmptyState, ErrorState } from '@/components/common/states'
import { SimpleSelect } from '@/components/common/form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Berilsa, sarlavhani bosib saralash mumkin */
  sortValue?: (row: T) => string | number | null | undefined
  align?: 'left' | 'right' | 'center'
  className?: string
  /** Telefon ekranlarida ustunni yashirish */
  hideOnMobile?: boolean
  /** Eksport / a11y uchun sarlavha matni */
  label?: string
}

interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  pageSize?: number
  defaultSort?: SortState
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
  /** Jadval ostidagi qo'shimcha (masalan jami qator) */
  footer?: ReactNode
  /** Jadvalni nomlash (screen reader uchun) */
  caption?: string
}

const PAGE_SIZES = [10, 20, 50]

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = 'Ma’lumot topilmadi',
  emptyDescription,
  emptyAction,
  pageSize: initialPageSize = 10,
  defaultSort,
  onRowClick,
  rowClassName,
  footer,
  caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const sorted = useMemo(() => {
    if (!sort) return data
    const column = columns.find((item) => item.key === sort.key)
    if (!column?.sortValue) return data
    const getValue = column.sortValue
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...data].sort((a, b) => {
      const left = getValue(a)
      const right = getValue(b)
      if (left == null && right == null) return 0
      if (left == null) return 1
      if (right == null) return -1
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor
      return String(left).localeCompare(String(right), 'uz') * factor
    })
  }, [data, columns, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const start = (currentPage - 1) * pageSize
  const rows = sorted.slice(start, start + pageSize)

  const toggleSort = (key: string) => {
    setPage(1)
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (onRowClick && (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
      event.preventDefault()
      onRowClick(row)
    }
  }

  const alignClass = (align?: Column<T>['align']) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : (
        <>
          <Table aria-busy={loading || undefined}>
            {caption && <caption className="sr-only">{caption}</caption>}
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => {
                  const sortable = Boolean(column.sortValue)
                  const active = sort?.key === column.key
                  return (
                    <TableHead
                      key={column.key}
                      aria-sort={active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cn(
                        'h-9 whitespace-nowrap bg-muted/40 text-xs font-medium text-muted-foreground',
                        alignClass(column.align),
                        column.hideOnMobile && 'hidden md:table-cell',
                        column.className,
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                            column.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {column.header}
                          {active ? (
                            sort?.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: Math.min(pageSize, 6) }, (_, index) => (
                    <TableRow key={index} className="hover:bg-transparent">
                      {columns.map((column) => (
                        <TableCell key={column.key} className={cn(column.hideOnMobile && 'hidden md:table-cell')}>
                          <Skeleton className="h-4 w-full max-w-32" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((row) => (
                    <TableRow
                      key={rowKey(row)}
                      tabIndex={onRowClick ? 0 : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={onRowClick ? (event) => onRowKeyDown(event, row) : undefined}
                      className={cn(
                        onRowClick && 'cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none',
                        rowClassName?.(row),
                      )}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={cn(
                            'py-2.5',
                            alignClass(column.align),
                            column.hideOnMobile && 'hidden md:table-cell',
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          {!loading && sorted.length === 0 && (
            <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
          )}
          {footer}
          {!loading && sorted.length > 0 && (
            <div className="flex flex-col gap-2 border-t px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                {start + 1}–{Math.min(start + pageSize, sorted.length)} / {sorted.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Qatorlar:</span>
                <SimpleSelect
                  value={String(pageSize)}
                  onChange={(value) => {
                    setPageSize(Number(value))
                    setPage(1)
                  }}
                  options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
                  className="w-16"
                  size="sm"
                  aria-label="Sahifadagi qatorlar soni"
                />
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label="Oldingi sahifa"
                >
                  <ChevronLeft />
                </Button>
                <span className="min-w-14 text-center tabular-nums">
                  {currentPage} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label="Keyingi sahifa"
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
