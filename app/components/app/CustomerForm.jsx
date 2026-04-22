import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { customerSchema, emptyCustomer } from '~/lib/validations/customer'

/**
 * Form for creating OR editing a customer.
 * Uses react-hook-form + Zod for validation.
 *
 * @param {{
 *   defaultValues?: import('~/lib/validations/customer').CustomerInput,
 *   onSubmit: (values: import('~/lib/validations/customer').CustomerInput) => void | Promise<void>,
 *   onDelete?: () => void,
 *   onCancel: () => void,
 *   submitting?: boolean,
 *   isEdit?: boolean,
 *   error?: string | null,
 * }} props
 */
export function CustomerForm({
  defaultValues = emptyCustomer,
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
    resolver: zodResolver(customerSchema),
    defaultValues,
    mode: 'onBlur',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Full name *</Label>
        <Input
          id="name"
          autoFocus
          placeholder="e.g. Sophie Hartmann"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p role="alert" className="text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Phone + email side by side on wide screens */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" placeholder="+41 79 000 00 00" {...register('phone')} />
          {errors.phone && (
            <p role="alert" className="text-sm text-red-600">
              {errors.phone.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="sophie@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" placeholder="Bahnhofstrasse 22, 8001 Zürich" {...register('address')} />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Style preferences, ring size, allergies…"
          {...register('notes')}
        />
      </div>

      {/* Server error */}
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
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}
        </Button>
      </div>
    </form>
  )
}
