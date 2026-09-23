// Server-sent events (/api/events): scan progress, server restarts, now-playing counts and
// resource change notifications that let open views refresh themselves.
import config from '$lib/config'
import { REST_URL } from '$lib/api/rest'
import { session } from '$lib/api/session'
import { getScanStatus } from '$lib/api/subsonic'
import { t } from '$lib/i18n/index.svelte'
import { toast } from '$lib/state/toast.svelte'
import { baseUrl } from '$lib/utils/urls'
import { throttle } from '$lib/utils/misc'

export interface ScanStatusEvent {
  scanning: boolean
  folderCount: number
  count: number
  error: string
  elapsedTime: number
  scanType?: string
}

/** resource name -> changed ids, where '*' means "everything"; { '*': '*' } refreshes all */
export type RefreshPayload = Record<string, string[] | '*'>

export interface RefreshEvent {
  at: number
  resources: RefreshPayload
}

const RECONNECT_DELAY = 5000

class Activity {
  scanStatus = $state<ScanStatusEvent>({
    scanning: false,
    folderCount: 0,
    count: 0,
    error: '',
    elapsedTime: 0,
  })
  /** When scanStatus last arrived, to keep counting the elapsed time between events */
  scanStatusAt = $state(Date.now())
  serverStart = $state<{ startTime?: number; version?: string }>({ version: config.version })
  /** False after a stream error until the next event arrives */
  serverUp = $state(true)
  nowPlayingCount = $state(0)
  nowPlayingUpdatedAt = $state(0)
  refresh = $state.raw<RefreshEvent | null>(null)
  reconnectedAt = $state(0)

  #stream: EventSource | null = null
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined

  #onScan = throttle((data: ScanStatusEvent) => this.#setScanStatus(data), 100)

  #setScanStatus(data: ScanStatusEvent) {
    this.scanStatus = { ...data, elapsedTime: Number(data.elapsedTime) || 0 }
    this.scanStatusAt = Date.now()
  }

  #versionNotified = false

  /** The server was upgraded under this page: offer a reload, once */
  #checkVersion(version: string | undefined) {
    if (!version || version === config.version || this.#versionNotified) return
    this.#versionNotified = true
    toast.info(t('ra.notification.new_version'), {
      duration: 0,
      action: { label: t('ui.reload', { _: 'Reload' }), run: () => location.reload() },
    })
  }

  /** The stream only reports changes; ask once for the state it started in */
  async loadScanStatus() {
    try {
      const { scanStatus } = await getScanStatus()
      this.#setScanStatus({
        ...scanStatus,
        error: scanStatus.error ?? '',
        elapsedTime: scanStatus.elapsedTime ?? 0,
      })
    } catch {
      // The next event will fill it in
    }
  }

  #handle = (type: string, data: Record<string, unknown>) => {
    this.serverUp = true
    switch (type) {
      case 'scanStatus':
        this.#onScan(data as unknown as ScanStatusEvent)
        break
      case 'serverStart':
        this.serverStart = {
          startTime: data.startTime ? Date.parse(String(data.startTime)) : undefined,
          version: data.version as string | undefined,
        }
        this.#checkVersion(this.serverStart.version)
        break
      case 'refreshResource':
        this.refresh = { at: Date.now(), resources: data as RefreshPayload }
        break
      case 'nowPlayingCount':
        this.nowPlayingCount = Number(data.count) || 0
        this.nowPlayingUpdatedAt = Date.now()
        break
    }
  }

  /** Opens the event stream; safe to call again (e.g. after logging in) */
  connect() {
    this.disconnect()
    if (!session.isAuthenticated) return
    let url = baseUrl(`${REST_URL}/events`)
    const token = session.token
    if (token) url += `?jwt=${encodeURIComponent(token)}`

    const stream = new EventSource(url)
    this.#stream = stream
    const types = ['serverStart', 'scanStatus', 'refreshResource', 'keepAlive']
    if (config.enableNowPlaying) types.push('nowPlayingCount')
    for (const type of types) {
      stream.addEventListener(type, (e) => {
        if (type === 'keepAlive') {
          this.serverUp = true
          return
        }
        try {
          this.#handle(type, JSON.parse((e as MessageEvent).data))
        } catch {
          // Ignore malformed events
        }
      })
    }
    stream.onopen = () => {
      if (!this.serverUp) this.reconnectedAt = Date.now()
      this.serverUp = true
    }
    stream.onerror = () => {
      this.serverUp = false
      // EventSource retries on its own, but a closed stream (e.g. after a 401 or server
      // restart with a new token) needs a fresh connection
      if (stream.readyState === EventSource.CLOSED) this.#scheduleReconnect()
    }
  }

  #scheduleReconnect() {
    if (this.#reconnectTimer) return
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = undefined
      this.connect()
    }, RECONNECT_DELAY)
  }

  disconnect() {
    clearTimeout(this.#reconnectTimer)
    this.#reconnectTimer = undefined
    this.#stream?.close()
    this.#stream = null
  }
}

export const activity = new Activity()

/**
 * Decides whether a refresh event concerns a view. `watched` lists the resources the view shows
 * and `loadedIds` the ids it currently holds, per resource. A wildcard for a watched resource (or
 * the global one) always matches; otherwise only ids the view actually loaded do.
 */
export function refreshMatches(
  resources: RefreshPayload,
  watched: string[],
  loadedIds: Partial<Record<string, Iterable<string>>> = {},
): boolean {
  if (resources['*'] === '*') return true
  for (const r of watched) {
    const ids = resources[r]
    if (!ids) continue
    if (ids === '*' || ids.includes('*')) return true
    const loaded = loadedIds[r]
    if (!loaded) return true
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup inside a pure function
    const set = new Set(ids)
    for (const id of loaded) if (set.has(id)) return true
  }
  return false
}
