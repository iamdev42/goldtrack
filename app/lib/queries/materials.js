import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '~/lib/supabase'
import { materialToDbPayload } from '~/lib/validations/material'

/**
 * Query key factory — see customers.js for the convention.
 */
export const materialKeys = {
  all: ['materials'],
  lists: () => [...materialKeys.all, 'list'],
  list: (tenantId) => [...materialKeys.lists(), tenantId],
  details: () => [...materialKeys.all, 'detail'],
  detail: (id) => [...materialKeys.details(), id],
}

// ── Reads ─────────────────────────────────────────────────────

/**
 * List all materials for the current tenant, alphabetical.
 * RLS enforces tenant isolation on the DB side.
 *
 * @param {string | null} tenantId
 */
export function useMaterials(tenantId) {
  return useQuery({
    queryKey: materialKeys.list(tenantId),
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateMaterial(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('materials')
        .insert({ ...materialToDbPayload(input), tenant_id: tenantId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: materialKeys.list(tenantId) })
    },
  })
}

export function useUpdateMaterial(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }) => {
      const { data, error } = await supabase
        .from('materials')
        .update(materialToDbPayload(input))
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: materialKeys.list(tenantId) })
      qc.invalidateQueries({ queryKey: materialKeys.detail(data.id) })
    },
  })
}

export function useDeleteMaterial(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('materials').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: materialKeys.list(tenantId) })
    },
  })
}
