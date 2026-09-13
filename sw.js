/// <reference lib="webworker" />

const CACHE = 'paint-by-numbers-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (e: ExtendableEvent) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  )
  (self as ServiceWorkerGlobalScope).skipWaiting()
})

self.addEventListener('activate', (e: ExtendableEvent) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  )
  (self as ServiceWorkerGlobalScope).clients.claim()
})

self.addEventListener('fetch', (event: FetchEvent) => {
  // Статика — из кэша, с обновлением в фоне (stale-while-revalidate).
  // API/данные — только если есть в сети.
  const url = new URL(event.request.url)
  if (url.origin !== location.origin) return // чужие домены — сеть

  const cacheFirst = ['/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.json']
  if (cacheFirst.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone()
            caches.open(CACHE).then((c) => c.put(event.request, clone))
          }
          return resp
        })
      }),
    )
    return
  }

  // Остальное — сеть, fallback в кэш.
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone()
          caches.open(CACHE).then((c) => c.put(event.request, clone))
        }
        return resp
      })
      .catch(() => caches.match(event.request)),
  )
})
