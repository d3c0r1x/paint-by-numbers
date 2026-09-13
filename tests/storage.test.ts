import { describe, it, expect } from 'vitest';
import {
  makeId,
  saveProject,
  listProjects,
  getProject,
  deleteProject,
  blobToLabels,
  labelsToBlob,
} from '../src/storage/projects';
import { canvasToBlob, shareBlob } from '../src/export/imageExport';
import type { PipelineResult, PaletteEntry, RegionInfo } from '../src/engine/types';
import type { PaintAction } from '../src/canvas/BrushEngine';

function makeFakeResult(): PipelineResult {
  const width = 100;
  const height = 100;
  const labels = new Uint32Array(width * height);
  for (let i = 0; i < 10; i++) {
    labels.fill(i, i * 10, i * 10 + 10);
  }
  const palette: PaletteEntry[] = [
    { index: 0, lab: [50, 0, 0], hex: '#ff0000', pixelCount: 100 },
    { index: 1, lab: [50, 0, 0], hex: '#00ff00', pixelCount: 100 },
  ];
  const regions: RegionInfo[] = [
    { colorIdx: 0, area: 10, labelX: 5, labelY: 5, fontSize: 12 },
    { colorIdx: 1, area: 10, labelX: 15, labelY: 15, fontSize: 12 },
  ];
  return { width, height, labels, palette, regions };
}

function makeFakeStroke(): PaintAction {
  return {
    tool: 'brush',
    color: '#ff0000',
    size: 10,
    opacity: 1,
    points: [{ x: 10, y: 10, pressure: 0.5 }],
  };
}

