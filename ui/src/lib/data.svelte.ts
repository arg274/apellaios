// Reactive data loading for pages. Both classes must be constructed during component
// initialisation (they own an $effect), and both split tracking from fetching: the `key`
// function is the only tracked read, so anything read after an `await` can't cause loops.
import { untrack } from 'svelte'
import { getList, type Filter, type ListParams, type SortOrder } from '$lib/api/rest'
import type { ResourceMap, ResourceName } from '$lib/api/types'
import { activity, refreshMatches } from '$lib/state/activity.svelte'
import { hashQuery, setHashQuery } from '$lib/nav.svelte'
import { settings } from '$lib/state/settings.svelte'

const isAbort = (e: unknown) => (e as Error)?.name === 'AbortError'

/**
 * Loads one value per key. Refetches when the key changes (dropping stale responses) and
 * whenever a server refresh event concerns one of `watch` (or `reload()` is called).
 */
export class Loader<K, T> {
  value = $state.raw<T | undefined>(undefined)
  loading = $state(true)
  error = $state.raw<Error | null>(null)
  #version = $state(0)

  constructor(
    key: () => K | null | undefined,
    fetcher: (key: K, signal: AbortSignal) => Promise<T>,
    opts: { watch?: string[]; ids?: () => Record<string, Iterable<string>> } = {},
  ) {
    $effect(() => {
      const k = key()
      void this.#version
      if (k === null || k === undefined) {
        this.loading = false
        return
      }
      const controller = new AbortController()
      untrack(() => {
        this.loading = true
        fetcher(k, controller.signal)
          .then((v) => {
            if (controller.signal.aborted) return
            this.value = v
            this.error = null
          })
          .catch((e) => {
            if (!isAbort(e) && !controller.signal.aborted) this.error = e as Error
          })
          .finally(() => {
            if (!controller.signal.aborted) this.loading = false
          })
      })
      return () => controller.abort()
    })

    if (opts.watch?.length) {
      const watch = opts.watch
      let seen = activity.refresh?.at ?? 0
      $effect(() => {
        const ev = activity.refresh
        if (!ev || ev.at <= seen) return
        seen = ev.at
        if (
          refreshMatches(
            ev.resources,
            watch,
            untrack(() => opts.ids?.()),
          )
        )
          this.reload()
      })
    }
  }

  reload() {
    this.#version++
  }

  /** Optimistically replaces the value (e.g. after toggling a star) */
  set(value: T) {
    this.value = value
  }
}

export interface ListState {
  page: number
  perPage: number
  sort: string
  order: SortOrder
  filter: Filter
}

/**
 * List parameters held in the URL hash (#/album/all?sort=name&order=ASC&page=2&filter={...}),
 * so lists survive reloads and back/forward, with per-list defaults and a remembered page size.
 */
export class UrlListParams {
  #defaults: { sort: string; order: SortOrder; perPage: number; filter: Filter }
  #key: string

  constructor(
    key: string,
    defaults: { sort: string; order?: SortOrder; perPage?: number; filter?: Filter },
  ) {
    this.#key = key
    this.#defaults = {
      sort: defaults.sort,
      order: defaults.order ?? 'ASC',
      perPage: defaults.perPage ?? 50,
      filter: defaults.filter ?? {},
    }
  }

  get page() {
    return Math.max(1, Number(hashQuery().get('page')) || 1)
  }
  set page(v: number) {
    void setHashQuery({ page: v > 1 ? v : undefined })
  }

  get perPage() {
    return Number(hashQuery().get('perPage')) || settings.perPage(this.#key, this.#defaults.perPage)
  }
  set perPage(v: number) {
    settings.setPerPage(this.#key, v)
    void setHashQuery({ perPage: v, page: undefined })
  }

  get sort() {
    return hashQuery().get('sort') || this.#defaults.sort
  }

  get order(): SortOrder {
    const o = hashQuery().get('order')
    return o === 'ASC' || o === 'DESC' ? o : this.#defaults.order
  }

  get filter(): Filter {
    const raw = hashQuery().get('filter')
    if (!raw) return this.#defaults.filter
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : this.#defaults.filter
    } catch {
      return this.#defaults.filter
    }
  }

  /** Sort by a field; choosing the current field again flips the order */
  setSort(field: string, order?: SortOrder) {
    const next = order ?? (field === this.sort ? (this.order === 'ASC' ? 'DESC' : 'ASC') : 'ASC')
    void setHashQuery({ sort: field, order: next, page: undefined })
  }

  setFilter(filter: Filter) {
    const clean = Object.fromEntries(
      Object.entries(filter).filter(([, v]) => v !== undefined && v !== '' && v !== null),
    )
    void setHashQuery({
      filter: Object.keys(clean).length ? JSON.stringify(clean) : undefined,
      page: undefined,
    })
  }

  patchFilter(changes: Filter) {
    this.setFilter({ ...this.filter, ...changes })
  }

  get params(): ListState {
    return {
      page: this.page,
      perPage: this.perPage,
      sort: this.sort,
      order: this.order,
      filter: this.filter,
    }
  }
}

/** A paged list of a REST resource, refetching as its params change */
export class ListController<R extends ResourceName> {
  data = $state.raw<ResourceMap[R][]>([])
  total = $state(0)
  loading = $state(true)
  error = $state.raw<Error | null>(null)
  #version = $state(0)

  constructor(
    resource: R,
    params: () => (ListParams & { enabled?: boolean }) | null,
    opts: { watch?: string[] } = {},
  ) {
    $effect(() => {
      const p = params()
      void this.#version
      if (!p || p.enabled === false) {
        this.loading = false
        return
      }
      // Serialise so a params object recreated with equal content doesn't refetch
      const snapshot = JSON.stringify(p)
      const controller = new AbortController()
      untrack(() => {
        this.loading = true
        getList(resource, { ...JSON.parse(snapshot), signal: controller.signal })
          .then(({ data, total }) => {
            if (controller.signal.aborted) return
            this.data = data
            this.total = total
            this.error = null
          })
          .catch((e) => {
            if (!isAbort(e) && !controller.signal.aborted) this.error = e as Error
          })
          .finally(() => {
            if (!controller.signal.aborted) this.loading = false
          })
      })
      return () => controller.abort()
    })

    const watch = opts.watch ?? [resource]
    let seen = activity.refresh?.at ?? 0
    $effect(() => {
      const ev = activity.refresh
      if (!ev || ev.at <= seen) return
      seen = ev.at
      const loaded = untrack(() => this.data) as { id: string; albumId?: string }[]
      const ids: Record<string, string[]> = { [resource]: loaded.map((r) => String(r.id)) }
      // Tracks show their album's artwork, so an album change can affect a song list
      if (resource === 'song' || resource === 'playlistTrack') {
        ids.album = loaded.flatMap((r) => (r.albumId ? [r.albumId] : []))
      }
      if (refreshMatches(ev.resources, [...watch, ...(ids.album ? ['album'] : [])], ids))
        this.reload()
    })
  }

  reload() {
    this.#version++
  }

  /** Replaces one loaded row in place (optimistic updates) */
  patch(id: string, changes: Partial<ResourceMap[R]>) {
    this.data = this.data.map((r) =>
      (r as { id: string }).id === id ? { ...r, ...changes } : r,
    ) as ResourceMap[R][]
  }
}
