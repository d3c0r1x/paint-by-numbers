/** Export per Task 17 + v2/v3: compose background + paint (+ optional vector
 * contours) on an offscreen canvas; `composeLegendExport` appends the black
 * legend strip (symbol + color swatch) like a real paint-by-numbers kit. */
import type { PipelineResult } from '../engine/types';
import { buildRegionPaths } from '../engine/vectorize';
import { drawNumbers } from '../engine/labels';
import { symbolFor } from '../engine/symbols';
import { digitColorFor } from '../ui/ColorCircle';

export interface ExportOptions {
  result: PipelineResult;
  paintCanvas: HTMLCanvasElement;
  withOutlines: boolean;
}

/** Vector contour rendering shared by both export paths. */
function drawVectorContours(
  ctx: CanvasRenderingContext2D,
  labels: Uint32Array,
  width: number,
  height: number,
): void {
  const paths = buildRegionPaths(labels, width, height);
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const path of paths.values()) ctx.stroke(path);
  ctx.restore();
}

export function composeExport(opts: ExportOptions): HTMLCanvasElement {
  const { width, height } = opts.result;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(opts.paintCanvas, 0, 0);

  if (opts.withOutlines) {
    drawVectorContours(ctx, opts.result.labels, width, height);
    drawNumbers(ctx, opts.result.regions);
  }
  return canvas;
}

/** Append the reference-style black legend strip: one cell per palette color
 * (symbol + swatch), wrapped to rows. Returns a NEW canvas (original intact). */
export function composeLegendExport(opts: ExportOptions): HTMLCanvasElement {
  const src = composeExport(opts);
  const { result } = opts;
  const palette = result.palette;
  const cell = Math.max(44, Math.round(src.width / 12));
  const cols = Math.min(palette.length, Math.max(6, Math.floor(src.width / cell)));
  const rows = Math.ceil(palette.length / cols);
  const legendH = rows * cell + cell * 0.4;

  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height + Math.round(legendH);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(src, 0, 0);

  // Black strip background
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, src.height, canvas.width, legendH);

  // Cells: swatch with symbol, centered grid
  const gridW = cols * cell;
  const x0 = (canvas.width - gridW) / 2;
  const pad = cell * 0.12;
  palette.forEach((p, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = x0 + col * cell + pad;
    const y = src.height + cell * 0.2 + row * cell + pad;
    const size = cell - pad * 2;
    ctx.fillStyle = p.hex;
    ctx.fillRect(x, y, size, size);
    const sym = symbolFor(i);
    const fs = Math.round(size * 0.52);
    ctx.font = `bold ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = digitColorFor(p.hex);
    ctx.fillText(sym, x + size / 2, y + size / 2 + fs * 0.04);
  });
  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      type,
      quality,
    );
  });
}

/** Trigger a browser download via <a download>.
 * The object URL is revoked after the click to free memory.
 * @param blob  - Blob to download
 * @param filename - Suggested file name (without path)
 * @returns void
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a short delay to allow the download to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareBlob(
  blob: Blob,
  filename: string,
): Promise<'shared' | 'unsupported' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (
    !('share' in navigator) ||
    typeof nav.canShare !== 'function' ||
    !nav.canShare({ files: [file] })
  ) {
    return 'unsupported';
  }
  try {
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (e) {
    // AbortError = user closed the share sheet.
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'cancelled';
  }
}
