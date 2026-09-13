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
