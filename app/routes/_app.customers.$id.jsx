import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Mail, MapPin, Pencil, Phone, StickyNote } from 'lucide-react'
import { useTenant } from '~/hooks/useTenant'
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '~/lib/queries/customers'
import { useCustomerItems } from '~/lib/queries/items'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '~/components/ui/dialog'
import { CustomerForm } from '~/components/app/CustomerForm'
import { ItemCard } from '~/components/app/ItemCard'
import { formatCurrency } from '~/lib/utils'

export function meta() {
  return [{ title: 'Customer — GoldTrack' }]
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantId } = useTenant()

  const { data: customer, isLoading: customerLoading, error: customerError } = useCustomer(id)
  const { data: items = [], isLoading: itemsLoading } = useCustomerItems(id)

  const [editOpen, setEditOpen] = useState(false)
  const [formError, setFormError] = useState(null)
  const updateMutation = useUpdateCustomer(tenantId)
  const deleteMutation = useDeleteCustomer(tenantId)

  // Total value across linked items, summing whatever has a price set.
  // Items without a price contribute 0; nulls aren't surprises.
  const totalValue = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)

  async function handleEditSubmit(values) {
    setFormError(null)
    try {
      await updateMutation.mutateAsync({ id, input: values })
      setEditOpen(false)
    } catch (err) {
      setFormError(err.message || 'Could not save changes.')
    }
  }

  async function handleDelete() {
    if (!customer) return
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return
    try {
      await deleteMutation.mutateAsync(customer.id)
      navigate('/customers', { replace: true })
    } catch (err) {
      setFormError(err.message || 'Could not delete customer.')
    }
  }

  // Open an item's edit dialog by navigating to inventory with a query param.
  // The inventory route reads `?edit=<id>` on mount and opens the dialog.
  function openItem(itemId) {
    navigate(`/inventory?edit=${itemId}`)
  }

  if (customerLoading) {
    return <div className="mx-auto max-w-2xl p-4 text-gray-400">Loading…</div>
  }

  if (customerError || !customer) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Customer not found{customerError ? `: ${customerError.message}` : '.'}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Header: back + edit */}
      <div className="flex items-center justify-between">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>
        <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Customer name + summary line */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-900">{customer.name}</h1>
        <p className="text-sm text-gray-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
          {totalValue > 0 && <> · Total value: {formatCurrency(totalValue)}</>}
        </p>
      </div>

      {/* Contact details panel */}
      <CustomerDetailsPanel customer={customer} />

      {/* Linked items section */}
      <div className="space-y-2 pt-2">
        <h2 className="text-base font-semibold text-gray-700">Linked items</h2>

        {itemsLoading && <p className="text-sm text-gray-400">Loading items…</p>}

        {!itemsLoading && items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
            No items linked to this customer yet.
          </p>
        )}

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} onClick={() => openItem(item.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edit dialog (reuses the existing CustomerForm) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <CustomerForm
            defaultValues={customer}
            onSubmit={handleEditSubmit}
            onDelete={handleDelete}
            onCancel={() => setEditOpen(false)}
            submitting={updateMutation.isPending || deleteMutation.isPending}
            isEdit
            error={formError}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Read-only display of the customer's contact info. */
function CustomerDetailsPanel({ customer }) {
  const addressLine = [
    customer.street,
    [customer.postcode, customer.city].filter(Boolean).join(' '),
    customer.country,
  ]
    .filter(Boolean)
    .join(', ')

  // Suppress the panel entirely if there's nothing to show — keeps the page tidy
  // for sparse customer records.
  const hasAnything = addressLine || customer.email || customer.phone || customer.notes
  if (!hasAnything) return null

  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
      {addressLine && <DetailRow icon={MapPin} text={addressLine} />}
      {customer.email && (
        <DetailRow
          icon={Mail}
          text={
            <a href={`mailto:${customer.email}`} className="text-brand-700 hover:underline">
              {customer.email}
            </a>
          }
        />
      )}
      {customer.phone && (
        <DetailRow
          icon={Phone}
          text={
            <a href={`tel:${customer.phone}`} className="text-brand-700 hover:underline">
              {customer.phone}
            </a>
          }
        />
      )}
      {customer.notes && <DetailRow icon={StickyNote} text={customer.notes} multiline />}
    </div>
  )
}

function DetailRow({ icon: Icon, text, multiline = false }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
      <div className={multiline ? 'whitespace-pre-wrap text-gray-700' : 'text-gray-700'}>
        {text}
      </div>
    </div>
  )
}
