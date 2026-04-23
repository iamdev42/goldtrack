import { Plus, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

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
 *   onChange: (lines: Array<{ material_id: string, quantity: string | number }>) => void,
 * }} props
 */
export function BomEditor({ lines, materials, onChange }) {
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
            <p className="text-lg font-semibold text-brand-800">
              {total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/** One row: material dropdown + quantity input + unit label + remove button. */
function BomLineRow({ line, materials, onMaterialChange, onQuantityChange, onRemove }) {
  const material = materials.find((m) => m.id === line.material_id)
  const unit = material?.unit || ''

  return (
    <div className="flex items-end gap-2 rounded-xl border border-gray-100 bg-white p-3">
      {/* Material dropdown — grows to fill width */}
      <div className="min-w-0 flex-1 space-y-1">
        <label className="text-xs text-gray-500">Material</label>
        <select
          value={line.material_id}
          onChange={(e) => onMaterialChange(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity + unit suffix */}
      <div className="w-28 space-y-1">
        <label className="text-xs text-gray-500">Qty</label>
        <div className="relative">
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0"
            value={line.quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            className={`h-10 text-sm ${unit ? 'pr-12' : ''}`}
          />
          {unit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
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
    </div>
  )
}
