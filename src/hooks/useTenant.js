import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTenant() {
  const [tenantId, setTenantId] = useState(null)
  const [tenantName, setTenantName] = useState(null)
  const [userName, setUserName] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Derive display name: prefer user_metadata.full_name/name, fall back to email local part
      const meta = user.user_metadata || {}
      const displayName = meta.full_name || meta.name || user.email?.split('@')[0] || null
      setUserName(displayName)

      const { data, error } = await supabase
        .from('memberships')
        .select('tenant_id, tenants(name)')
        .eq('user_id', user.id)
        .single()

      console.log('[useTenant] user:', user.id, 'membership:', data, 'error:', error)

      if (data) {
        setTenantId(data.tenant_id)
        setTenantName(data.tenants?.name || null)
      }
      setLoading(false)
    }
    load()
  }, [])

  return { tenantId, tenantName, userName, loading }
}
