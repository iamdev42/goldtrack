import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '~/lib/supabase'

/**
 * Tenant defaults are user-set "starting values" — currently only default
 * materials, which pre-fill the BOM on brand-new items.
 *
 * The shape of the table is `(tenant_id, kind, value)` so we can add more
 * default kinds later without new tables. See migration 010 for details.
 */

export const tenantDefaultKeys = {
  all: ['tenant-defaults'],
  byKind: (tenantId, kind) => [...tenantDefaultKeys.all, tenantId, kind],
}

/**
 * List all default material IDs for this tenant.
 * Returns an array of UUID strings (possibly empty).
 *
 * @param {string | null} tenantId
 */
export function useDefaultMaterialIds(tenantId) {
  return useQuery({
    queryKey: tenantDefaultKeys.byKind(tenantId, 'material'),
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_defaults')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('kind', 'material')
      if (error) throw error
      return data.map((row) => row.value)
    },
  })
}

/**
 * Toggle a material's default status.
 *
 * - `isDefault === true`  → INSERT (or do nothing if already set)
 * - `isDefault === false` → DELETE the row
 *
 * The UI shows a checkbox per material; this mutation runs per click.
 *
 * @param {string | null} tenantId
 */
export function useSetMaterialDefault(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ materialId, isDefault }) => {
      if (isDefault) {
        // Ignore conflict errors — the unique constraint means inserting an
        // already-default material is a no-op, which is exactly what we want.
        const { error } = await supabase
          .from('tenant_defaults')
          .insert({ tenant_id: tenantId, kind: 'material', value: materialId })
        // "duplicate key value" is code 23505 — swallow it so double-clicks
        // don't error.
        if (error && error.code !== '23505') throw error
      } else {
        const { error } = await supabase
          .from('tenant_defaults')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('kind', 'material')
          .eq('value', materialId)
        if (error) throw error
      }
      return { materialId, isDefault }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantDefaultKeys.byKind(tenantId, 'material') })
    },
  })
}
