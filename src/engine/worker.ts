/// <reference lib="webworker" />
import { runPipeline } from './pipeline';
import type { WorkerRequest, WorkerResponse } from './types';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(msg: WorkerResponse, transfer?: Transferable[]): void {
  ctx.postMessage(msg, transfer ?? []);
}

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  if (req.type !== 'convert') return;
  try {
    // v2: settings-free smart conversion — the pipeline decides everything.
    const result = runPipeline(req.imageData, (p) => {
      post({ type: 'progress', step: p.step, percent: p.percent });
    });
    // The heavy arrays are copied via structured clone here; the main thread
    // hands its buffers to us as transferables at request time.
    post({ type: 'done', result });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
