import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translate } from '../i18n'
import { runConversion } from '../engine/pipeline'
import type { PipelineStep } from '../engine/types'
import { LogoMark } from '../ui/icons'

/** Progress ranges for the five displayed steps (approximate, display only). */
const STEP_ORDER: PipelineStep[] = ['analyze', 'palette', 'regions', 'merge', 'numbers']
const STEP_KEYS: Record<PipelineStep, string> = {
  analyze: 'processing.step.analyze',
  palette: 'processing.step.palette',
  regions: 'processing.step.regions',
  merge: 'processing.step.merge',
  contours: 'processing.step.merge',
  numbers: 'processing.step.numbers',
}

export function ProcessingScreen() {
  const lang = useAppStore((s) => s.lang)
  const sourceImage = useAppStore((s) => s.sourceImage)
  const setPipeline = useAppStore((s) => s.setPipeline)
  const goTo = useAppStore((s) => s.goTo)
  const reset = useAppStore((s) => s.reset)
  const [percent, setPercent] = useState(0)
  const [step, setStep] = useState<PipelineStep | null>(null)
  const [failed, setFailed] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const t = (key: string, args?: Record<string, string | number>) =>
    translate(lang, key, args)

  // Thumbnail of the source photo for the processing card.
  useEffect(() => {
    if (!sourceImage) return
    let url: string | null = null
    const bitmap = createImageBitmap(sourceImage)
      .then((bmp) => {
        const scale = Math.min(1, 480 / Math.max(bmp.width, bmp.height))
        const w = Math.max(1, Math.round(bmp.width * scale))
        const h = Math.max(1, Math.round(bmp.height * scale))
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
        bmp.close()
        url = c.toDataURL('image/jpeg', 0.82)
        setPreviewUrl(url)
      })
      .catch(() => setPreviewUrl(null))
    return () => {
      void bitmap
    }
  }, [sourceImage])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        if (!sourceImage) throw new Error('no source image')
        const bitmap = await createImageBitmap(sourceImage)
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('2d context unavailable')
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const result = await runConversion(imageData, (p) => {
          if (!cancelled) {
            setStep(p.step)
            setPercent(p.percent)
          }
        })
        if (cancelled) return
        setPipeline(result)
        goTo('coloring')
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [sourceImage, setPipeline, goTo])

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-accent">{t('processing.error')}</p>
        <button
          onClick={reset}
          className="rounded-xl bg-ink px-4 py-2 font-semibold text-paper"
        >
          {t('processing.back')}
        </button>
      </div>
    )
  }

  const activeIdx = step ? STEP_ORDER.indexOf(step) : 0

  return (
    <div className="thin-scroll mx-auto flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto p-5 pb-8">
      {/* Source preview with scan animation + grid overlay (reference screen 03) */}
      <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-3xl border border-paper-deep bg-ink shadow-sm">
        {previewUrl && (
          <img src={previewUrl} alt="" className="h-full w-full object-cover opacity-80 saturate-50" />
        )}
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute inset-x-0 h-[3px] animate-[pbn-scan_2.4s_ease-in-out_infinite] bg-accent shadow-[0_0_18px] shadow-accent"
          style={{ animationName: 'pbn-scan' }}
        />
      </div>

      <div>
        <h1 className="text-lg font-bold tracking-tight">{t('processing.smartTitle')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('processing.smartSub')}</p>
      </div>

      {/* Paper-strip progress bar */}
      <div>
        <div className="h-2.5 w-full overflow-hidden rounded-full border border-paper-deep bg-paper">
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-200"
            style={{ width: `${Math.round(percent)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-ink-faint">
          <span>
            {t('processing.stepOf', { n: Math.min(5, activeIdx + 2) })}
          </span>
          <span className="font-semibold text-ink">{Math.round(percent)}%</span>
        </div>
      </div>

      {/* Step checklist */}
      <ol className="flex flex-col gap-2">
        {STEP_ORDER.map((s, i) => {
          const done = i < activeIdx
          const active = i === activeIdx
          return (
            <li
              key={s}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-accent/10 font-semibold text-accent'
                  : done
                    ? 'bg-paper-warm text-ink-soft'
                    : 'bg-paper-warm/50 text-ink-faint'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                  done ? 'bg-[#1fa971]' : active ? 'bg-accent' : 'bg-ink-faint/50'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              {t(STEP_KEYS[s])}
            </li>
          )
        })}
      </ol>

      {/* Smart note (reference: «Умное форматирование») */}
      <div className="mt-auto flex items-start gap-3 rounded-2xl border border-paper-deep bg-gradient-to-br from-[#eef4ff] to-[#f3eeff] p-4 text-xs leading-relaxed text-ink-soft">
        <LogoMark size={30} />
        <div>
          <strong className="mb-0.5 block text-[13px] text-ink">{t('processing.smartNoteTitle')}</strong>
          {t('processing.smartNoteBody')}
        </div>
      </div>
    </div>
  )
}
