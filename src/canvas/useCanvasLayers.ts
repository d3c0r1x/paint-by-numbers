/** Canvas layer stack per SPEC Task 10 + phase-2 additions. Working-resolution
 * layers, bottom → top:
 *   (1) white background, (2) vector contours + numbers, (3) active-color
 *   highlight (under paint — painted-over areas hide it, eraser re-reveals it),
 *   (4) paint (receives pointer events), (5) dev-only reference-fill preview
 *   (pointer-events: none, set by ColoringScreen).
 * v3: contours are VECTOR paths (marching squares → Douglas–Peucker →
 * Chaikin) rendered with round joins — smooth at any zoom, no staircase. */
import { useEffect, useRef } from 'react';
import type { PipelineResult } from '../engine/types';
import { buildRegionPaths } from '../engine/vectorize';
import { drawNumbers } from '../engine/labels';
import { buildFillPixels, regionIdsByColorIndex } from '../engine/fillRender';
import { drawStroke, isFillAction, type PaintAction } from './BrushEngine';

const HIGHLIGHT_ALPHA = 0.35;

export interface CanvasLayers {
  bgRef: React.RefObject<HTMLCanvasElement | null>;
  lineRef: React.RefObject<HTMLCanvasElement | null>;
  highlightRef: React.RefObject<HTMLCanvasElement | null>;
  paintRef: React.RefObject<HTMLCanvasElement | null>;
  previewRef: React.RefObject<HTMLCanvasElement | null>;
  /** Clear the paint layer and redraw the given actions (strokes + fills). */
  repaintPaint: (actions: PaintAction[]) => void;
  /** Highlight all regions of the palette color (null = none). Cheap when the
   * index is unchanged — safe to call on every render. */
  setHighlight: (colorIdx: number | null) => void;
  /** Show/hide the dev reference-fill preview overlay. */
  setFillPreview: (visible: boolean) => void;
  /** Live "finish for me": fill all still-transparent pixels with their
   * region's palette color, keeping user strokes on top. */
  applyFillAll: () => void;
}

export function useCanvasLayers(result: PipelineResult | null): CanvasLayers {
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const lineRef = useRef<HTMLCanvasElement | null>(null);
  const highlightRef = useRef<HTMLCanvasElement | null>(null);
  const paintRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  /** Caches invalidated on result change. */
  const pathsRef = useRef<Map<number, Path2D> | null>(null);
  const regionsByColorRef = useRef<Map<number, number[]> | null>(null);
  const fillCanvasRef = useRef<HTMLCanvasElement | null>(null);

  /** Desired overlay state, re-applied when the layer stack is rebuilt. */
  const highlightIdxRef = useRef<number | null>(null);
  const previewOnRef = useRef(false);

  /** Opaque offscreen canvas with the fully-colored picture (lazy, cached). */
  function getFillCanvas(): HTMLCanvasElement | null {
    if (!result) return null;
    if (fillCanvasRef.current) return fillCanvasRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const pixels = buildFillPixels(
      result.labels,
      result.regions,
      result.palette,
      result.width,
      result.height,
    );
    const image = ctx.createImageData(result.width, result.height);
    image.data.set(pixels);
    ctx.putImageData(image, 0, 0);
    fillCanvasRef.current = canvas;
    return canvas;
  }

  function drawFillAll(ctx: CanvasRenderingContext2D): void {
    const fill = getFillCanvas();
    if (!fill) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(fill, 0, 0);
    ctx.restore();
  }

  function drawHighlight(): void {
    const hl = highlightRef.current?.getContext('2d');
    if (!hl || !result) return;
    hl.clearRect(0, 0, result.width, result.height);
    const idx = highlightIdxRef.current;
    if (idx == null) return;
    const ids = (regionsByColorRef.current ??= regionIdsByColorIndex(result.regions)).get(idx);
    const hex = result.palette[idx]?.hex;
    const paths = pathsRef.current;
    if (!ids || !hex || !paths) return;
    hl.save();
    hl.globalAlpha = HIGHLIGHT_ALPHA;
    hl.fillStyle = hex;
    for (const id of ids) {
      const path = paths.get(id);
      if (path) hl.fill(path);
    }
    hl.restore();
  }

  function drawPreview(): void {
    const pv = previewRef.current?.getContext('2d');
    if (!pv || !result) return;
    pv.clearRect(0, 0, result.width, result.height);
    if (!previewOnRef.current) return;
    const fill = getFillCanvas();
    const paths = pathsRef.current;
    if (!fill || !paths) return;
    // Finished-painting look: colors with contours on top, numbers hidden
    // under the paint like in a real kit.
    pv.drawImage(fill, 0, 0);
    pv.save();
    pv.strokeStyle = '#000000';
    pv.lineWidth = 2;
    pv.lineJoin = 'round';
    pv.lineCap = 'round';
    for (const path of paths.values()) pv.stroke(path);
    pv.restore();
  }

  useEffect(() => {
    if (!result) return;
    const { width, height, labels, regions } = result;

    for (const ref of [bgRef, lineRef, highlightRef, paintRef, previewRef]) {
      const canvas = ref.current;
      if (!canvas) continue;
      canvas.width = width;
      canvas.height = height;
    }

    // Result changed: geometry and fill caches are stale.
    fillCanvasRef.current = null;
    regionsByColorRef.current = null;

    const bg = bgRef.current?.getContext('2d');
    if (bg) {
      bg.fillStyle = '#ffffff';
      bg.fillRect(0, 0, width, height);
    }

    const line = lineRef.current?.getContext('2d');
    if (line) {
      line.clearRect(0, 0, width, height);
      // Vector contours: single black stroke over every region boundary path.
      const paths = (pathsRef.current = buildRegionPaths(labels, width, height));
      line.save();
      line.strokeStyle = '#000000';
      line.lineWidth = 2;
      line.lineJoin = 'round';
      line.lineCap = 'round';
      for (const path of paths.values()) line.stroke(path);
      line.restore();
      drawNumbers(line, regions);
    }

    const paint = paintRef.current?.getContext('2d');
    paint?.clearRect(0, 0, width, height);

    // Re-apply overlay state wiped by the canvas resize above.
    drawHighlight();
    drawPreview();
  }, [result]);

  function repaintPaint(actions: PaintAction[]): void {
    const paint = paintRef.current?.getContext('2d');
    if (!paint) return;
    paint.clearRect(0, 0, paint.canvas.width, paint.canvas.height);
    for (const action of actions) {
      if (isFillAction(action)) drawFillAll(paint);
      else drawStroke(paint, action);
    }
  }

  function setHighlight(colorIdx: number | null): void {
    if (highlightIdxRef.current === colorIdx) return;
    highlightIdxRef.current = colorIdx;
    drawHighlight();
  }

  function setFillPreview(visible: boolean): void {
    if (previewOnRef.current === visible) return;
    previewOnRef.current = visible;
    drawPreview();
  }

  function applyFillAll(): void {
    const paint = paintRef.current?.getContext('2d');
    if (paint) drawFillAll(paint);
  }

  return {
    bgRef,
    lineRef,
    highlightRef,
    paintRef,
    previewRef,
    repaintPaint,
    setHighlight,
    setFillPreview,
    applyFillAll,
  };
}
