// Record labels. Navidrome has no label entity: a label is the albums' `recordlabel` tag, and its
// only id is the tag's hash of the (lowercased) name. Label pages are therefore addressed by name
// and resolved to the tag here.
import { getList } from '$lib/api/rest'
import type { Album, Tag } from '$lib/api/types'

/** The label tag with this name (case-insensitive, like the server's tag ids), or null */
export async function findLabel(name: string): Promise<Tag | null> {
  const wanted = name.trim().toLowerCase()
  // The API only matches names by substring, so narrow it down and pick the exact one
  const { data } = await getList('tag', {
    filter: { tag_name: 'recordlabel', name: name.trim() },
    perPage: 50,
  })
  return data.find((tag) => tag.tagValue.trim().toLowerCase() === wanted) ?? null
}

const year = (a: Album) => a.maxYear || a.maxOriginalYear || 0

/** Newest first; albums without a year go last, most recently added first */
export const byLatest = (albums: Album[]): Album[] =>
  [...albums].sort(
    (a, b) => year(b) - year(a) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )

/** Every release, A-Z */
export const byName = (albums: Album[]): Album[] =>
  [...albums].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
