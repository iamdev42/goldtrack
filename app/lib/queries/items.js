import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '~/lib/supabase'
import { itemToDbPayload } from '~/lib/validations/item'

/** Query key factory — see customers.js for the convention. */
export const itemKeys = {
  all: ['items'],
  lists: () => [...itemKeys.all, 'list'],
  list: (tenantId) => [...itemKeys.lists(), tenantId],
  details: () => [...itemKeys.all, 'detail'],
  detail: (id) => [...itemKeys.details(), id],
}

// ── Reads ─────────────────────────────────────────────────────

/**
 * List all items for the current tenant.
 * Joins the linked customer's name for display.
 *
 * @param {string | null} tenantId
 */
export function useItems(tenantId) {
  return useQuery({
    queryKey: itemKeys.list(tenantId),
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select(
          '*, customer:customers(name), bom:item_materials(id, material_id, quantity, material:materials(id, name, unit, cost))'
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

// ── BOM save ──────────────────────────────────────────────────

/**
 * Atomically replace all BOM lines for an item. Wraps the server-side RPC
 * `save_item_bom` created in migration 009. Either every line is saved or
 * none are.
 *
 * @param {string} itemId
 * @param {Array<{ material_id: string, quantity: number }>} lines
 */
export async function saveItemBom(itemId, lines) {
  const { error } = await supabase.rpc('save_item_bom', {
    p_item_id: itemId,
    p_lines: lines,
  })
  if (error) throw error
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateItem(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('items')
        .insert({ ...itemToDbPayload(input), tenant_id: tenantId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.list(tenantId) }),
  })
}

export function useUpdateItem(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input, photos }) => {
      const payload = itemToDbPayload(input)
      if (photos !== undefined) payload.photos = photos
      const { data, error } = await supabase
        .from('items')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: itemKeys.list(tenantId) })
      qc.invalidateQueries({ queryKey: itemKeys.detail(data.id) })
    },
  })
}

export function useDeleteItem(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item) => {
      // Clean up attached photos from Storage before deleting the row.
      if (item.photos?.length) {
        const paths = item.photos.map(photoPathFromUrl).filter(Boolean)
        if (paths.length) {
          await supabase.storage.from('item-photos').remove(paths)
        }
      }
      const { error } = await supabase.from('items').delete().eq('id', item.id)
      if (error) throw error
      return item.id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.list(tenantId) }),
  })
}

// ── Photo helpers ─────────────────────────────────────────────

/**
 * Upload a photo to the `item-photos` bucket.
 * Path convention: `{tenantId}/{itemId}/{timestamp}.{ext}` — enforced by Storage RLS.
 *
 * @param {{ tenantId: string, itemId: string, file: File }} args
 * @returns {Promise<string>}  Public URL of the uploaded photo
 */
export async function uploadItemPhoto({ tenantId, itemId, file }) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${tenantId}/${itemId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('item-photos')
    .upload(path, file, { upsert: false, cacheControl: '3600' })
  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from('item-photos').getPublicUrl(path)
  return publicUrl
}

/**
 * Reverse of the upload path: given a public URL, derive the storage path.
 * Returns `null` if the URL isn't a valid item-photos URL.
 *
 * @param {string} url
 */
export function photoPathFromUrl(url) {
  try {
    const pathname = new URL(url).pathname
    const parts = pathname.split('/item-photos/')
    return parts.length > 1 ? parts[1] : null
  } catch {
    return null
  }
}

/** Maximum number of photos per item. Enforced in the form UI. */
export const MAX_ITEM_PHOTOS = 3

/**
 * Remove a list of photos from Storage by their public URLs.
 * Used when the user removes existing photos in the edit dialog.
 *
 * @param {string[]} urls
 */
export async function removeItemPhotos(urls) {
  const paths = urls.map(photoPathFromUrl).filter(Boolean)
  if (!paths.length) return
  const { error } = await supabase.storage.from('item-photos').remove(paths)
  if (error) throw error
}
