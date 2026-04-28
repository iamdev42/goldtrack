import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  ATTACHMENT_CATEGORIES,
  CATEGORY_LABELS,
  formatBytes,
  validateAttachmentFile,
} from '~/lib/validations/attachment'

/**
 * Modal that the user sees AFTER picking a file. They confirm the category
 * and add an optional note, then we upload.
 *
 * The file is provided externally (parent does the file picking). Cancelling
 * here just discards the file — nothing has been uploaded yet.
 *
 * @param {{
 *   file: File | null,
 *   onConfirm: (input: { file: File, category: string, note: string }) => Promise<void> | void,
 *   onCancel: () => void,
 *   uploading?: boolean,
 *   error?: string | null,
 * }} props
 */
export function AddDocumentDialog({ file, onConfirm, onCancel, uploading = false, error = null }) {
  const [category, setCategory] = useState('other')
  const [note, setNote] = useState('')
  const [localError, setLocalError] = useState(null)

  // Reset state when a fresh file comes in (covers "added 2 files in a row")
  useEffect(() => {
    if (file) {
      setCategory(guessCategory(file))
      setNote('')
      setLocalError(null)
    }
  }, [file])

  function handleConfirm() {
    if (!file) return
    const fileError = validateAttachmentFile(file)
    if (fileError) {
      setLocalError(fileError)
      return
    }
    onConfirm({ file, category, note })
  }

  return (
    <Dialog open={!!file} onOpenChange={(next) => !next && !uploading && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add document</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {/* File preview row */}
          {file && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
              <FileIcon type={file.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
              </div>
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              {ATTACHMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              type="text"
              placeholder="e.g. Diamond GIA cert no. 12345"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </div>

          {(error || localError) && (
            <p role="alert" className="text-sm text-red-600">
              {error || localError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={uploading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={uploading || !file}>
              {uploading ? 'Uploading…' : 'Add document'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A small mime-type-aware icon. Plain SVG/Unicode so we don't pull lucide. */
function FileIcon({ type }) {
  const isImage = type?.startsWith('image/')
  return (
    <div
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
        isImage ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {isImage ? 'IMG' : 'PDF'}
    </div>
  )
}

/** Best-guess category from the picked file's mime type. The user can change it. */
function guessCategory(file) {
  if (file?.type?.startsWith('image/')) return 'photo'
  return 'other'
}
