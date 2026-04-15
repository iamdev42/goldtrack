import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTenant() {
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      if (data) setTenantId(data.tenant_id)
      setLoading(false)
    }
    load()
  }, [])

  return { tenantId, loading }
}
