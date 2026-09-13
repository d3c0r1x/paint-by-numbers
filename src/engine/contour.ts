/** Contours per SPEC Task 7: boundary pixel where the label differs from the
 * right or bottom neighbor; drawn black, 2 px at working resolution. */

export function buildContourMask(
  labels: Uint32Array,
  width: number,
  height: number,
): Uint8Array {
  const mask = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      const p = row + x
      const l = labels[p]
      if (x + 1 < width && labels[p + 1] !== l) {
        mask[p] = 1
        mask[p + 1] = 1
      }
      if (y + 1 < height && labels[p + width] !== l) {
        mask[p] = 1
        mask[p + width] = 1
      }
    }
  }
  return mask
}

/** Paint the contour mask black with ~2 px thickness at working resolution. */
export function drawContours(
  ctx: CanvasRenderingContext2D,
  mask: Uint8Array,
  width: number,
  height: number,
): void {
  ctx.save()
  ctx.fillStyle = '#000000'
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (mask[row + x]) ctx.fillRect(x, y, 2, 2)
    }
  }
  ctx.restore()
}
