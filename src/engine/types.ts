/** Shared engine + pipeline types (Task 7 output shape; v2 smart pipeline). */

export type Lab = [number, number, number];

export interface PaletteEntry {
  index: number;
  lab: Lab;
  hex: string;
  pixelCount: number;
}

export interface RegionInfo {
  colorIdx: number;
  area: number;
  labelX: number;
  labelY: number;
  fontSize: number;
}

export interface PipelineResult {
  width: number;
  height: number;
  labels: Uint32Array;
  palette: PaletteEntry[];
  regions: RegionInfo[];
}

/** Steps of the v2 smart pipeline (no difficulty presets). */
export type PipelineStep = 'analyze' | 'palette' | 'regions' | 'merge' | 'contours' | 'numbers';

/** Message shapes exchanged with engine/worker.ts. */
export type WorkerRequest = { type: 'convert'; imageData: ImageData };

export type WorkerResponse =
  | { type: 'progress'; step: PipelineStep; percent: number }
  | { type: 'done'; result: PipelineResult }
  | { type: 'error'; message: string };
