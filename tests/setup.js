// Подключаем fake-indexeddb для имитации IndexedDB в тестах
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'

globalThis.indexedDB = indexedDB
globalThis.IDBKeyRange = IDBKeyRange

// Navigator.mock для серверной среды
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { userAgent: 'Node.js' }
}

// requestIdleCallback mock
if (typeof globalThis.requestIdleCallback === 'undefined') {
  globalThis.requestIdleCallback = (cb) => setTimeout(cb, 0)
}

// crypto.randomUUID mock если нет (для тестов storage)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {
    randomUUID: () => '00000000-0000-0000-0000-000000000000',
  }
} else if (typeof crypto.randomUUID === 'undefined') {
  crypto.randomUUID = () => '00000000-0000-0000-0000-000000000000'
}
