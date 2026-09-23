// Navigation helpers for hash routing. SvelteKit keeps the route in location.hash, so query
// parameters live inside the hash too (#/album/all?sort=name), where page.url.searchParams
// can't see them. These read and write that part.
import { goto } from '$app/navigation'
import { page } from '$app/state'

/** Link target for an app path: href('/album/123/show') -> '#/album/123/show' */
export const href = (path: string, query?: Record<string, string | number | undefined>): string => {
  const q = query ? toSearch(query) : ''
  return `#${path.startsWith('/') ? path : '/' + path}${q}`
}

const toSearch = (query: Record<string, string | number | undefined>) => {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a local builder, serialised right away
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query))
    if (v !== undefined && v !== '') params.set(k, String(v))
  const s = params.toString()
  return s ? `?${s}` : ''
}

/** The current route path, without the hash query */
export const currentPath = (): string => {
  const raw = page.url.hash.replace(/^#/, '')
  return raw.split('?')[0] || '/'
}

/** Query parameters from inside the hash; reactive when read in a template or $derived */
export const hashQuery = (): URLSearchParams => {
  const raw = page.url.hash
  const i = raw.indexOf('?')
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- reactivity comes from page.url; this is a fresh read
  return new URLSearchParams(i >= 0 ? raw.slice(i + 1) : '')
}

export const navigate = (path: string, opts: { replace?: boolean } = {}) =>
  goto(path.startsWith('#') ? path : href(path), { replaceState: opts.replace })

/** Merges `changes` into the hash query; undefined removes a key. Replaces history by default. */
export const setHashQuery = (
  changes: Record<string, string | number | undefined | null>,
  opts: { replace?: boolean } = { replace: true },
) => {
  const params = hashQuery()
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined || v === null || v === '') params.delete(k)
    else params.set(k, String(v))
  }
  const s = params.toString()
  return goto(`#${currentPath()}${s ? '?' + s : ''}`, {
    replaceState: opts.replace,
    keepFocus: true,
    noScroll: true,
  })
}
