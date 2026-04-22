import { useEffect, useState } from 'react'
import { supabase } from '~/lib/supabase'

/**
 * Load the current user's tenant (shop) membership and display name.
 *
 * In a future version this will move to a route loader so every page has
 * tenant data already available. For Milestone 1 we keep it as a hook
 * to match the prototype's pattern.
 *
 * @returns {{
 *   tenantId: string | null,
 *   tenantName: string | null,
 *   userName: string | null,
 *   loading: boolean,
 * }}
 */
export function useTenant() {
  const [tenantId, setTenantId] = useState(null)
  const [tenantName, setTenantName] = useState(null)
  const [userName, setUserName] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }

      const meta = user.user_metadata || {}
      const displayName = meta.full_name || meta.name || user.email?.split('@')[0] || null

      const { data } = await supabase
        .from('memberships')
        .select('tenant_id, tenants(name)')
        .eq('user_id', user.id)
        .single()

      if (cancelled) return
      setUserName(displayName)
      if (data) {
        setTenantId(data.tenant_id)
        setTenantName(data.tenants?.name || null)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { tenantId, tenantName, userName, loading }
}
