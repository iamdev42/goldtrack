import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '~/lib/supabase'
import { tenantSettingsToDbPayload } from '~/lib/validations/tenant'

export const tenantKeys = {
  all: ['tenants'],
  detail: (id) => [...tenantKeys.all, 'detail', id],
}

/**
 * Load the full tenant row for the settings page (authenticated).
 * Different from useCatalogueTenant — this is for the goldsmith editing
 * her own settings, so it's a member-only authenticated read.
 *
 * @param {string | null} tenantId
 */
export function useTenantSettings(tenantId) {
  return useQuery({
    queryKey: tenantKeys.detail(tenantId),
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, public_display_name, public_bio')
        .eq('id', tenantId)
        .single()
      if (error) throw error
      return data
    },
  })
}

/**
 * Update the public catalogue settings on a tenant. Slug uniqueness is
 * enforced by the DB constraint, surfaced as a 23505 error.
 *
 * @param {string | null} tenantId
 */
export function useUpdateTenantSettings(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input) => {
      const { error } = await supabase
        .from('tenants')
        .update(tenantSettingsToDbPayload(input))
        .eq('id', tenantId)
      if (error) {
        // Surface "slug already taken" with a friendly message.
        if (error.code === '23505') {
          throw new Error('That shop URL is already taken — try another.')
        }
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) })
    },
  })
}
