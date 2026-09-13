/** Brush engine per SPEC Task 11: pointer-driven strokes, width follows
 * pressure (size × (0.25 + 0.75 × pressure)), quadratic smoothing through
 * segment midpoints, eraser = destination-out on the paint layer only. */

export interface StrokePoint {
  x: number
  y: number
  pressure: number
}

export interface Stroke {
  tool: 'brush' | 'eraser'
  color: string
  size: number
  opacity: number
  points: StrokePoint[]
}

/** One "finish for me" step in history: fills every still-transparent pixel
 * with its region's palette color (drawn destination-over, so earlier user
 * strokes stay on top). JSON-serializable like Stroke. */
export interface FillAllAction {
  tool: 'fill-all'
}

export type PaintAction = Stroke | FillAllAction

export function isFillAction(action: PaintAction): action is FillAllAction {
  return action.tool === 'fill-all'
}

export function widthAt(stroke: Stroke, pressure: number): number {
  return stroke.size * (0.25 + 0.75 * Math.min(1, Math.max(0, pressure)))
}

function applyTool(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = '#000000'
    ctx.fillStyle = '#000000'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = stroke.color
    ctx.fillStyle = stroke.color
  }
  ctx.globalAlpha = stroke.opacity
  ctx.lineWidth = widthAt(stroke, 0.5)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function mid(a: StrokePoint, b: StrokePoint): StrokePoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    pressure: (a.pressure + b.pressure) / 2,
  }
}

/** Draw one smoothed segment ending at points[i] (i ≥ 1). */
function drawSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, i: number): void {
  const pts = stroke.points
  const cur = pts[i]
  const prev = pts[i - 1]
  const start = i >= 2 ? mid(pts[i - 2], prev) : prev
  const end = mid(prev, cur)

  applyTool(ctx, stroke)
  ctx.lineWidth = widthAt(stroke, (prev.pressure + cur.pressure) / 2)
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.quadraticCurveTo(prev.x, prev.y, end.x, end.y)
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

function drawDot(ctx: CanvasRenderingContext2D, stroke: Stroke, p: StrokePoint): void {
  applyTool(ctx, stroke)
  ctx.beginPath()
  ctx.arc(p.x, p.y, widthAt(stroke, p.pressure) / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/** Replay one committed stroke (history repaint building block). */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  if (stroke.points.length === 1) {
    drawDot(ctx, stroke, stroke.points[0])
  } else {
    for (let i = 1; i < stroke.points.length; i++) drawSegment(ctx, stroke, i)
  }
}

/** Incremental stroke being drawn on a paint canvas. */
export class BrushEngine {
  private ctx: CanvasRenderingContext2D
  private stroke: Stroke | null = null

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  get active(): boolean {
    return this.stroke !== null
  }

  begin(stroke: Omit<Stroke, 'points'>, point: StrokePoint): void {
    this.stroke = { ...stroke, points: [point] }
    drawDot(this.ctx, this.stroke, point)
  }

  extend(point: StrokePoint): void {
    if (!this.stroke) return
    const last = this.stroke.points[this.stroke.points.length - 1]
    // Skip duplicate points (steady finger / coalesced duplicates).
    if (last && Math.abs(last.x - point.x) < 0.01 && Math.abs(last.y - point.y) < 0.01) return
    this.stroke.points.push(point)
    drawSegment(this.ctx, this.stroke, this.stroke.points.length - 1)
  }

  /** Finish the stroke and return it (null if nothing was drawn). */
  commit(): Stroke | null {
    const s = this.stroke
    this.stroke = null
    return s && s.points.length > 0 ? s : null
  }

  abort(): void {
    this.stroke = null
  }

  /** Redraw complete strokes from history (undo/redo/restore per Task 13). */
  static repaint(ctx: CanvasRenderingContext2D, strokes: Stroke[]): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    for (const stroke of strokes) drawStroke(ctx, stroke)
  }
}

/** Extract pointer points including coalesced (high-frequency) samples. */
export function pointsFromPointerEvent(
  e: PointerEvent,
  toCanvas: (clientX: number, clientY: number) => { x: number; y: number },
): StrokePoint[] {
  const toPoint = (ev: PointerEvent): StrokePoint => {
    const { x, y } = toCanvas(ev.clientX, ev.clientY)
    // Mouse events report pressure 0.5 while pressed; pens/touch report real values.
    const pressure = ev.pressure > 0 ? ev.pressure : 0.5
    return { x, y, pressure }
  }
  const getCoalesced = (e as PointerEvent).getCoalescedEvents?.bind(e)
  if (typeof getCoalesced === 'function') {
    const coalesced = getCoalesced()
    if (coalesced && coalesced.length > 0) return coalesced.map(toPoint)
  }
  return [toPoint(e)]
}
