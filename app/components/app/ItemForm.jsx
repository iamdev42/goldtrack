import { forwardRef, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Plus, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { MAX_ITEM_PHOTOS } from '~/lib/queries/items'
import {
  itemSchema,
  emptyItem,
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  STATUS_LABELS,
  computeBomCost,
} from '~/lib/validations/item'
import { BomEditor } from '~/components/app/BomEditor'
import { cn } from '~/lib/utils'

/**
 * Add/edit item form.
 *
 * Multi-photo behaviour:
 *  - Existing photos (URLs) come in via `existingPhotos`. The user can remove any.
 *  - New photos are picked locally and live in component state until submit.
 *  - On submit the parent receives:
 *      values        — the form fields
 *      photoChanges  — { keep: string[], add: File[], remove: string[] }
 *      bom           — array of { material_id, quantity } lines
 *
 * @param {{
 *   defaultValues?: import('~/lib/validations/item').ItemInput,
 *   existingPhotos?: string[],
 *   defaultBom?: Array<{ material_id: string, quantity: string | number }>,
 *   customers: Array<{ id: string, name: string }>,
 *   materials: Array<{ id: string, name: string, unit: string | null, cost: number }>,
 *   onSubmit: (
 *     values: import('~/lib/validations/item').ItemInput,
 *     photoChanges: { keep: string[], add: File[], remove: string[] },
 *     bom: Array<{ material_id: string, quantity: number }>,
 *   ) => void | Promise<void>,
 *   onDelete?: () => void,
 *   onCancel: () => void,
 *   submitting?: boolean,
 *   isEdit?: boolean,
 *   error?: string | null,
 * }} props
 */
export function ItemForm({
  defaultValues = emptyItem,
  existingPhotos = [],
  defaultBom = [],
  customers,
  materials = [],
  onSubmit,
  onDelete,
  onCancel,
  submitting = false,
  isEdit = false,
  error = null,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues,
    mode: 'onBlur',
  })

  // Photo state ---------------------------------------------------
  // `keep`   = URLs of existing photos still on the item
  // `add`    = new File objects + their preview blob URLs
  // `remove` = URLs of existing photos the user removed (deleted from Storage on save)
  const [keep, setKeep] = useState(existingPhotos)
  const [add, setAdd] = useState([]) // [{ file, preview }]
  const [remove, setRemove] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)

  const fileInputRef = useRef(null)

  // Reset photo state when the dialog reopens with a different item
  useEffect(() => {
    setKeep(existingPhotos)
    setAdd([])
    setRemove([])
    setActiveIdx(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPhotos.join('|')])

  // Free blob URLs on unmount
  useEffect(() => {
    return () => add.forEach((p) => URL.revokeObjectURL(p.preview))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // BOM state -----------------------------------------------------
  // Kept in local state (not react-hook-form) because it's a nested array
  // of complex rows; RHF fieldArray adds complexity we don't need here.
  const [bom, setBom] = useState(defaultBom)

  // Reset BOM when the dialog reopens with a different item
  useEffect(() => {
    setBom(defaultBom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultBom)])

  // Live cost preview + auto-fill price.
  //
  // The rules:
  //   - On first render, if the form opens with an empty price, we'll
  //     auto-fill it from the BOM total.
  //   - Whenever the BOM total changes, we keep the price in sync — BUT
  //     only as long as the user hasn't manually edited the price.
  //   - Once the user types a value into the price field themselves, we
  //     stop auto-updating. That respects psychological pricing like
  //     "CHF 4950" that should NOT snap back to cost when BOM changes.
  //   - If the price is cleared back to empty, we resume auto-updating.
  const bomCost = computeBomCost(bom, materials)

  // True when price was last set by auto-fill (or never set).
  // Starts true only if the form opens with no existing price.
  const priceIsAutoRef = useRef(!defaultValues.price)

  // Apply the auto-fill whenever the BOM total changes.
  // Also clears the price back to empty when the BOM is emptied, so long as
  // we're still in auto mode (the user hasn't typed their own price).
  useEffect(() => {
    if (!priceIsAutoRef.current) return
    if (bomCost > 0) {
      setValue('price', bomCost.toFixed(2), { shouldDirty: false })
    } else {
      setValue('price', '', { shouldDirty: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomCost])

  // User-typed edits flip the auto-fill flag off; clearing the field flips it back on.
  // We do NOT use `onInput`/`onChange` directly because react-hook-form's setValue()
  // does not fire DOM events, but leaving the cleanup in `register()` means we need
  // to wrap it to add our side effect.
  const priceRegister = register('price')
  const wrappedPriceRegister = {
    ...priceRegister,
    onChange: (e) => {
      priceIsAutoRef.current = e.target.value === ''
      return priceRegister.onChange(e)
    },
  }

  // Photos currently shown in the gallery, in order:
  // existing kept ones first, then new pending ones.
  const gallery = [
    ...keep.map((url) => ({ kind: 'existing', url, key: url })),
    ...add.map((p, i) => ({ kind: 'pending', url: p.preview, file: p.file, key: `pending-${i}` })),
  ]
  const safeIdx = Math.min(activeIdx, Math.max(0, gallery.length - 1))
  const hero = gallery[safeIdx]
  const canAdd = gallery.length < MAX_ITEM_PHOTOS

  function onPickFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    const slotsLeft = MAX_ITEM_PHOTOS - gallery.length
    const accepted = files.slice(0, slotsLeft)
    const newPending = accepted.map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setAdd((prev) => [...prev, ...newPending])
  }

  function removePhoto(item) {
    if (item.kind === 'existing') {
      setKeep((prev) => prev.filter((u) => u !== item.url))
      setRemove((prev) => [...prev, item.url])
    } else {
      URL.revokeObjectURL(item.url)
      setAdd((prev) => prev.filter((p) => p.preview !== item.url))
    }
    setActiveIdx(0)
  }

  return (
    <form
      onSubmit={handleSubmit((values) => {
        // Sanitise BOM before handing it to the parent:
        // - drop lines without material_id
        // - drop lines with invalid/zero quantity
        // - coerce quantity to a plain number
        const cleanBom = bom
          .filter((l) => l.material_id && Number(l.quantity) > 0)
          .map((l) => ({
            material_id: l.material_id,
            quantity: Number(l.quantity),
          }))
        onSubmit(values, { keep, add: add.map((p) => p.file), remove }, cleanBom)
      })}
      className="space-y-4 px-6 py-4"
    >
      {/* Photo gallery — hero + thumbnail row */}
      <div className="space-y-3">
        <Label>
          Photos{' '}
          <span className="text-xs font-normal text-gray-400">
            ({gallery.length} / {MAX_ITEM_PHOTOS})
          </span>
        </Label>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-xl bg-brand-50">
          {hero ? (
            <>
              <img src={hero.url} alt="item" className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(hero)}
                aria-label="Remove this photo"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-brand-200 text-brand-400 transition-colors hover:border-brand-400 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <Camera className="h-8 w-8" aria-hidden />
              <span className="text-sm font-medium">Add a photo</span>
              <span className="text-xs text-gray-400">Up to {MAX_ITEM_PHOTOS} per item</span>
            </button>
          )}
        </div>

        {/* Thumbnail row */}
        {(gallery.length > 0 || canAdd) && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {gallery.map((item, i) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`View photo ${i + 1}`}
                className={cn(
                  'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-brand-400',
                  i === safeIdx
                    ? 'border-brand-600'
                    : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <img src={item.url} alt="" className="h-full w-full object-cover" />
                {item.kind === 'pending' && (
                  <span className="absolute bottom-0 left-0 right-0 bg-brand-600/85 py-0.5 text-center text-[10px] font-medium uppercase tracking-wider text-white">
                    new
                  </span>
                )}
              </button>
            ))}
            {canAdd && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add another photo"
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-brand-200 text-brand-400 transition-colors hover:border-brand-400 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <Plus className="h-5 w-5" aria-hidden />
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Item name *</Label>
        <Input
          id="name"
          autoFocus
          placeholder="e.g. Solitaire diamond ring"
          {...register('name')}
        />
        {errors.name && (
          <p role="alert" className="text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Category + status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <SelectBase id="category" {...register('category')}>
            <option value="">— Select —</option>
            {ITEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </SelectBase>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <SelectBase id="status" {...register('status')}>
            {ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </SelectBase>
        </div>
      </div>

      {/* Bill of materials */}
      <BomEditor lines={bom} materials={materials} onChange={setBom} />

      {/* Weight */}
      <div className="space-y-1.5">
        <Label htmlFor="weight_g">Total weight (g)</Label>
        <Input
          id="weight_g"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          {...register('weight_g')}
        />
        {errors.weight_g && (
          <p role="alert" className="text-sm text-red-600">
            {errors.weight_g.message}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <Label htmlFor="price">Price</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          {...wrappedPriceRegister}
        />
        {errors.price && (
          <p role="alert" className="text-sm text-red-600">
            {errors.price.message}
          </p>
        )}
      </div>

      {/* Customer link */}
      <div className="space-y-1.5">
        <Label htmlFor="customer_id">Linked customer</Label>
        <SelectBase id="customer_id" {...register('customer_id')}>
          <option value="">No customer linked</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectBase>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description / notes / stones</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Stones, provenance, any details…"
          {...register('description')}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
        {isEdit && onDelete ? (
          <Button type="button" variant="destructive" onClick={onDelete} disabled={submitting}>
            Delete
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
        </Button>
      </div>
    </form>
  )
}

/** Plain <select> styled to match the Input component.
 *  forwardRef is required so react-hook-form's `register()` can attach its ref
 *  and actually read the element's value at submit time. Without forwardRef,
 *  the ref is silently dropped and the form doesn't see changes to the select. */
const SelectBase = forwardRef(function SelectBase({ className = '', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-base placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
})
