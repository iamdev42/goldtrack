import { useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { useTenant } from '~/hooks/useTenant'
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '~/lib/queries/customers'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '~/components/ui/dialog'
import { CustomerCard } from '~/components/app/CustomerCard'
import { CustomerForm } from '~/components/app/CustomerForm'

export function meta() {
  return [{ title: 'Customers — GoldTrack' }]
}

export default function Customers() {
  const { tenantId } = useTenant()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formError, setFormError] = useState(null)

  const { data: customers = [], isLoading, error } = useCustomers(tenantId)
  const createMutation = useCreateCustomer(tenantId)
  const updateMutation = useUpdateCustomer(tenantId)
  const deleteMutation = useDeleteCustomer(tenantId)

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    )
  })

  function openAdd() {
    setEditing(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(customer) {
    setEditing(customer)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(values) {
    setFormError(null)
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values })
      } else {
        await createMutation.mutateAsync(values)
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    }
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(`Delete ${editing.name}? This cannot be undone.`)) return
    try {
      await deleteMutation.mutateAsync(editing.id)
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      setFormError(err.message || 'Could not delete customer.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-brand-800">Customers</h2>
        <Button onClick={openAdd} disabled={!tenantId}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add customer</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {customers.length > 0 && (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {isLoading && <div className="py-16 text-center text-gray-400">Loading customers…</div>}

      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Could not load customers: {error.message}
        </div>
      )}

      {!isLoading && !error && customers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white/50 p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-brand-300" />
          <p className="text-base font-medium text-gray-600">No customers yet</p>
          <p className="mt-1 text-sm text-gray-400">Tap + Add to register your first.</p>
        </div>
      )}

      {!isLoading && customers.length > 0 && filtered.length === 0 && (
        <div className="py-10 text-center text-gray-400">
          No customers match &ldquo;{search}&rdquo;
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <CustomerCard customer={c} onClick={() => openEdit(c)} />
            </li>
          ))}
        </ul>
      )}

      {customers.length > 0 && (
        <p className="pt-2 text-center text-xs text-gray-400">
          {filtered.length === customers.length
            ? `${customers.length} customer${customers.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${customers.length}`}
        </p>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(next) => {
          if (!next && !saving) {
            setDialogOpen(false)
            setEditing(null)
            setFormError(null)
          }
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit customer' : 'New customer'}</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <CustomerForm
            defaultValues={
              editing
                ? {
                    name: editing.name || '',
                    phone: editing.phone || '',
                    email: editing.email || '',
                    address: editing.address || '',
                    notes: editing.notes || '',
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onDelete={editing ? handleDelete : undefined}
            onCancel={() => {
              setDialogOpen(false)
              setEditing(null)
              setFormError(null)
            }}
            submitting={saving}
            isEdit={!!editing}
            error={formError}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
