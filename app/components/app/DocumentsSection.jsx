import { useRef, useState } from 'react'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { AddDocumentDialog } from '~/components/app/AddDocumentDialog'
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  getAttachmentSignedUrl,
} from '~/lib/queries/attachments'
import {
  ATTACHMENT_ACCEPT_ATTR,
  CATEGORY_LABELS,
  formatBytes,
  validateAttachmentFile,
} from '~/lib/validations/attachment'

/**
 * Documents section embedded into the item dialog. Manages its own state:
 * fetches attachments, owns the upload dialog, drives delete confirmations.
 *
 * The parent doesn't need to do anything with this beyond mounting it.
 *
 * @param {{
 *   tenantId: string,
 *   itemId: string | null,  // null when the parent item hasn't been saved yet
 * }} props
 */
export function DocumentsSection({ tenantId, itemId }) {
  const fileInputRef = useRef(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  // Empty itemId = item not yet saved. The query is disabled in that case.
  const { data: attachments = [], isLoading } = useAttachments('item', itemId)
  const upload = useUploadAttachment({ tenantId, parentKind: 'item', parentId: itemId })
  const remove = useDeleteAttachment({ tenantId, parentKind: 'item', parentId: itemId })

  // If the item hasn't been saved yet, attachments aren't possible (no item id
  // to attach to). We render a friendly stub instead of the full UI.
  if (!itemId) {
    return (
      <div className="space-y-2">
        <Label>Documents</Label>
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Save the item first — then you can attach receipts, certificates, and more.
        </p>
      </div>
    )
  }

  function onPickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file twice in a row
    if (!file) return

    // Pre-flight check the file before opening the dialog. If invalid, we
    // surface an error inline at the top of the section (not in the dialog).
    const err = validateAttachmentFile(file)
    if (err) {
      setUploadError(err)
      return
    }
    setUploadError(null)
    setPendingFile(file)
  }

  async function handleConfirm({ file, category, note }) {
    setUploadError(null)
    try {
      await upload.mutateAsync({ file, category, note })
      setPendingFile(null)
    } catch (err) {
      setUploadError(err.message || 'Could not upload file')
    }
  }

  async function handleRemove(attachment) {
    if (!confirm(`Remove "${attachment.filename}"?`)) return
    try {
      await remove.mutateAsync(attachment)
    } catch (err) {
      setUploadError(err.message || 'Could not remove file')
    }
  }

  async function handleOpen(attachment) {
    try {
      const url = await getAttachmentSignedUrl(attachment.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setUploadError(err.message || 'Could not open file')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Documents</Label>
        <Button
          type="button"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          className="text-brand-700 hover:bg-brand-50"
        >
          <Plus className="h-4 w-4" />
          Add document
        </Button>
      </div>

      {/* Hidden file input — the visible button triggers it */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT_ATTR}
        className="hidden"
        onChange={onPickFile}
      />

      {uploadError && (
        <p role="alert" className="text-sm text-red-600">
          {uploadError}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading documents…</p>
      ) : attachments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400">
          No documents yet. Tap &ldquo;+ Add document&rdquo; to attach receipts, certificates, and
          more.
        </p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3"
            >
              {/* Icon */}
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  a.mime_type?.startsWith('image/')
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {a.mime_type?.startsWith('image/') ? 'IMG' : 'PDF'}
              </div>

              {/* Filename + metadata */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{a.filename}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                    {CATEGORY_LABELS[a.category] || a.category}
                  </span>
                  <span>{formatBytes(a.size_bytes)}</span>
                  {a.note && <span className="truncate">· {a.note}</span>}
                </div>
              </div>

              {/* Actions */}
              <button
                type="button"
                onClick={() => handleOpen(a)}
                aria-label="Open"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-brand-50 hover:text-brand-700"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(a)}
                aria-label="Remove"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddDocumentDialog
        file={pendingFile}
        onConfirm={handleConfirm}
        onCancel={() => setPendingFile(null)}
        uploading={upload.isPending}
        error={uploadError}
      />
    </div>
  )
}
