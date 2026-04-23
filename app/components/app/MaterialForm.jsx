import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { materialSchema, emptyMaterial } from '~/lib/validations/material'

/**
 * Form for creating OR editing a material.
 * Three fields: name (required), unit (optional free-text), cost (required number).
 *
 * @param {{
 *   defaultValues?: import('~/lib/validations/material').MaterialInput,
 *   onSubmit: (values: import('~/lib/validations/material').MaterialInput) => void | Promise<void>,
 *   onDelete?: () => void,
 *   onCancel: () => void,
 *   submitting?: boolean,
 *   isEdit?: boolean,
 *   error?: string | null,
 * }} props
 */
export function MaterialForm({
  defaultValues = emptyMaterial,
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
    resolver: zodResolver(materialSchema),
    defaultValues,
    mode: 'onBlur',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          autoFocus
          placeholder="e.g. Gold 18K, Diamond, Labour"
          {...register('name')}
        />
        {errors.name && (
          <p role="alert" className="text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" placeholder="e.g. gram, piece, hour" {...register('unit')} />
          {errors.unit && (
            <p role="alert" className="text-sm text-red-600">
              {errors.unit.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cost">Cost per unit *</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            {...register('cost')}
          />
          {errors.cost && (
            <p role="alert" className="text-sm text-red-600">
              {errors.cost.message}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

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
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add material'}
        </Button>
      </div>
    </form>
  )
}
