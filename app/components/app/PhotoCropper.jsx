import { useCallback, useEffect, useMemo, useState } from 'react'
import Cropper from 'react-easy-crop'
import { RotateCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { getCroppedBlob } from '~/lib/image-crop'
import { cn } from '~/lib/utils'

/**
 * Full-screen dialog that lets the user crop, zoom and rotate a single image
 * before it gets uploaded.
 *
 * Usage: pass a File via the `file` prop. The component creates an object URL
 * for it internally and cleans up when it closes. Emits one of:
 *   - onComplete(blob)  — user confirmed, blob is the cropped JPEG
 *   - onUseAsIs(file)   — user skipped cropping, original File passed back
 *   - onCancel()        — user cancelled, nothing uploads
 *
 * Only one of the three fires per session.
 *
 * @param {{
 *   file: File | null,
 *   onComplete: (blob: Blob) => void,
 *   onUseAsIs: (file: File) => void,
 *   onCancel: () => void,
 * }} props
 */
export function PhotoCropper({ file, onComplete, onUseAsIs, onCancel }) {
  // Convert the incoming File into an object URL so Cropper can load it.
  // useMemo ensures we only create one URL per file and revoke the previous one.
  const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect] = useState(undefined) // undefined = free-form
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Reset transient state when a new file comes in (for multi-file queues)
  useEffect(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setAspect(undefined)
    setCroppedAreaPixels(null)
    setError(null)
  }, [file])

  // react-easy-crop hands us the final crop in image-pixel coordinates
  // after every drag/zoom/rotate. We stash it for the confirm handler.
  const onCropComplete = useCallback((_areaPercent, areaPixels) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  async function handleConfirm() {
    if (!imageUrl || !croppedAreaPixels) return
    setSaving(true)
    setError(null)
    try {
      const blob = await getCroppedBlob(imageUrl, croppedAreaPixels, rotation)
      onComplete(blob)
    } catch (err) {
      setError(err.message || 'Could not crop image')
      setSaving(false)
    }
  }

  function handleUseAsIs() {
    if (file) onUseAsIs(file)
  }

  return (
    <Dialog open={!!file} onOpenChange={(next) => !next && !saving && onCancel()}>
      <DialogContent
        aria-describedby={undefined}
        // Wider than the default dialog so the crop surface is useful
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Crop photo</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>

        {/* Aspect ratio toggle */}
        <div className="flex gap-2 px-6 pt-2">
          <AspectChip
            label="Free"
            active={aspect === undefined}
            onClick={() => setAspect(undefined)}
          />
          <AspectChip label="1:1" active={aspect === 1} onClick={() => setAspect(1)} />
          <AspectChip label="4:3" active={aspect === 4 / 3} onClick={() => setAspect(4 / 3)} />
        </div>

        {/* Crop surface — fixed height so the dialog doesn't jump around.
            Relative+bg so the library's absolute-positioned canvas renders. */}
        <div className="relative mx-6 my-4 h-80 overflow-hidden rounded-xl bg-gray-900">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              restrictPosition={false}
            />
          )}
        </div>

        {/* Controls: zoom slider + rotate button */}
        <div className="flex items-center gap-4 px-6">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-gray-500">Zoom</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </label>

          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="Rotate 90 degrees"
            className="mt-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Error + action buttons */}
        {error && (
          <p role="alert" className="px-6 pt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={handleUseAsIs} disabled={saving}>
            Use as-is
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={saving || !croppedAreaPixels}>
            {saving ? 'Cropping…' : 'Use crop'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AspectChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-brand-600 text-white'
          : 'border border-gray-200 bg-white text-gray-500 hover:border-brand-300 hover:text-brand-700'
      )}
    >
      {label}
    </button>
  )
}
