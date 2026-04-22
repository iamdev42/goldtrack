import { useRef, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  itemSchema,
  emptyItem,
  ITEM_CATEGORIES,
  ITEM_MATERIALS,
  ITEM_STATUSES,
  STATUS_LABELS,
} from '~/lib/validations/item'

/**
 * Add/edit item form. Photo upload is deferred — the parent receives the File
 * via `onSubmit` and handles upload after the item row is saved.
 *
 * @param {{
 *   defaultValues?: import('~/lib/validations/item').ItemInput,
 *   existingPhoto?: string | null,
 *   customers: Array<{ id: string, name: string }>,
 *   onSubmit: (values: import('~/lib/validations/item').ItemInput, photoFile: File | null) => void | Promise<void>,
 *   onDelete?: () => void,
 *   onCancel: () => void,
 *   submitting?: boolean,
 *   isEdit?: boolean,
 *   error?: string | null,
 * }} props
 */
export function ItemForm({
  defaultValues = emptyItem,
  existingPhoto = null,
  customers,
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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues,
    mode: 'onBlur',
  })

  const fileInputRef = useRef(null)
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [pendingPreview, setPendingPreview] = useState(null)

  // Clean up blob URL when the preview changes or unmount happens
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    }
  }, [pendingPreview])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingPhoto(file)
    setPendingPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const previewSrc = pendingPreview || existingPhoto

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values, pendingPhoto))}
      className="space-y-4 px-6 py-4"
    >
      {/* Photo upload */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-brand-200 p-3 transition-colors hover:border-brand-400 focus:border-brand-400 focus:outline-none"
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="preview"
            className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <Camera className="h-8 w-8 text-brand-300" aria-hidden />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-brand-700">
            {pendingPreview ? 'Change photo' : existingPhoto ? 'Replace photo' : 'Add photo'}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">Tap to select an image</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
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

      {/* Material + weight */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="material">Material</Label>
          <SelectBase id="material" {...register('material')}>
            <option value="">— Select —</option>
            {ITEM_MATERIALS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </SelectBase>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weight_g">Weight (g)</Label>
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
          {...register('price')}
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

/**
 * Plain <select> styled to match the Input component.
 * Local helper — small enough not to warrant its own file.
 */
function SelectBase({ className = '', children, ...props }) {
  return (
    <select
      className={`flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-base placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
