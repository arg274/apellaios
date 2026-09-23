/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Precaches the app's hashed build output so the shell loads without the network, and falls
// back to offline.html when a navigation can't reach the server. index.html itself is never
// cached: the server renders it per request with the app config.
import { build, files, version } from '$service-worker'

const sw = self as unknown as ServiceWorkerGlobalScope
const CACHE = `apellaios-${version}`

// With relative paths, SvelteKit already prefixes the manifest with this script's directory
// (<BasePath>/app), so the entries only need making absolute
const absolute = (path: string) => new URL(path, sw.location.href).href
const OFFLINE = absolute('offline.html')
const PRECACHE = [...build, ...files.filter((f) => !f.endsWith('.gitkeep'))].map(absolute)
const precached = new Set(PRECACHE)

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => sw.skipWaiting()),
  )
})

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  )
})

sw.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    // Network only; a server that's down or erroring gets the offline page instead
    event.respondWith(
      fetch(request)
        .then((res) => (res.status >= 500 ? offline() : res))
        .catch(offline),
    )
    return
  }

  // Build output is content-hashed, so a cached copy is always right. Everything else (API,
  // artwork, audio streams) goes straight to the network.
  if (precached.has(request.url)) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)))
  }
})

async function offline(): Promise<Response> {
  return (
    (await caches.match(OFFLINE)) ??
    new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  )
}
