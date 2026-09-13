import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translate } from '../i18n'
import { useCanvasLayers } from '../canvas/useCanvasLayers'
import {
  BrushEngine,
  pointsFromPointerEvent,
  type FillAllAction,
  type PaintAction,
  type StrokePoint,
} from '../canvas/BrushEngine'
import { ViewTransform } from '../canvas/ViewTransform'
import { PaletteBar } from '../ui/PaletteBar'
import { saveProject } from '../storage/projects'
import { composeExport, composeLegendExport, canvasToBlob, downloadBlob, shareBlob } from '../export/imageExport'
import { Button, IconButton } from '../ui/Button'
import {
  IconUndo,
  IconRedo,
  IconSave,
  IconDownload,
  IconSliders,
  IconHome,
  IconZoomIn,
  IconZoomOut,
  IconFit,
  IconBrush,
  IconEraser,
  IconClose,
  IconShare,
  IconCheck,
  IconEye,
  IconWand,
} from '../ui/icons'

const MAX_UNDO = 50 // SPEC Task 13: hard history cap

/** Developer test controls: any dev build, or any build opened with ?dev=1. */
const DEV_TOOLS =
  import.meta.env.DEV ||
  (typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev'))

export function ColoringScreen() {
  const lang = useAppStore((s) => s.lang)
  const result = useAppStore((s) => s.pipeline)
  const sourceImage = useAppStore((s) => s.sourceImage)
  const sourceName = useAppStore((s) => s.sourceName)
  const projectId = useAppStore((s) => s.projectId)
  const setProjectId = useAppStore((s) => s.setProjectId)
  const restored = useAppStore((s) => s.restoredProject)
  const setRestoredProject = useAppStore((s) => s.setRestoredProject)
  const goTo = useAppStore((s) => s.goTo)
  const reset = useAppStore((s) => s.reset)

  const t = useCallback((key: string, args?: Record<string, string | number>) =>
    translate(lang, key, args), [lang])

  const containerRef = useRef<HTMLDivElement | null>(null)
  const layers = useCanvasLayers(result)
  const viewRef = useRef<ViewTransform>(new ViewTransform())
  const engineRef = useRef<BrushEngine | null>(null)
  const pointersRef = useRef(new Map<number, { clientX: number; clientY: number }>())
  const pinchRef = useRef<{
    dist: number
    mid: { x: number; y: number }
    scale: number
    canvasPoint: { x: number; y: number }
  } | null>(null)
  const panningRef = useRef<{ last: { clientX: number; clientY: number } } | null>(null)
  const paintingRef = useRef(false)

  const strokesRef = useRef<PaintAction[]>([])
  const redoRef = useRef<PaintAction[]>([])
  /** Undo/redo button enablement derives from these counters (re-render trigger). */
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)

  const [activeIndex, setActiveIndex] = useState<number | null>(0)
  const [activeCustom, setActiveCustom] = useState<string | null>(null)
  const [customColors, setCustomColors] = useState<string[]>([])
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [brushSize, setBrushSize] = useState(18)
  const [opacity, setOpacity] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [fillPreview, setFillPreview] = useState(false)
  const [withOutlines, setWithOutlines] = useState(false)
  const [withLegend, setWithLegend] = useState(true)
  const [savedTick, setSavedTick] = useState(0)
  const dirtyRef = useRef(false)

  const palette = result?.palette ?? []

  // Restore from a saved project once (strokes repaint, contours already drawn from labels).
  useEffect(() => {
    if (!restored) return
    setCustomColors(restored.customColors)
    strokesRef.current = restored.strokes
    redoRef.current = []
    setUndoCount(restored.strokes.length)
    setRedoCount(0)
    layers.repaintPaint(restored.strokes)
    setRestoredProject(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored])

  // Initial view fit.
  useEffect(() => {
    const container = containerRef.current
    if (!container || !result) return
    viewRef.current.fitTo(container.clientWidth, container.clientHeight, result.width, result.height)
    viewRef.current.apply(container.firstElementChild as HTMLElement)
    const ro = new ResizeObserver(() => {
      viewRef.current.apply(container.firstElementChild as HTMLElement)
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [result])

  const applyView = useCallback(() => {
    const container = containerRef.current
    if (container) viewRef.current.apply(container.firstElementChild as HTMLElement)
  }, [])

  // Highlight regions of the active palette color (setHighlight self-guards
  // against redundant redraws, so the loose dependency is fine).
  useEffect(() => {
    layers.setHighlight(activeCustom ? null : activeIndex)
  }, [activeIndex, activeCustom, layers])

  useEffect(() => {
    layers.setFillPreview(fillPreview)
  }, [fillPreview])

  const save = useCallback(async (): Promise<void> => {
    if (!result || !sourceImage) return
    const id = await saveProject({
      id: projectId,
      name: sourceName || t('app.title'),
      sourceImage,
      result,
      customColors,
      strokes: strokesRef.current,
    })
    setProjectId(id)
    dirtyRef.current = false
    setSavedTick((v) => v + 1)
  }, [result, sourceImage, sourceName, projectId, customColors, setProjectId, t])

  // Autosave when leaving the coloring screen.
  useEffect(() => {
    return () => {
      if (dirtyRef.current && result && sourceImage) {
        void save()
      }
      setRestoredProject(null)
    }
  }, [result, sourceImage, save, setRestoredProject])

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!result) return
    const container = containerRef.current
    const paintCanvas = layers.paintRef.current
    if (!container || !paintCanvas) return
    try {
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    } catch {
      // pointer already inactive (e.g. synthetic events) — capture is optional
    }
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

    if (pointersRef.current.size === 2) {
      // Second finger cancels painting; hand control to pinch/pan.
      if (paintingRef.current) {
        engineRef.current?.abort()
        paintingRef.current = false
      }
      panningRef.current = null
      const [a, b] = [...pointersRef.current.values()]
      const rect = container.getBoundingClientRect()
      const midX = (a.clientX + b.clientX) / 2
      const midY = (a.clientY + b.clientY) / 2
      const view = viewRef.current
      pinchRef.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        mid: { x: midX - rect.left, y: midY - rect.top },
        scale: view.scale,
        canvasPoint: view.toCanvas(midX, midY, rect),
      }
      return
    }
    if (pointersRef.current.size > 2) return
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return

    const view = viewRef.current
    const rect = container.getBoundingClientRect()
    const p = view.toCanvas(e.clientX, e.clientY, rect)
    engineRef.current = new BrushEngine(paintCanvas.getContext('2d')!)
    engineRef.current.begin(
      { tool, color, size: brushSize, opacity },
      { x: p.x, y: p.y, pressure: e.pressure > 0 ? e.pressure : 0.5 },
    )
    paintingRef.current = true
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()]
      const rect = containerRef.current!.getBoundingClientRect()
      const nowMid = {
        x: (a.clientX + b.clientX) / 2 - rect.left,
        y: (a.clientY + b.clientY) / 2 - rect.top,
      }
      viewRef.current.applyPinch(
        pinchRef.current,
        Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        nowMid,
      )
      applyView()
      return
    }

    // Single-finger pan when the brush is idle and pan started on the container.
    if (panningRef.current && !paintingRef.current) {
      const last = panningRef.current.last
      viewRef.current.offsetX += e.clientX - last.clientX
      viewRef.current.offsetY += e.clientY - last.clientY
      panningRef.current.last = { clientX: e.clientX, clientY: e.clientY }
      applyView()
      return
    }

    if (!paintingRef.current || !engineRef.current) return

    const rect = containerRef.current!.getBoundingClientRect()
    const points: StrokePoint[] = pointsFromPointerEvent(e.nativeEvent, (cx, cy) => {
      const p = viewRef.current.toCanvas(cx, cy, rect)
      return { x: p.x, y: p.y }
    })
    for (const point of points) engineRef.current!.extend(point)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null

    if (paintingRef.current && engineRef.current) {
      const stroke = engineRef.current.commit()
      paintingRef.current = false
      engineRef.current = null
      if (stroke) {
        redoRef.current = []
        strokesRef.current = [...strokesRef.current, stroke].slice(-MAX_UNDO)
        setUndoCount(strokesRef.current.length)
        setRedoCount(0)
        dirtyRef.current = true
      }
      return
    }
    // Single-finger pan ends when the last pointer lifts.
    if (panningRef.current && pointersRef.current.size === 0) panningRef.current = null
  }

  const undo = useCallback(() => {
    const cur = strokesRef.current
    if (cur.length === 0) return
    const last = cur[cur.length - 1]
    redoRef.current = [...redoRef.current, last]
    strokesRef.current = cur.slice(0, -1)
    setUndoCount(strokesRef.current.length)
    setRedoCount(redoRef.current.length)
    layers.repaintPaint(strokesRef.current)
    dirtyRef.current = true
  }, [layers])

  const redo = useCallback(() => {
    const last = redoRef.current[redoRef.current.length - 1]
    if (!last) return
    redoRef.current = redoRef.current.slice(0, -1)
    strokesRef.current = [...strokesRef.current, last].slice(-MAX_UNDO)
    setUndoCount(strokesRef.current.length)
    setRedoCount(redoRef.current.length)
    layers.repaintPaint(strokesRef.current)
    dirtyRef.current = true
  }, [layers])

  /** "Finish for me": fill remaining areas, recorded as an undoable action. */
  const finishForMe = useCallback(() => {
    const fill: FillAllAction = { tool: 'fill-all' }
    layers.applyFillAll()
    setFinishOpen(false)
    redoRef.current = []
    strokesRef.current = [...strokesRef.current, fill].slice(-MAX_UNDO)
    setUndoCount(strokesRef.current.length)
    setRedoCount(0)
    dirtyRef.current = true
  }, [layers])

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-ink-soft">{t('processing.error')}</p>
        <Button variant="primary" onClick={reset}>
          {t('processing.back')}
        </Button>
      </div>
    )
  }

  const canUndo = undoCount > 0
  const canRedo = redoCount > 0
  const color = activeCustom ?? (activeIndex != null ? palette[activeIndex]?.hex : undefined) ?? '#000000'

  return (
    <div className="relative flex h-full flex-col">
      {/* Top bar (Task 16) */}
      <div className="flex items-center justify-between gap-2 border-b border-paper-deep bg-paper px-2.5 py-2">
        <div className="flex items-center gap-0.5">
          <IconButton label={t('coloring.undo')} onClick={undo} disabled={!canUndo}>
            <IconUndo />
          </IconButton>
          <IconButton label={t('coloring.redo')} onClick={redo} disabled={!canRedo}>
            <IconRedo />
          </IconButton>
          {DEV_TOOLS && (
            <IconButton
              label={t('coloring.devPreview')}
              onClick={() => setFillPreview((v) => !v)}
              active={fillPreview}
            >
              <IconEye />
            </IconButton>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton label={t('coloring.save')} onClick={() => void save()}>
            <IconSave />
          </IconButton>
          <IconButton label={t('coloring.export')} onClick={() => setExportOpen(true)}>
            <IconDownload />
          </IconButton>
          <IconButton label={t('coloring.finish')} onClick={() => setFinishOpen(true)}>
            <IconWand />
          </IconButton>
          <IconButton
            label={t('coloring.tool.' + tool)}
            onClick={() => setTool(tool === 'brush' ? 'eraser' : 'brush')}
            active={tool === 'eraser'}
          >
            {tool === 'brush' ? <IconBrush /> : <IconEraser />}
          </IconButton>
          <IconButton label={t('coloring.settings')} onClick={() => setSettingsOpen(true)}>
            <IconSliders />
          </IconButton>
          <IconButton
            label={t('coloring.home')}
            onClick={() => {
              if (dirtyRef.current) void save()
              goTo('home')
            }}
          >
            <IconHome />
          </IconButton>
        </div>
      </div>

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-paper-warm"
        onWheel={(e) => {
          e.preventDefault()
          const rect = containerRef.current!.getBoundingClientRect()
          viewRef.current.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 1 / 1.15)
          applyView()
        }}
      >
        <div className="absolute left-0 top-0">
          <div className="relative shadow-[0_2px_16px_rgb(28_25_23/0.12)]" style={{ width: result.width, height: result.height }}>
            <canvas ref={layers.bgRef} className="absolute inset-0" />
            <canvas ref={layers.lineRef} className="absolute inset-0" />
            <canvas ref={layers.highlightRef} className="pointer-events-none absolute inset-0" />
            <canvas
              ref={layers.paintRef}
              className="absolute inset-0"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            <canvas ref={layers.previewRef} className="pointer-events-none absolute inset-0" />
          </div>
        </div>

        {/* Zoom stack for desktop testing (Task 12) */}
        <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-2xl border border-paper-deep bg-paper/95 shadow-md backdrop-blur">
          <IconButton label={t('coloring.zoomIn')} onClick={() => {
            const rect = containerRef.current!.getBoundingClientRect()
            viewRef.current.zoomAt(rect.width / 2, rect.height / 2, 1.25)
            applyView()
          }} className="!h-11 !w-11 !rounded-none">
            <IconZoomIn size={18} />
          </IconButton>
          <IconButton label={t('coloring.zoomOut')} onClick={() => {
            const rect = containerRef.current!.getBoundingClientRect()
            viewRef.current.zoomAt(rect.width / 2, rect.height / 2, 1 / 1.25)
            applyView()
          }} className="!h-11 !w-11 !rounded-none">
            <IconZoomOut size={18} />
          </IconButton>
          <IconButton label={t('coloring.zoomFit')} onClick={() => {
            const rect = containerRef.current!.getBoundingClientRect()
            viewRef.current.fitTo(rect.width, rect.height, result.width, result.height)
            applyView()
          }} className="!h-11 !w-11 !rounded-none border-t border-paper-deep">
            <IconFit size={18} />
          </IconButton>
        </div>

        {savedTick > 0 && (
          <div
            key={savedTick}
            className="pbn-rise absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper shadow-lg"
          >
            <IconCheck size={14} />
            {t('coloring.saved')}
          </div>
        )}
      </div>

      {/* Palette dock (Task 14) with iPad home-indicator clearance */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 flex justify-center"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}
      >
        <PaletteBar
          palette={palette}
          customColors={customColors}
          activeIndex={activeIndex}
          activeCustom={activeCustom}
          onSelect={(i) => {
            setActiveIndex(i)
            setActiveCustom(null)
            setTool('brush')
          }}
          onSelectCustom={(hex) => {
            setActiveCustom(hex)
            setActiveIndex(null)
            setTool('brush')
          }}
          onAddCustom={(hex) => {
            setCustomColors((prev) => (prev.includes(hex) ? prev : [...prev, hex]))
            setActiveCustom(hex)
            setActiveIndex(null)
            setTool('brush')
            dirtyRef.current = true
          }}
        />
      </div>

      {/* Settings sheet (Task 16) */}
      {settingsOpen && (
        <Sheet title={t('coloring.settingsTitle')} onClose={() => setSettingsOpen(false)}>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(['brush', 'eraser'] as const).map((tl) => (
              <button
                key={tl}
                onClick={() => setTool(tl)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  tool === tl ? 'bg-ink text-paper' : 'border border-paper-deep bg-paper text-ink-soft'
                }`}
              >
                {tl === 'brush' ? <IconBrush size={16} /> : <IconEraser size={16} />}
                {t(`coloring.tool.${tl}`)}
              </button>
            ))}
          </div>
          <label className="mb-1 flex items-baseline justify-between text-xs text-ink-soft">
            {t('coloring.brushSize')}
            <span className="font-semibold text-ink">{brushSize}px</span>
          </label>
          <input type="range" min={2} max={60} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="pbn-range mb-3 w-full" />
          <label className="mb-1 flex items-baseline justify-between text-xs text-ink-soft">
            {t('coloring.opacity')}
            <span className="font-semibold text-ink">{Math.round(opacity * 100)}%</span>
          </label>
          <input type="range" min={10} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} className="pbn-range w-full" />
        </Sheet>
      )}

      {/* Export sheet (Task 17) */}
      {exportOpen && (
        <Sheet title={t('coloring.export')} onClose={() => setExportOpen(false)}>
          <label className="mb-3 flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={withOutlines}
              onChange={(e) => setWithOutlines(e.target.checked)}
              className="h-4.5 w-4.5 accent-stone-900"
            />
            {t('coloring.withOutlines')}
          </label>
          <label className="mb-4 flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={withLegend}
              onChange={(e) => setWithLegend(e.target.checked)}
              className="h-4.5 w-4.5 accent-stone-900"
            />
            {t('coloring.withLegend')}
          </label>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="primary"
              onClick={async () => {
                const paint = layers.paintRef.current
                if (!paint) return
                const canvas = withLegend
                  ? await composeLegendExport({ result, paintCanvas: paint, withOutlines })
                  : await composeExport({ result, paintCanvas: paint, withOutlines })
                downloadBlob(await canvasToBlob(canvas, 'image/png'), 'paint-by-numbers.png')
              }}
            >
              <IconDownload size={16} />
              {t('coloring.exportPng')}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const paint = layers.paintRef.current
                if (!paint) return
                const canvas = withLegend
                  ? await composeLegendExport({ result, paintCanvas: paint, withOutlines })
                  : await composeExport({ result, paintCanvas: paint, withOutlines })
                downloadBlob(await canvasToBlob(canvas, 'image/jpeg', 0.92), 'paint-by-numbers.jpg')
              }}
            >
              <IconDownload size={16} />
              {t('coloring.exportJpeg')}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const paint = layers.paintRef.current
                if (!paint) return
                const canvas = withLegend
                  ? await composeLegendExport({ result, paintCanvas: paint, withOutlines })
                  : await composeExport({ result, paintCanvas: paint, withOutlines })
                const blob = await canvasToBlob(canvas, 'image/png')
                const outcome = await shareBlob(blob, 'paint-by-numbers.png')
                if (outcome === 'unsupported') downloadBlob(blob, 'paint-by-numbers.png')
              }}
            >
              <IconShare size={16} />
              {t('coloring.share')}
            </Button>
          </div>
        </Sheet>
      )}

      {/* "Finish for me" confirmation */}
      {finishOpen && (
        <Sheet title={t('coloring.finishTitle')} onClose={() => setFinishOpen(false)}>
          <p className="mb-4 text-sm leading-relaxed text-ink-soft">{t('coloring.finishText')}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setFinishOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={finishForMe}>
              <IconWand size={16} />
              {t('coloring.finishGo')}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        className="pbn-rise w-full max-w-md rounded-t-3xl border-t border-paper-deep bg-paper p-5 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint active:bg-paper-deep"
          >
            <IconClose size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
