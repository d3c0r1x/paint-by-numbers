import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, type Mock } from 'vitest';

// Авто-очистка после каждого теста (React 18+ StrictMode дублирует монтирование).
afterEach(() => cleanup());

// Мокаем pointer events для тестов кисти.
class MockPointerEvent {
  constructor(
    public clientX = 0,
    public clientY = 0,
    public pressure = 0.5,
  ) {}
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
  globalThis.navigator = { userAgent: 'Node.js' };
}

if (typeof globalThis.requestIdleCallback === 'undefined') {
  globalThis.requestIdleCallback = (cb) => setTimeout(cb, 0);
}

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = { randomUUID: () => '00000000-0000-0000-0000-000000000000' };
} else if (typeof crypto.randomUUID === 'undefined') {
  crypto.randomUUID = () => '00000000-0000-0000-0000-000000000000';
}
