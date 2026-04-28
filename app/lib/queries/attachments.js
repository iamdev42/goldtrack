import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '~/lib/supabase'
import { ATTACHMENT_BUCKET } from '~/lib/validations/attachment'

export const attachmentKeys = {
  all: ['attachments'],
  forParent: (kind, id) => [...attachmentKeys.all, kind, id],
}

/**
 * List all attachments for a given parent (today: an item).
 *
 * @param {'item' | 'customer' | 'tenant'} kind
 * @param {string | null} id
 */
export function useAttachments(kind, id) {
  return useQuery({
    queryKey: attachmentKeys.forParent(kind, id),
    enabled: !!kind && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('attached_to_kind', kind)
        .eq('attached_to_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/**
 * Upload a file to Supabase Storage and create the matching attachments
 * row. Both halves must succeed; if the DB insert fails after upload we
 * delete the orphaned file to avoid storage drift.
 *
 * Path layout: `{tenant_id}/{kind}s/{parent_id}/{uuid}-{filename}`
 *
 * @returns {{
 *   tenantId: string,
 *   parentKind: 'item' | 'customer' | 'tenant',
 *   parentId: string,
 * }} parent
 */
export function useUploadAttachment(parent) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, category, note }) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      // Random prefix prevents accidental collisions for files with the same name.
      const path = `${parent.tenantId}/${parent.parentKind}s/${parent.parentId}/${crypto.randomUUID()}-${safeName}`

      const { error: uploadErr } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })
      if (uploadErr) throw uploadErr

      const { data, error: insertErr } = await supabase
        .from('attachments')
        .insert({
          tenant_id: parent.tenantId,
          attached_to_kind: parent.parentKind,
          attached_to_id: parent.parentId,
          category,
          note: note || null,
          storage_path: path,
          filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        })
        .select()
        .single()

      if (insertErr) {
        // Orphan cleanup — best effort, don't mask the original error.
        await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove([path])
          .catch(() => {})
        throw insertErr
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: attachmentKeys.forParent(parent.parentKind, parent.parentId),
      })
    },
  })
}

/**
 * Delete an attachment: the DB row first, then the storage object.
 * Doing it in this order means that if storage deletion fails, the row is
 * already gone — orphaned files are easier to clean up later than orphaned rows.
 */
export function useDeleteAttachment(parent) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (attachment) => {
      const { error: dbErr } = await supabase.from('attachments').delete().eq('id', attachment.id)
      if (dbErr) throw dbErr
      // Best-effort storage cleanup. If it fails (e.g. object already gone),
      // the user-facing operation still succeeded.
      await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .remove([attachment.storage_path])
        .catch(() => {})
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: attachmentKeys.forParent(parent.parentKind, parent.parentId),
      })
    },
  })
}

/**
 * Get a short-lived signed URL for opening / downloading an attachment.
 * The bucket is private, so we don't expose direct URLs.
 *
 * @param {string} storagePath
 * @param {number} [expiresInSec=300]
 */
export async function getAttachmentSignedUrl(storagePath, expiresInSec = 300) {
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, expiresInSec)
  if (error) throw error
  return data.signedUrl
}
