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
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="space-y-4 px-6 py-4">
        {/* Name — first + last side by side */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              autoFocus
              placeholder="Sophie"
              autoComplete="given-name"
              {...register('first_name')}
            />
            {errors.first_name && (
              <p role="alert" className="text-sm text-red-600">
                {errors.first_name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              placeholder="Hartmann"
              autoComplete="family-name"
              {...register('last_name')}
            />
            {errors.last_name && (
              <p role="alert" className="text-sm text-red-600">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        {/* Company — separate from person */}
        <div className="space-y-1.5">
          <Label htmlFor="company">Company / atelier (optional)</Label>
          <Input
            id="company"
            placeholder="e.g. Taylor & Co Jewellery"
            autoComplete="organization"
            {...register('company')}
          />
          {errors.company && (
            <p role="alert" className="text-sm text-red-600">
              {errors.company.message}
            </p>
          )}
        </div>

        {/* Contact */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+41 79 000 00 00"
              autoComplete="tel"
              {...register('phone')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="sophie@example.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p role="alert" className="text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* Address — structured */}
        <div className="space-y-1.5">
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            placeholder="Bahnhofstrasse 22"
            autoComplete="street-address"
            {...register('street')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              inputMode="numeric"
              placeholder="8001"
              autoComplete="postal-code"
              {...register('postcode')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="Zürich"
              autoComplete="address-level2"
              {...register('city')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="Switzerland"
              autoComplete="country-name"
              {...register('country')}
            />
          </div>
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
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <div className="flex-1" />
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
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}
        </Button>
      </DialogFooter>
    </form>
  )
}
