import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn } from '~/lib/utils'

/**
 * Searchable customer picker.
 *
 * Designed to scale to hundreds of customers: click/tap to open, type to
 * filter, click to pick. Fully controlled — pass in a `value` (customer id)
 * and an `onChange(id)` callback.
 *
 * Matching is simple substring on the customer's full display name
 * (first + last + company). Case-insensitive, trim-insensitive.
 *
 * @param {{
 *   value: string | null,
 *   onChange: (id: string | null) => void,
 *   customers: Array<{
 *     id: string,
 *     name: string,
 *     first_name?: string | null,
 *     last_name?: string | null,
 *     company?: string | null,
 *   }>,
 *   placeholder?: string,
 *   id?: string,
 * }} props
 */
export function CustomerPicker({
  value,
  onChange,
  customers,
  placeholder = 'No customer linked',
  id,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const listRef = useRef(null)

  const selected = customers.find((c) => c.id === value) || null

  // Filter: substring match on the concatenated first/last/company/display name.
  // Cheap enough to run on every keystroke for 1000 rows.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      const haystack = [c.first_name, c.last_name, c.company, c.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [customers, query])

  function pick(id) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  function onOpenChange(next) {
    setOpen(next)
    if (!next) setQuery('')
    // When opening, scroll the list to the top
    if (next) {
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = 0
      })
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-left text-base',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <span className={cn('truncate', !selected && 'text-gray-400')}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent
        // Match the trigger's width exactly so the popup feels like a dropdown
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        {/* Search */}
        <div className="relative border-b border-gray-100 p-2">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers…"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-1">
          {/* "No customer linked" — always available, acts as clear */}
          <PickerRow label={placeholder} muted selected={!value} onSelect={() => pick('')} />

          {filtered.length === 0 && query && (
            <div className="px-3 py-4 text-center text-sm text-gray-400">
              No customers match &ldquo;{query}&rdquo;
            </div>
          )}

          {filtered.map((c) => (
            <PickerRow
              key={c.id}
              label={c.name}
              selected={c.id === value}
              onSelect={() => pick(c.id)}
            />
          ))}
        </div>

        {/* Footer: show how many match */}
        {customers.length > 0 && (
          <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400">
            {query
              ? `${filtered.length} of ${customers.length}`
              : `${customers.length} ${customers.length === 1 ? 'customer' : 'customers'}`}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** One row in the picker list. */
function PickerRow({ label, selected, muted, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        selected
          ? 'bg-brand-50 text-brand-800'
          : 'text-gray-700 hover:bg-gray-50 focus-visible:bg-gray-50',
        muted && !selected && 'text-gray-400'
      )}
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="h-4 w-4 flex-shrink-0 text-brand-600" aria-hidden />}
    </button>
  )
}