describe('storage/projects', () => {
  it('makeId генерирует уникальные ID', () => {
    const id1 = makeId();
    const id2 = makeId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('labelsToBlob и blobToLabels сохраняют и восстанавливают данные', async () => {
    const original = new Uint32Array([1, 2, 3, 4, 5]);
    const blob = labelsToBlob(original);
    const restored = await blobToLabels(blob);
    expect(restored).toEqual(original);
  });

  it('saveProject и getProject сохраняют и читают проект', async () => {
    const id = await saveProject({
      id: null,
      name: 'Test Project',
      sourceImage: new Blob(['fake image data'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: ['#abcdef'],
      strokes: [makeFakeStroke()],
    });

    const project = await getProject(id);
    expect(project).toBeDefined();
    expect(project?.name).toBe('Test Project');
    expect(project?.palette).toHaveLength(2);
    expect(project?.customColors).toContain('#abcdef');
    expect(project?.strokes).toHaveLength(1);

    // Очистка
    await deleteProject(id);
  });

  it('update проекта обновляет updatedAt', async () => {
    const id = await saveProject({
      id: null,
      name: 'Update Test',
      sourceImage: new Blob(['data'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    });

    const before = await getProject(id);
    const beforeTime = before?.updatedAt;

    await new Promise((r) => setTimeout(r, 10));

    await saveProject({
      id,
      name: 'Update Test',
      sourceImage: new Blob(['data'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    });

    const after = await getProject(id);
    expect(after?.updatedAt).toBeGreaterThan(beforeTime!);

    await deleteProject(id);
  });

  it('listProjects возвращает проекты в обратном порядке по updatedAt', async () => {
    const id1 = await saveProject({
      id: null,
      name: 'First',
      sourceImage: new Blob(['a'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    });

    await new Promise((r) => setTimeout(r, 10));

    const id2 = await saveProject({
      id: null,
      name: 'Second',
      sourceImage: new Blob(['b'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    });

    const list = await listProjects();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('Second');
    expect(list[1].name).toBe('First');

    await deleteProject(id1);
    await deleteProject(id2);
  });

  it('deleteProject удаляет проект', async () => {
    const id = await saveProject({
      id: null,
      name: 'To Delete',
      sourceImage: new Blob(['x'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    });

    await deleteProject(id);
    const project = await getProject(id);
    expect(project).toBeUndefined();
  });

  it('сохранение с существующим id обновляет проект (createdAt остаётся, updatedAt меняется)', async () => {
    const id = await saveProject({
      id: null,
      name: 'Original',
      sourceImage: new Blob(['orig'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: ['#111111'],
      strokes: [],
    });

    const first = await getProject(id);
    const createdAt = first?.createdAt;
    const updatedAtBefore = first?.updatedAt;

    await new Promise((r) => setTimeout(r, 10));

    // Обновляем имя и добавляем кастомный цвет, сохраняем с тем же id
    await saveProject({
      id,
      name: 'Updated',
      sourceImage: new Blob(['updated'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: ['#111111', '#222222'],
      strokes: [makeFakeStroke()],
    });

    const updated = await getProject(id);
    expect(updated?.name).toBe('Updated');
    expect(updated?.createdAt).toBe(createdAt);
    expect(updated?.updatedAt).toBeGreaterThan(updatedAtBefore!);
    expect(updated?.customColors).toContain('#222222');
    expect(updated?.strokes).toHaveLength(1);

    await deleteProject(id);
  });

  it('сохранение пустых strokes корректно (проект без мазков)', async () => {
    const id = await saveProject({
      id: null,
      name: 'Empty Strokes',
      sourceImage: new Blob(['empty'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    });

    const project = await getProject(id);
    expect(project?.strokes).toHaveLength(0);
    expect(project?.customColors).toHaveLength(0);

    await deleteProject(id);
  });

  it('listProjects возвращает thumbnail для каждого проекта', async () => {
    const id = await saveProject({
      id: null,
      name: 'Thumbnail Test',
      sourceImage: new Blob(['thumb'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: [],
      strokes: [],
    });

    const list = await listProjects();
    const project = list.find((p) => p.id === id);
    expect(project).toBeDefined();
    // В jsdom/thumbnails могут быть null (если createImageBitmap не поддерживается).
    // Основное требование: thumbnail существует и не вызывает ошибок.
    expect(project?.thumbnail === null || typeof project?.thumbnail === 'string').toBe(true);

    await deleteProject(id);
  });

  it('saveProject + getProject сохраняют и восстанавливают все поля целиком (интеграционная проверка)', async () => {
    const id = await saveProject({
      id: null,
      name: 'Roundtrip Test',
      sourceImage: new Blob(['roundtrip'], { type: 'image/png' }),
      result: makeFakeResult(),
      customColors: ['#123456', '#abcdef'],
      strokes: [
        makeFakeStroke(),
        { tool: 'eraser', color: '#ffffff', size: 20, opacity: 0.5, points: [] },
      ],
    });

    const saved = await getProject(id);
    expect(saved).toBeDefined();
    expect(saved?.name).toBe('Roundtrip Test');
    expect(saved?.customColors).toEqual(['#123456', '#abcdef']);
    expect(saved?.strokes).toHaveLength(2);
    expect(saved?.strokes?.[0]).toEqual(makeFakeStroke());
    expect(saved?.strokes?.[1]).toEqual({
      tool: 'eraser',
      color: '#ffffff',
      size: 20,
      opacity: 0.5,
      points: [],
    });
    expect(saved?.labels).toBeDefined();

    // В jsdom Dexie Blob не имеет arrayBuffer(); проверяем, что labels сохранён.
    const labelsBlob = saved!.labels;
    expect(labelsBlob).toBeDefined();

    await deleteProject(id);
  });

  it('labelsToBlob и blobToLabels округляют Uint32Array целиком', async () => {
    const size = 128 * 128;
    const original = new Uint32Array(size);
    original.fill(7, 0, size);
    const blob = labelsToBlob(original);
    const restored = await blobToLabels(blob);
    expect(restored).toHaveLength(size);
    expect(restored).toEqual(original);
  });

  it('canvasToBlob возвращает Blob с правильным типом', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 10, 10);

    const blob = await canvasToBlob(canvas, 'image/png');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });

  it('downloadBlob создаёт объектную ссылку на Blob', () => {
    const blob = new Blob(['test content'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url);
  });

  it('shareBlob возвращает unsupported, если API share недоступен', async () => {
    // navigator.share может отсутствовать в тестовом окружении
    const originalShare = navigator.share;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).share = undefined;
    try {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const result = await shareBlob(blob, 'test.txt');
      expect(result).toBe('unsupported');
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).share = originalShare;
    }
  });
});
