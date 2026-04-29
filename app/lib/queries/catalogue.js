import { useQuery } from '@tanstack/react-query'
import { supabase } from '~/lib/supabase'

/**
 * Public catalogue queries.
 *
 * These run unauthenticated — they rely on the public RLS policies added
 * in migration 013, which only return:
 *   * tenants accessed by slug
 *   * items where is_published = true AND status = 'for_sale'
 *
 * Photos come from the public `item-photos` bucket (already public in
 * migration 002), so URLs work without signing.
 */

export const catalogueKeys = {
  all: ['catalogue'],
  tenant: (slug) => [...catalogueKeys.all, 'tenant', slug],
  items: (tenantId) => [...catalogueKeys.all, 'items', tenantId],
  item: (tenantId, itemId) => [...catalogueKeys.all, 'item', tenantId, itemId],
}

/**
 * Fetch the public profile of a tenant by slug. Returns the slim "safe"
 * fields only — even though RLS would let us select more, we explicitly
 * limit the SELECT here to avoid leaking anything that's added to the
 * tenants table later.
 *
 * @param {string | null} slug
 * @returns {{ data: { id: string, slug: string, name: string, public_display_name: string | null, public_bio: string | null } | null }}
 */
export function useCatalogueTenant(slug) {
  return useQuery({
    queryKey: catalogueKeys.tenant(slug),
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, slug, name, public_display_name, public_bio')
        .eq('slug', slug)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/**
 * Fetch the public catalogue items for a tenant.
 *
 * Selects only the fields safe for public display. Notably, we omit:
 *   - customer_id (sensitive linkage)
 *   - is_published / created_at (internal)
 *   - BOM / adhoc / attachments (private business data)
 *
 * Photos are returned as raw URLs that work directly because the bucket
 * is public.
 *
 * @param {string | null} tenantId
 */
export function useCatalogueItems(tenantId) {
  return useQuery({
    queryKey: catalogueKeys.items(tenantId),
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, description, category, price, photos, weight_g')
        .eq('tenant_id', tenantId)
        // RLS already enforces these but we filter explicitly so the query
        // intent is obvious from the call site.
        .eq('is_published', true)
        .eq('status', 'for_sale')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/**
 * Fetch a single catalogue item. RLS still enforces is_published + status,
 * so an unpublished item ID returns null (not an error).
 *
 * @param {string | null} tenantId
 * @param {string | null} itemId
 */
export function useCatalogueItem(tenantId, itemId) {
  return useQuery({
    queryKey: catalogueKeys.item(tenantId, itemId),
    enabled: !!tenantId && !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, description, category, price, photos, weight_g')
        .eq('tenant_id', tenantId)
        .eq('id', itemId)
        .eq('is_published', true)
        .eq('status', 'for_sale')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
