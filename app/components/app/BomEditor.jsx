import { Plus, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { computeBomCost } from '~/lib/validations/item'
import { formatCurrency } from '~/lib/utils'

// Sentinel value in the <select> for the ad-hoc "Other" option. Stored as a
// fixed string in the dropdown; when picked, the line shape-shifts.
const ADHOC_SENTINEL = '__adhoc__'
const ADHOC_LABEL = 'Other / Stone / 3rd-party work'

/**
 * Editable BOM (Bill of Materials) list.
 *
 * Fully controlled by its parent — receives `lines`, emits `onChange(lines)`
 * with every edit. Does its own math to show a running total.
 *
 * Line kinds:
 *   - { kind: 'material', material_id, quantity } — references the registry
 *   - { kind: 'adhoc',    description,  cost   } — one-off entry on this item
 * Lines without a `kind` are treated as 'material' for backwards compat.
 *
 * @param {{
 *   lines: Array<object>,
 *   materials: Array<{ id: string, name: string, unit: string | null, cost: number }>,
 *   errors?: Array<null | { field: string, message: string }>,
 *   onChange: (lines: Array<object>) => void,
 * }} props
 */
export function BomEditor({ lines, materials, errors = [], onChange }) {
  // If no materials are registered, only ad-hoc entries are possible. We still
  // allow the user to add ad-hoc lines — don't block the whole editor.
  const noRegistry = materials.length === 0

  function addLine() {
    // Default new lines to a registered material if any exist, otherwise ad-hoc.
    const next = noRegistry
      ? { kind: 'adhoc', description: '', cost: '' }
      : { kind: 'material', material_id: materials[0].id, quantity: '' }
    onChange([...lines, next])
  }

  function removeLine(index) {
    onChange(lines.filter((_, i) => i !== index))
  }

  /** Patch one field of one line. */
  function updateLineField(index, field, value) {
    onChange(lines.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  /**
   * Dropdown changed: either switch registered materials, or convert the line
   * to/from ad-hoc. A conversion reshapes the object — we clear the old fields
   * so stale values can't leak through on save.
   */
  function onDropdownChange(index, selectedValue) {
    onChange(
      lines.map((l, i) => {
        if (i !== index) return l
        if (selectedValue === ADHOC_SENTINEL) {
          // Becomes ad-hoc (or stays ad-hoc — either way reset to a clean shape)
          return { kind: 'adhoc', description: '', cost: '' }
        }
        // Becomes a registered-material line
        return { kind: 'material', material_id: selectedValue, quantity: '' }
      })
    )
  }

  const total = computeBomCost(lines, materials)

  return (
    <div className="space-y-3">
      <Label>Bill of materials</Label>

      {lines.length === 0 && noRegistry && (
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
          <span className="ml-auto text-xs text-gray-400">
            (you can still add ad-hoc entries below)
          </span>
        </div>
      )}

      {lines.length === 0 && !noRegistry && (
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
          onDropdownChange={(value) => onDropdownChange(i, value)}
          onFieldChange={(field, value) => updateLineField(i, field, value)}
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
 * A single BOM row. The row's layout depends on the line's `kind`:
 *
 *   Material line: [dropdown]  [qty + unit]  [×]  [subtotal]
 *   Ad-hoc line:   [dropdown]  [description]  [cost]  [×]  [subtotal]
 *
 * The dropdown is ALWAYS the leftmost element so the user's mental model
 * ("pick what kind of cost this is") stays identical. Switching the dropdown
 * to "Other / Stone / 3rd-party work" reshapes the row in place.
 */
function BomLineRow({ line, materials, error, onDropdownChange, onFieldChange, onRemove }) {
  const isAdhoc = line.kind === 'adhoc'

  // Dropdown value for the controlled <select>. Ad-hoc lines render the
  // sentinel so the "Other..." option is shown as the current choice.
  const dropdownValue = isAdhoc ? ADHOC_SENTINEL : line.material_id || ''

  // Submit-time errors map to different fields depending on the line kind.
  const dropdownHasError = error?.field === 'material_id'
  const qtyHasError = error?.field === 'quantity'
  const descriptionHasError = error?.field === 'description'
  const costHasError = error?.field === 'cost'

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex items-end gap-2">
        {/* Dropdown — same in both modes. In ad-hoc mode we make space by
            capping its max width; otherwise the fixed-width inputs to the
            right can squeeze it below usable size and only the border's gold
            stroke shows on the left edge. */}
        <div className={`min-w-0 space-y-1 ${isAdhoc ? 'w-24 flex-shrink-0 sm:w-28' : 'flex-1'}`}>
          <label className="text-xs text-gray-500">Cost</label>
          <select
            value={dropdownValue}
            onChange={(e) => onDropdownChange(e.target.value)}
            className={`flex h-10 w-full rounded-lg border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
              dropdownHasError ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            {materials.length > 0 && <option disabled>──────────</option>}
            <option value={ADHOC_SENTINEL}>{ADHOC_LABEL}</option>
          </select>
        </div>

        {isAdhoc ? (
          <AdhocInputs
            line={line}
            descriptionHasError={descriptionHasError}
            costHasError={costHasError}
            onFieldChange={onFieldChange}
          />
        ) : (
          <MaterialInputs
            line={line}
            materials={materials}
            qtyHasError={qtyHasError}
            onFieldChange={onFieldChange}
          />
        )}

        {/* Remove button — stays in the same place for both kinds */}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove this line"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <X className="h-4 w-4" />
        </button>

        <RowSubtotal line={line} materials={materials} />
      </div>

      {/* Inline error for this line (after a failed submit) */}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error.message}
        </p>
      )}
    </div>
  )
}

/** Inputs shown when the line references the materials registry. */
function MaterialInputs({ line, materials, qtyHasError, onFieldChange }) {
  const material = materials.find((m) => m.id === line.material_id)
  const unit = material?.unit || ''

  const qty = Number(line.quantity)
  const rawQty = String(line.quantity ?? '').trim()
  const hasInvalidQty = rawQty !== '' && (!Number.isFinite(qty) || qty <= 0)

  return (
    <div className="w-24 space-y-1 sm:w-28">
      <label className="text-xs text-gray-500">Qty</label>
      <div className="relative">
        <Input
          type="number"
          placeholder="0"
          value={line.quantity}
          onChange={(e) => onFieldChange('quantity', e.target.value)}
          invalid={hasInvalidQty || qtyHasError}
          className={`h-10 text-sm ${unit ? 'pr-10' : ''}`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

/** Inputs shown for an ad-hoc "Other" line: description + cost, no quantity. */
function AdhocInputs({ line, descriptionHasError, costHasError, onFieldChange }) {
  return (
    <>
      {/* Description grows to fill whatever space is left between the dropdown and the cost */}
      <div className="min-w-0 flex-1 space-y-1">
        <label className="text-xs text-gray-500">Description</label>
        <Input
          type="text"
          placeholder="e.g. 1.2ct diamond"
          value={line.description ?? ''}
          onChange={(e) => onFieldChange('description', e.target.value)}
          invalid={descriptionHasError}
          className="h-10 text-sm"
          maxLength={100}
        />
      </div>
      <div className="w-24 flex-shrink-0 space-y-1 sm:w-28">
        <label className="text-xs text-gray-500">Cost</label>
        <Input
          type="number"
          placeholder="0"
          value={line.cost ?? ''}
          onChange={(e) => onFieldChange('cost', e.target.value)}
          invalid={costHasError}
          className="h-10 text-sm"
        />
      </div>
    </>
  )
}

/** Right-most subtotal column — works for both line kinds. */
function RowSubtotal({ line, materials }) {
  let subtotal = 0
  let active = false

  if (line.kind === 'adhoc') {
    const c = Number(line.cost)
    if (Number.isFinite(c) && c > 0) {
      subtotal = c
      active = true
    }
  } else {
    const mat = materials.find((m) => m.id === line.material_id)
    const qty = Number(line.quantity)
    if (mat && Number.isFinite(qty) && qty > 0) {
      subtotal = qty * Number(mat.cost)
      active = true
    }
  }

  return (
    <div className="w-24 space-y-1 text-right sm:w-28">
      <label className="text-xs text-gray-500">Subtotal</label>
      <div
        className={`flex h-10 items-center justify-end text-sm font-semibold tabular-nums ${
          active ? 'text-brand-800' : 'text-gray-300'
        }`}
      >
        {formatCurrency(subtotal)}
      </div>
    </div>
  )
}
