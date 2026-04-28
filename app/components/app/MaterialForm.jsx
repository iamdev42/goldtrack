import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { DialogBody, DialogFooter } from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { materialSchema, emptyMaterial } from '~/lib/validations/material'

/**
 * Form for creating OR editing a material.
 * Three fields: name (required), unit (optional free-text), cost (required number).
 *
 * Layout: <DialogBody> wraps the scrolling fields, <DialogFooter> pins the
 * Save / Cancel buttons at the bottom of the dialog. On edit, a "⋮" overflow
 * menu in the footer holds Delete.
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      // Form is the flex-1 child of DialogContent, so its body+footer can
      // sit in the right places relative to the dialog's flex column.
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody className="space-y-4 px-6 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            autoFocus
            placeholder="e.g. Gold 18K, Diamond, Labour"
            invalid={!!errors.name}
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
            <Input
              id="unit"
              placeholder="e.g. gram, piece, hour"
              invalid={!!errors.unit}
              {...register('unit')}
            />
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
              placeholder="0.00"
              invalid={!!errors.cost}
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
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        {/* Spacer pushes the right-side actions to the right */}
        <div className="flex-1" />
        {/* Overflow menu only shown in edit mode (to host Delete) */}
        {isEdit && onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                aria-label="More actions"
                disabled={submitting}
                className="h-10 w-10 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem destructive onSelect={onDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add material'}
        </Button>
      </DialogFooter>
    </form>
  )
}
