import { useMemo, useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { useTenant } from '~/hooks/useTenant'
import { useCustomers } from '~/lib/queries/customers'
import {
  useItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  uploadItemPhoto,
} from '~/lib/queries/items'
import { STATUS_LABELS } from '~/lib/validations/item'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '~/components/ui/dialog'
import { ItemCard } from '~/components/app/ItemCard'
import { ItemForm } from '~/components/app/ItemForm'
import { cn } from '~/lib/utils'

export function meta() {
  return [{ title: 'Inventory — GoldTrack' }]
}

const FILTERS = [
  { key: null, label: 'All' },
  { key: 'for_sale', label: STATUS_LABELS.for_sale },
  { key: 'reserved', label: STATUS_LABELS.reserved },
  { key: 'sold', label: STATUS_LABELS.sold },
]

export default function Inventory() {
  const { tenantId } = useTenant()

  const { data: items = [], isLoading, error } = useItems(tenantId)
  const { data: customers = [] } = useCustomers(tenantId)

  const createMutation = useCreateItem(tenantId)
  const updateMutation = useUpdateItem(tenantId)
  const deleteMutation = useDeleteItem(tenantId)

  const [filter, setFilter] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formError, setFormError] = useState(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const filtered = useMemo(
    () => (filter ? items.filter((i) => i.status === filter) : items),
    [items, filter]
  )

  const totalValue = useMemo(
    () => filtered.reduce((sum, i) => sum + (Number(i.price) || 0), 0),
    [filtered]
  )

  function openAdd() {
    setEditing(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setFormError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    if (saving) return
    setDialogOpen(false)
    setEditing(null)
    setFormError(null)
  }

  async function handleSubmit(values, photoFile) {
    setFormError(null)
    try {
      let savedId = editing?.id
      let currentPhotos = editing?.photos || []

      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values })
      } else {
        const created = await createMutation.mutateAsync(values)
        savedId = created.id
        currentPhotos = []
      }

      // Upload new photo (if any) after the row exists
      if (photoFile && savedId) {
        try {
          const url = await uploadItemPhoto({ tenantId, itemId: savedId, file: photoFile })
          await updateMutation.mutateAsync({
            id: savedId,
            input: values,
            photos: [...currentPhotos, url],
          })
        } catch (uploadErr) {
          // Row is saved — show a soft warning but don't roll back
          console.error('[Inventory] photo upload failed:', uploadErr.message)
          setFormError('Item saved but photo upload failed. Try again from edit.')
          return
        }
      }

      closeDialog()
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    }
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(`Delete "${editing.name}"? This cannot be undone.`)) return
    try {
      await deleteMutation.mutateAsync(editing)
      closeDialog()
    } catch (err) {
      setFormError(err.message || 'Could not delete item.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-brand-800">Inventory</h2>
        <Button onClick={openAdd} disabled={!tenantId}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add item</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Filters */}
      {items.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={String(f.key)}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                filter === f.key
                  ? 'bg-brand-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-500 hover:border-brand-300 hover:text-brand-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-sm">
          <span className="text-sm text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </span>
          <span className="text-sm font-semibold text-brand-800">
            Total:{' '}
            {totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && <div className="py-16 text-center text-gray-400">Loading inventory…</div>}

      {/* Error */}
      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Could not load inventory: {error.message}
        </div>
      )}

      {/* Empty (no items at all) */}
      {!isLoading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white/50 p-12 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-brand-300" />
          <p className="text-base font-medium text-gray-600">No items yet</p>
          <p className="mt-1 text-sm text-gray-400">Tap + Add to register your first piece.</p>
        </div>
      )}

      {/* Empty (filter returns nothing) */}
      {!isLoading && items.length > 0 && filtered.length === 0 && (
        <div className="py-10 text-center text-gray-400">
          No {filter ? STATUS_LABELS[filter].toLowerCase() : ''} items.
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => openEdit(item)}
              onThumbClick={() => setLightboxSrc(item.photos?.[0])}
            />
          ))}
        </ul>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(next) => (next ? null : closeDialog())}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit item' : 'New item'}</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <ItemForm
            defaultValues={
              editing
                ? {
                    name: editing.name || '',
                    description: editing.description || '',
                    category: editing.category || '',
                    material: editing.material || '',
                    weight_g: editing.weight_g != null ? String(editing.weight_g) : '',
                    price: editing.price != null ? String(editing.price) : '',
                    status: editing.status || 'for_sale',
                    customer_id: editing.customer_id || '',
                  }
                : undefined
            }
            existingPhoto={editing?.photos?.[0]}
            customers={customers}
            onSubmit={handleSubmit}
            onDelete={editing ? handleDelete : undefined}
            onCancel={closeDialog}
            submitting={saving}
            isEdit={!!editing}
            error={formError}
          />
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxSrc && (
        <button
          type="button"
          onClick={() => setLightboxSrc(null)}
          aria-label="Close photo"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
        >
          <img
            src={lightboxSrc}
            alt=""
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        </button>
      )}
    </div>
  )
}
