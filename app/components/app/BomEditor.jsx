import { Plus, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { formatCurrency } from '~/lib/utils'

/**
 * Editable BOM (Bill of Materials) list.
 *
 * Fully controlled by its parent — receives `lines`, emits `onChange(lines)`
 * with every edit. Does its own math to show a running total.
 *
 * A "line" has this shape: { material_id: string, quantity: string | number }
 * (quantity kept as string in state so empty inputs stay empty, not NaN)
 *
 * @param {{
 *   lines: Array<{ material_id: string, quantity: string | number }>,
 *   materials: Array<{ id: string, name: string, unit: string | null, cost: number }>,
 *   errors?: Array<null | { field: 'material_id' | 'quantity', message: string }>,
 *   onChange: (lines: Array<{ material_id: string, quantity: string | number }>) => void,
 * }} props
 */
export function BomEditor({ lines, materials, errors = [], onChange }) {
  // If no materials are registered, the whole BOM editor is useless.
  // Render an explanatory empty state with a link to the Materials tab.
  if (materials.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        <span>No materials registered yet.</span>
        <a
          href="/materials"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-brand-700 underline-offset-2 hover:underline"
        >
          Add one →
        </a>
      </div>
    )
  }

  function addLine() {
    // Default the new line to the first material in the list for a head start
    onChange([...lines, { material_id: materials[0].id, quantity: '' }])
  }

  function removeLine(index) {
    onChange(lines.filter((_, i) => i !== index))
  }

  function updateLine(index, field, value) {
    onChange(lines.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  // Running total: Σ (quantity × material.cost) for lines with valid qty
  const total = lines.reduce((sum, line) => {
    const mat = materials.find((m) => m.id === line.material_id)
    if (!mat) return sum
    const qty = Number(line.quantity)
    if (!Number.isFinite(qty) || qty <= 0) return sum
    return sum + qty * Number(mat.cost)
  }, 0)

  return (
    <div className="space-y-3">
      <Label>Bill of materials</Label>

      {lines.length === 0 && (
        <p className="text-sm text-gray-400">
          No materials added. Tap &ldquo;+ Add material&rdquo; below.
        </p>
      )}

      {lines.map((line, i) => (
        <BomLineRow
          key={i}
          line={line}
          materials={materials}
          error={errors[i] || null}
          onMaterialChange={(id) => updateLine(i, 'material_id', id)}
          onQuantityChange={(q) => updateLine(i, 'quantity', q)}
          onRemove={() => removeLine(i)}
        />
      ))}

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={addLine}
          className="text-brand-700 hover:bg-brand-50"
        >
          <Plus className="h-4 w-4" />
          Add material
        </Button>

        {lines.length > 0 && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400">Material cost</p>
            <p className="text-lg font-semibold text-brand-800">{formatCurrency(total)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * One BOM line row:
 *   - Row 1: material dropdown + quantity input + unit label + remove button
 *   - Row 2: right-aligned subtotal (quantity × material.cost)
 *
 * The subtotal sits on its own row under the inputs so it fits comfortably on
 * narrow mobile screens without cramming five elements on one line. On wider
 * screens it still reads cleanly — no breakpoint juggling needed.
 */
function BomLineRow({ line, materials, error, onMaterialChange, onQuantityChange, onRemove }) {
  const material = materials.find((m) => m.id === line.material_id)
  const unit = material?.unit || ''

  // Per-line subtotal: null when we don't have enough data to compute it,
  // which flows through formatCurrency and renders as an em-dash.
  const qty = Number(line.quantity)
  const subtotal = material && Number.isFinite(qty) && qty > 0 ? qty * Number(material.cost) : 0

  // Visual distinction between "empty placeholder" (qty blank) and "actual total"
  // so the user's eye knows which rows are filled in vs pending.
  const hasQty = Number.isFinite(qty) && qty > 0

  // Red border only when the user has typed something that doesn't parse —
  // not when the field is blank (that's a legitimate in-progress state).
  const rawQty = String(line.quantity ?? '').trim()
  const hasInvalidQty = rawQty !== '' && (!Number.isFinite(qty) || qty <= 0)

  // Submit-time errors come in via `error` prop — promote them to the right field.
  const qtyHasSubmitError = error?.field === 'quantity'
  const materialHasSubmitError = error?.field === 'material_id'

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex items-end gap-2">
        {/* Material dropdown — grows to fill width */}
        <div className="min-w-0 flex-1 space-y-1">
          <label className="text-xs text-gray-500">Cost</label>
          <select
            value={line.material_id}
            onChange={(e) => onMaterialChange(e.target.value)}
            className={`flex h-10 w-full rounded-lg border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
              materialHasSubmitError ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity + unit suffix */}
        <div className="w-24 space-y-1 sm:w-28">
          <label className="text-xs text-gray-500">Qty</label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0"
              value={line.quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
              invalid={hasInvalidQty || qtyHasSubmitError}
              className={`h-10 text-sm ${unit ? 'pr-10' : ''}`}
            />
            {unit && (
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {unit}
              </span>
            )}
          </div>
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove material line"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Subtotal column — to the right of the × button. Muted when empty so
            the row doesn't shout "0.00 CHF" before the user has typed a quantity. */}
        <div className="w-24 space-y-1 text-right sm:w-28">
          <label className="text-xs text-gray-500">Subtotal</label>
          <div
            className={`flex h-10 items-center justify-end text-sm font-semibold tabular-nums ${
              hasQty ? 'text-brand-800' : 'text-gray-300'
            }`}
          >
            {formatCurrency(subtotal)}
          </div>
        </div>
      </div>

      {/* Inline error message for this line (shown only after a failed submit) */}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error.message}
        </p>
      )}
    </div>
  )
}
