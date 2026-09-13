import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { makeId, saveProject, listProjects, getProject, deleteProject, blobToLabels, labelsToBlob } from '../src/storage/projects'
import type { PipelineResult, PaletteEntry, RegionInfo } from '../src/engine/types'
import type { PaintAction } from '../src/canvas/BrushEngine'

function makeFakeResult(): PipelineResult {
  const width = 100
  const height = 100
  const labels = new Uint32Array(width * height)
  for (let i = 0; i < 10; i++) {
    labels.fill(i, i * 10, i * 10 + 10)
  }
  const palette: PaletteEntry[] = [
    { index: 0, lab: [50, 0, 0], hex: '#ff0000', pixelCount: 100 },
    { index: 1, lab: [50, 0, 0], hex: '#00ff00', pixelCount: 100 },
  ]
  const regions: RegionInfo[] = [
    { colorIdx: 0, area: 10, labelX: 5, labelY: 5, fontSize: 12 },
    { colorIdx: 1, area: 10, labelX: 15, labelY: 15, fontSize: 12 },
  ]
  return { width, height, labels, palette, regions }
}

function makeFakeStroke(): PaintAction {
  return {
    tool: 'brush',
    color: '#ff0000',
    size: 10,
    opacity: 1,
    points: [{ x: 10, y: 10, pressure: 0.5 }],
  }
}

describe('storage/projects', () => {
  it('makeId генерирует уникальные ID', () => {
    const id1 = makeId()
    const id2 = makeId()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('labelsToBlob и blobToLabels сохраняют и восстанавливают данные', async () => {
    const original = new Uint32Array([1, 2, 3, 4, 5])
    const blob = labelsToBlob(original)
    const restored = await blobToLabels(blob)
    expect(restored).toEqual(original)
  })

  it('saveProject и getProject сохраняют и читают проект', async () => {
    const id = await saveProject({
      id: null,
      name: 'Test Project',
      sourceImage: new Blob(['fake image data'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: ['#abcdef'],
      strokes: [makeFakeStroke()],
    })

    const project = await getProject(id)
    expect(project).toBeDefined()
    expect(project?.name).toBe('Test Project')
    expect(project?.palette).toHaveLength(2)
    expect(project?.customColors).toContain('#abcdef')
    expect(project?.strokes).toHaveLength(1)

    // Очистка
    await deleteProject(id)
  })

  it('update проекта обновляет updatedAt', async () => {
    const id = await saveProject({
      id: null,
      name: 'Update Test',
      sourceImage: new Blob(['data'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    })

    const before = await getProject(id)
    const beforeTime = before?.updatedAt

    await new Promise((r) => setTimeout(r, 10))

    await saveProject({
      id,
      name: 'Update Test',
      sourceImage: new Blob(['data'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    })

    const after = await getProject(id)
    expect(after?.updatedAt).toBeGreaterThan(beforeTime!)

    await deleteProject(id)
  })

  it('listProjects возвращает проекты в обратном порядке по updatedAt', async () => {
    const id1 = await saveProject({
      id: null,
      name: 'First',
      sourceImage: new Blob(['a'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    })

    await new Promise((r) => setTimeout(r, 10))

    const id2 = await saveProject({
      id: null,
      name: 'Second',
      sourceImage: new Blob(['b'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    })

    const list = await listProjects()
    expect(list).toHaveLength(2)
    expect(list[0].name).toBe('Second')
    expect(list[1].name).toBe('First')

    await deleteProject(id1)
    await deleteProject(id2)
  })

  it('deleteProject удаляет проект', async () => {
    const id = await saveProject({
      id: null,
      name: 'To Delete',
      sourceImage: new Blob(['x'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    })

    await deleteProject(id)
    const project = await getProject(id)
    expect(project).toBeUndefined()
  })
})
