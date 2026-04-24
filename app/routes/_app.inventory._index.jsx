import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Package, Plus, Search, X } from 'lucide-react'
import { useTenant } from '~/hooks/useTenant'
import { useCustomers } from '~/lib/queries/customers'
import { useMaterials } from '~/lib/queries/materials'
import { useDefaultMaterialIds } from '~/lib/queries/tenant-defaults'
import {
  useItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  uploadItemPhoto,
  removeItemPhotos,
  saveItemBom,
} from '~/lib/queries/items'
import { STATUS_LABELS } from '~/lib/validations/item'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '~/components/ui/dialog'
import { ItemCard } from '~/components/app/ItemCard'
import { ItemForm } from '~/components/app/ItemForm'
import { cn, formatCurrency } from '~/lib/utils'

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
  const qc = useQueryClient()

  const { data: items = [], isLoading, error } = useItems(tenantId)
  const { data: customers = [] } = useCustomers(tenantId)
  const { data: materials = [] } = useMaterials(tenantId)
  const { data: defaultMaterialIds = [] } = useDefaultMaterialIds(tenantId)

  const createMutation = useCreateItem(tenantId)
  const updateMutation = useUpdateItem(tenantId)
  const deleteMutation = useDeleteItem(tenantId)

  const [filter, setFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formError, setFormError] = useState(null)

  // Lightbox: holds the photo array + current index, not just one URL
  const [lightbox, setLightbox] = useState(null) // { photos: string[], idx: number } | null

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const filtered = useMemo(() => {
    const byStatus = filter ? items.filter((i) => i.status === filter) : items
    const q = search.trim().toLowerCase()
    if (!q) return byStatus
    return byStatus.filter((i) => {
      // Pull every material name from the item's BOM into the searchable text
      // Pull every material name + every ad-hoc description into the haystack
      const bomNames = (i.bom || []).map((line) => line.material?.name).filter(Boolean)
      const adhocDescriptions = (i.adhoc || []).map((line) => line.description).filter(Boolean)
      const haystack = [
        i.name,
        i.description,
        i.category,
        ...bomNames,
        ...adhocDescriptions,
        i.customer?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [items, filter, search])

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

  /**
   * Handle save. The form gives us:
   *   values        — text fields
   *   photoChanges  — { keep: string[], add: File[], remove: string[] }
   *   bomBundle     — { materialLines: [...], adhocLines: [...] }
   *
   * Order of operations:
   *   1. Insert/update item row
   *   2. Upload any new photos, patch the photos array
   *   3. Save the BOM (atomic via save_item_bom RPC — covers BOTH line kinds)
   *   4. Clean up removed photos from Storage
   */
  async function handleSubmit(values, photoChanges, bomBundle) {
    setFormError(null)
    const { keep, add, remove } = photoChanges
    const { materialLines, adhocLines } = bomBundle

    try {
      let savedId = editing?.id

      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values })
      } else {
        const created = await createMutation.mutateAsync(values)
        savedId = created.id
      }

      // Upload any new photos in parallel — wait for all
      let newUrls = []
      if (add.length && savedId) {
        try {
          newUrls = await Promise.all(
            add.map((file) => uploadItemPhoto({ tenantId, itemId: savedId, file }))
          )
        } catch (uploadErr) {
          console.error('[Inventory] photo upload failed:', uploadErr.message)
          setFormError('Item saved but some photos could not be uploaded. Try again from edit.')
          return
        }
      }

      // Persist the final photos array (kept existing + newly uploaded)
      const finalPhotos = [...keep, ...newUrls]
      const photosChanged = add.length > 0 || remove.length > 0
      if (photosChanged && savedId) {
        await updateMutation.mutateAsync({
          id: savedId,
          input: values,
          photos: finalPhotos,
        })
      }

      // Save the BOM via the atomic RPC. Always fires: empty arrays correctly
      // wipe out any existing lines on either side.
      if (savedId) {
        try {
          await saveItemBom(savedId, materialLines, adhocLines)
        } catch (bomErr) {
          console.error('[Inventory] BOM save failed:', bomErr.message)
          setFormError(`Item saved but the bill of materials could not be saved: ${bomErr.message}`)
          return
        }
      }

      // Clean up removed photos from Storage (after the row no longer references them)
      if (remove.length) {
        try {
          await removeItemPhotos(remove)
        } catch (cleanupErr) {
          // Item is saved correctly; this is just storage hygiene
          console.error('[Inventory] photo cleanup failed:', cleanupErr.message)
        }
      }

      // Invalidate the list query so BOM changes show up immediately
      qc.invalidateQueries({ queryKey: ['items', 'list', tenantId] })

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

      {/* Search */}
      {items.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search by name, material, customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Stats */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-sm">
          <span className="text-sm text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </span>
          <span className="text-sm font-semibold text-brand-800">
            Total: {formatCurrency(totalValue)}
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
              onThumbClick={() =>
                item.photos?.length && setLightbox({ photos: item.photos, idx: 0 })
              }
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
                    weight_g: editing.weight_g != null ? String(editing.weight_g) : '',
                    price: editing.price != null ? String(editing.price) : '',
                    status: editing.status || 'for_sale',
                    customer_id: editing.customer_id || '',
                  }
                : undefined
            }
            existingPhotos={editing?.photos || []}
            defaultBom={(() => {
              if (!editing) {
                // Brand-new item: pre-fill one blank-qty line per default material
                return defaultMaterialIds.map((id) => ({
                  kind: 'material',
                  material_id: id,
                  quantity: '',
                }))
              }
              // Existing item: merge the two loaded arrays into one tagged list.
              const materialLines = (editing.bom || []).map((line) => ({
                kind: 'material',
                material_id: line.material_id,
                quantity: String(line.quantity),
              }))
              const adhocLines = (editing.adhoc || []).map((line) => ({
                kind: 'adhoc',
                description: line.description,
                cost: String(line.cost),
              }))
              return [...materialLines, ...adhocLines]
            })()}
            customers={customers}
            materials={materials}
            onSubmit={handleSubmit}
            onDelete={editing ? handleDelete : undefined}
            onCancel={closeDialog}
            submitting={saving}
            isEdit={!!editing}
            error={formError}
          />
        </DialogContent>
      </Dialog>

      {/* Lightbox with arrow navigation */}
      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          startIdx={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}

function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx)

  function prev(e) {
    e?.stopPropagation()
    setIdx((i) => (i - 1 + photos.length) % photos.length)
  }
  function next(e) {
    e?.stopPropagation()
    setIdx((i) => (i + 1) % photos.length)
  }

  // Keyboard navigation: ←  →  Esc
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <img
        src={photos[idx]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-xl object-contain"
      />

      {photos.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
          {idx + 1} / {photos.length}
        </div>
      )}
    </div>
  )
}
