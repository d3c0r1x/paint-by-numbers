import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Авто-очистка после каждого теста (React 18+ StrictMode дублирует монтирование).
afterEach(() => cleanup());

// Мокаем pointer events для тестов кисти.
class MockPointerEvent {
  clientX = 0;
  clientY = 0;
  pressure = 0.5;
  constructor() {}
  getCoalescedEvents() {
    return [];
  }
  setPointerCapture() {}
  releasePointerCapture() {}
}
globalThis.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;

import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

if (typeof globalThis.navigator === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).navigator = { userAgent: 'Node.js' };
}

if (typeof globalThis.requestIdleCallback === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).requestIdleCallback = (
    cb: (...args: unknown[]) => unknown,
  ) => setTimeout(cb, 0);
}

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).crypto = {
    randomUUID: () => '00000000-0000-0000-0000-000000000000',
  };
} else {
  const cryptoAny = crypto as unknown as Record<string, unknown>;
  if (typeof cryptoAny.randomUUID === 'undefined') {
    cryptoAny.randomUUID = () => '00000000-0000-0000-0000-000000000000';
  }
}

// Canvas mock для тестов contour (jsdom не поддерживает canvas без canvas package).
if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return {
      fillRect: function () {},
      clearRect: function () {},
      save: function () {},
      restore: function () {},
      fillStyle: '#000000',
      lineWidth: 2,
      lineJoin: 'round' as CanvasLineJoin,
      lineCap: 'round' as CanvasLineCap,
      getImageData: function (
        this: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
      ) {
        const pixels = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < pixels.length; i++) pixels[i] = 255;
        return { data: pixels, width: w, height: h } as ImageData;
      },
      putImageData: function () {},
    } as unknown as CanvasRenderingContext2D;
  };
}
