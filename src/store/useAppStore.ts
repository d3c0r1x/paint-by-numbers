import { create } from 'zustand'
import type { PipelineResult } from '../engine/types'
import type { PaintAction } from '../canvas/BrushEngine'
import { detectLang, type Lang } from '../i18n'

export type Screen = 'home' | 'processing' | 'coloring'

interface AppState {
  screen: Screen
  goTo: (screen: Screen) => void

  lang: Lang
  setLang: (lang: Lang) => void

  sourceImage: Blob | null
  sourceName: string
  setSource: (image: Blob | null, name?: string) => void

  pipeline: PipelineResult | null
  setPipeline: (result: PipelineResult | null) => void

  projectId: string | null
  setProjectId: (id: string | null) => void

  /** Custom colors + paint actions restored from a saved project (consumed by ColoringScreen). */
  restoredProject: { customColors: string[]; strokes: PaintAction[] } | null
  setRestoredProject: (restored: { customColors: string[]; strokes: PaintAction[] } | null) => void

  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'home',
  goTo: (screen) => set({ screen }),

  lang: detectLang(),
  setLang: (lang) => set({ lang }),

  sourceImage: null,
  sourceName: '',
  setSource: (image, name = '') => set({ sourceImage: image, sourceName: name }),

  pipeline: null,
  setPipeline: (result) => set({ pipeline: result }),

  projectId: null,
  setProjectId: (id) => set({ projectId: id }),

  restoredProject: null,
  setRestoredProject: (restored) => set({ restoredProject: restored }),

  reset: () =>
    set({
      sourceImage: null,
      sourceName: '',
      pipeline: null,
      projectId: null,
      restoredProject: null,
      screen: 'home',
    }),
}))
