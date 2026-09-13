/** Project persistence per SPEC Task 15 (Dexie over IndexedDB). */
import Dexie, { type Table } from 'dexie';
import type { PipelineResult, RegionInfo } from '../engine/types';
import type { PaintAction } from '../canvas/BrushEngine';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceImage: Blob;
  width: number;
  height: number;
  /** Persisted as a Blob wrapping the Uint32Array buffer (region id per pixel). */
  labels: Blob;
  /** Extension beyond the SPEC schema: number placements so a restored
   * project can redraw region numbers (contours are rebuilt from labels). */
  regions: RegionInfo[];
  /** v2 smart pipeline: number of palette colors (no difficulty presets). */
  colorCount: number;
  palette: ProjectPaletteEntry[];
  customColors: string[];
  /** History entries: brush/eraser strokes and "fill-all" actions (older
   * projects saved before fill-all only contain strokes — compatible). */
  strokes: PaintAction[];
}

class PaintByNumbersDb extends Dexie {
  projects!: Table<Project, string>;

  constructor() {
    super('paint-by-numbers');
    this.version(1).stores({
      projects: 'id, updatedAt, createdAt',
    });
  }
}

export const db = new PaintByNumbersDb();

/** crypto.randomUUID with a fallback (UUID needs a secure context; local http may lack it). */
export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 version-4 fallback over crypto.getRandomValues / Math.random.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

export function labelsToBlob(labels: Uint32Array): Blob {
  return new Blob([labels.buffer as ArrayBuffer], { type: 'application/octet-stream' });
}

export async function blobToLabels(blob: Blob): Promise<Uint32Array> {
  return new Uint32Array(await blob.arrayBuffer());
}

export interface ProjectPaletteEntry {
  colorIdx: number;
  hex: string;
}

export interface SaveInput {
  id: string | null;
  name: string;
  sourceImage: Blob;
  result: PipelineResult;
  customColors: string[];
  strokes: PaintAction[];
}
/** Create or update a project; returns the project id. */
export async function saveProject(input: SaveInput): Promise<string> {
  const now = Date.now();
  const id = input.id ?? makeId();
  const existing = input.id ? await db.projects.get(input.id) : undefined;
  const project: Project = {
    id,
    name: input.name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sourceImage: input.sourceImage,
    width: input.result.width,
    height: input.result.height,
    labels: labelsToBlob(input.result.labels),
    regions: input.result.regions,
    colorCount: input.result.palette.length,
    palette: input.result.palette.map((p) => ({ colorIdx: p.index, hex: p.hex })),
    customColors: input.customColors,
    strokes: input.strokes,
  };
  await db.projects.put(project);
  return id;
}

export async function listProjects(): Promise<Array<Project & { thumbnail: string | null }>> {
  const projects = await db.projects.orderBy('updatedAt').reverse().toArray();
  // Generate thumbnails in parallel for faster home screen loading.
  const thumbnails = await Promise.allSettled(
    projects.map((project) => makeThumbnail(project.sourceImage)),
  );
  return projects.map((project, i) => ({
    ...project,
    thumbnail: thumbnails[i].status === 'fulfilled' ? thumbnails[i].value : null,
  }));
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

async function makeThumbnail(source: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(source);
    const scale = Math.min(1, 96 / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return null;
  }
}
