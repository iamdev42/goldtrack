import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '~/lib/supabase'
import { customerToDbPayload } from '~/lib/validations/customer'

/**
 * Query key factory — keeps cache keys consistent across the app.
 * Example: queryClient.invalidateQueries({ queryKey: customerKeys.list(tenantId) })
 */
export const customerKeys = {
  all: ['customers'],
  lists: () => [...customerKeys.all, 'list'],
  list: (tenantId) => [...customerKeys.lists(), tenantId],
  details: () => [...customerKeys.all, 'detail'],
  detail: (id) => [...customerKeys.details(), id],
}

// ── Reads ─────────────────────────────────────────────────────

/**
 * List all customers for the current tenant, alphabetical by name.
 * RLS enforces tenant isolation on the DB side.
 *
 * @param {string | null} tenantId
 */
export function useCustomers(tenantId) {
  return useQuery({
    queryKey: customerKeys.list(tenantId),
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

/** Fetch a single customer by id. */
export function useCustomer(id) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
  })
}

// ── Mutations ─────────────────────────────────────────────────

/**
 * Create a new customer. On success, invalidates the list cache so the UI refreshes.
 *
 * @param {string} tenantId
 */
export function useCreateCustomer(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customerToDbPayload(input), tenant_id: tenantId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.list(tenantId) })
    },
  })
}

export function useUpdateCustomer(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customerToDbPayload(input))
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: customerKeys.list(tenantId) })
      qc.invalidateQueries({ queryKey: customerKeys.detail(data.id) })
    },
  })
}

export function useDeleteCustomer(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.list(tenantId) })
    },
  })
}
