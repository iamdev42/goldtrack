import { useState } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { useTenant } from '~/hooks/useTenant'
import {
  useMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
} from '~/lib/queries/materials'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '~/components/ui/dialog'
import { MaterialCard } from '~/components/app/MaterialCard'
import { MaterialForm } from '~/components/app/MaterialForm'

export function meta() {
  return [{ title: 'Materials — GoldTrack' }]
}

export default function Materials() {
  const { tenantId } = useTenant()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formError, setFormError] = useState(null)

  const { data: materials = [], isLoading, error } = useMaterials(tenantId)
  const createMutation = useCreateMaterial(tenantId)
  const updateMutation = useUpdateMaterial(tenantId)
  const deleteMutation = useDeleteMaterial(tenantId)

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  function openAdd() {
    setEditing(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(material) {
    setEditing(material)
    setFormError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    if (saving) return
    setDialogOpen(false)
    setEditing(null)
    setFormError(null)
  }

  async function handleSubmit(values) {
    setFormError(null)
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values })
      } else {
        await createMutation.mutateAsync(values)
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
      await deleteMutation.mutateAsync(editing.id)
      closeDialog()
    } catch (err) {
      setFormError(err.message || 'Could not delete material.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-brand-800">Materials</h2>
        <Button onClick={openAdd} disabled={!tenantId}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add material</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Intro — only on empty state, tells the goldsmith what this page does */}
      {!isLoading && materials.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white/50 p-12 text-center">
          <Wrench className="mx-auto mb-3 h-10 w-10 text-brand-300" />
          <p className="text-base font-medium text-gray-600">No materials yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Register the materials and labour costs you use to make jewellery. These will be
            available when building up an item&rsquo;s price.
          </p>
          <Button className="mt-4" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add your first material
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && <div className="py-16 text-center text-gray-400">Loading materials…</div>}

      {/* Error */}
      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Could not load materials: {error.message}
        </div>
      )}

      {/* List */}
      {materials.length > 0 && (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id}>
              <MaterialCard material={m} onClick={() => openEdit(m)} />
            </li>
          ))}
        </ul>
      )}

      {materials.length > 0 && (
        <p className="pt-1 text-center text-xs text-gray-400">
          {materials.length} {materials.length === 1 ? 'material' : 'materials'}
        </p>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(next) => (next ? null : closeDialog())}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit material' : 'New material'}</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <MaterialForm
            defaultValues={
              editing
                ? {
                    name: editing.name || '',
                    unit: editing.unit || '',
                    cost: editing.cost != null ? String(editing.cost) : '',
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onDelete={editing ? handleDelete : undefined}
            onCancel={closeDialog}
            submitting={saving}
            isEdit={!!editing}
            error={formError}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
