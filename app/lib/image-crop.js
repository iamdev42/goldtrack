/**
 * Take an image URL, a crop area in pixels, and a rotation in degrees,
 * return a JPEG blob of the cropped+rotated region.
 *
 * Rotation support is non-obvious: we first draw the source image onto a
 * large "canvas canvas" that's rotated around its centre, then we extract
 * the crop sub-rectangle from that rotated canvas. The library gives us
 * crop coordinates in the ORIGINAL (un-rotated) image space, so we have to
 * translate them.
 *
 * Quality is set to 0.9 which is indistinguishable from 1.0 for photographs
 * but ~3x smaller — better for upload speed and storage.
 *
 * @param {string}  imageSrc   Blob URL or remote URL of the source image
 * @param {object}  cropArea   { x, y, width, height } in source-image pixels
 * @param {number}  rotation   Degrees (library convention: 0, 90, 180, 270)
 * @returns {Promise<Blob>}
 */
export async function getCroppedBlob(imageSrc, cropArea, rotation = 0) {
  const image = await loadImage(imageSrc)

  // When rotated by 90° or 270°, width/height swap. This matters for the
  // intermediate canvas size we allocate below.
  const rotRad = (rotation * Math.PI) / 180
  const { width: bBoxWidth, height: bBoxHeight } = rotatedBoundingBox(
    image.width,
    image.height,
    rotRad
  )

  // Step 1: draw the (possibly rotated) source onto an intermediate canvas.
  // We rotate around the centre so pixels don't shift off the canvas.
  const intermediate = document.createElement('canvas')
  intermediate.width = bBoxWidth
  intermediate.height = bBoxHeight
  const iCtx = intermediate.getContext('2d')
  iCtx.translate(bBoxWidth / 2, bBoxHeight / 2)
  iCtx.rotate(rotRad)
  iCtx.drawImage(image, -image.width / 2, -image.height / 2)

  // Step 2: extract the crop rectangle from the intermediate canvas.
  const output = document.createElement('canvas')
  output.width = Math.round(cropArea.width)
  output.height = Math.round(cropArea.height)
  const oCtx = output.getContext('2d')
  oCtx.drawImage(
    intermediate,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  )

  // Step 3: encode to JPEG blob.
  return await new Promise((resolve, reject) => {
    output.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob returned null'))
      },
      'image/jpeg',
      0.9
    )
  })
}

/** Load an image URL into an HTMLImageElement, CORS-safe for blob URLs. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)))
    img.src = src
  })
}

/**
 * Compute the bounding box of a rectangle after rotation.
 * For 0°/180° the box equals (w, h); for 90°/270° it swaps to (h, w).
 */
function rotatedBoundingBox(width, height, rotRad) {
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}
