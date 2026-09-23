// Client for the native REST API (server/nativeapi), which follows json-server conventions:
// _start/_end/_sort/_order paging, filters as plain query params, totals in X-Total-Count.
import { librarySelection } from '$lib/state/library.svelte'
import { http } from './http'
import { session } from './session'
import type { ResourceMap, ResourceName } from './types'

export const REST_URL = '/api'

export type SortOrder = 'ASC' | 'DESC'

export type FilterValue = string | number | boolean | null | undefined | (string | number)[]
export type Filter = Record<string, FilterValue>

export interface ListParams {
  page?: number
  perPage?: number
  sort?: string
  order?: SortOrder
  filter?: Filter
  signal?: AbortSignal
}

export interface ListResult<T> {
  data: T[]
  total: number
}

/** Resources whose queries are scoped to the libraries picked in the sidebar */
const LIBRARY_SCOPED = new Set<ResourceName>(['album', 'song', 'artist', 'playlistTrack', 'tag'])
/** Resources that hide missing files from non-admins */
const HIDES_MISSING = new Set<ResourceName>(['album', 'song', 'artist', 'tag', 'playlistTrack'])

/** Maps a logical resource plus filter onto the concrete endpoint and query */
function route(resource: ResourceName, filter: Filter = {}): [string, Filter] {
  const f: Filter = { ...filter }
  if (HIDES_MISSING.has(resource) && !session.isAdmin) f.missing = false
  if (LIBRARY_SCOPED.has(resource)) {
    const libs = librarySelection.filterIds
    if (libs.length > 0) f.library_id = libs
  }
  if (resource === 'playlistTrack') {
    const playlistId = String(f.playlist_id ?? '0')
    delete f.playlist_id
    return [`${REST_URL}/playlist/${playlistId}/tracks`, f]
  }
  return [`${REST_URL}/${resource}`, f]
}

export function toQuery(params: Filter): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => q.append(key, String(v)))
    else q.append(key, String(value))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function getList<R extends ResourceName>(
  resource: R,
  { page = 1, perPage = 25, sort, order = 'ASC', filter, signal }: ListParams = {},
): Promise<ListResult<ResourceMap[R]>> {
  const [url, f] = route(resource, filter)
  const query: Filter = { ...f, _start: (page - 1) * perPage, _end: page * perPage }
  if (sort) {
    query._sort = sort
    query._order = order
  }
  const res = await http<ResourceMap[R][]>(url + toQuery(query), { signal })
  const total = parseInt(res.headers.get('X-Total-Count') ?? '', 10)
  return { data: res.json ?? [], total: isNaN(total) ? (res.json?.length ?? 0) : total }
}

/** Fetches every row matching the filter (for playing a whole list); capped for safety */
export async function getAll<R extends ResourceName>(
  resource: R,
  params: Omit<ListParams, 'page' | 'perPage'> = {},
  max = 5000,
): Promise<ResourceMap[R][]> {
  const { data } = await getList(resource, { ...params, page: 1, perPage: max })
  return data
}

export async function getOne<R extends ResourceName>(
  resource: R,
  id: string | number,
  opts: { signal?: AbortSignal; filter?: Filter } = {},
): Promise<ResourceMap[R]> {
  const [url] = route(resource, opts.filter)
  const res = await http<ResourceMap[R]>(`${url}/${encodeURIComponent(String(id))}`, {
    signal: opts.signal,
  })
  return res.json
}

export async function getMany<R extends ResourceName>(
  resource: R,
  ids: (string | number)[],
): Promise<ResourceMap[R][]> {
  if (ids.length === 0) return []
  const [url, f] = route(resource)
  const res = await http<ResourceMap[R][]>(url + toQuery({ ...f, id: ids }))
  return res.json ?? []
}

export async function create<R extends ResourceName>(
  resource: R,
  data: Partial<ResourceMap[R]> | Record<string, unknown>,
): Promise<ResourceMap[R]> {
  const [url] = route(resource)
  const res = await http<Partial<ResourceMap[R]>>(url, { method: 'POST', body: data })
  return { ...data, ...res.json } as ResourceMap[R]
}

export async function update<R extends ResourceName>(
  resource: R,
  id: string | number,
  data: Partial<ResourceMap[R]> | Record<string, unknown>,
): Promise<ResourceMap[R]> {
  const [url] = route(resource)
  const res = await http<ResourceMap[R]>(`${url}/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    body: data,
  })
  return (res.json ?? { ...data, id }) as ResourceMap[R]
}

export async function remove(resource: ResourceName, id: string | number): Promise<void> {
  const [url] = route(resource)
  await http(`${url}/${encodeURIComponent(String(id))}`, { method: 'DELETE' })
}

/**
 * Deletes several rows. Playlist tracks and missing files have a bulk endpoint taking repeated
 * `id` params; everything else is deleted one by one, as json-server has no bulk delete.
 */
export async function removeMany(
  resource: ResourceName,
  ids: (string | number)[],
  filter?: Filter,
): Promise<void> {
  if (resource === 'playlistTrack' || resource === 'missing') {
    const [url] = route(resource, filter)
    await http(url + toQuery({ id: ids }), { method: 'DELETE' })
    return
  }
  await Promise.all(ids.map((id) => remove(resource, id)))
}
