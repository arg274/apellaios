// The audio engine. Owns the queue and the <audio> element (bound through the `attach`
// attachment in PlayerAudio.svelte), reports playback to the server for scrobbling and
// now-playing, and mirrors state into the Media Session API.
import { untrack } from 'svelte'
import { BRAND } from '$lib/brand'
import config from '$lib/config'
import { getOne } from '$lib/api/rest'
import { keepalive } from '$lib/api/native'
import {
  coverArtUrl,
  reportPlayback,
  reportPlaybackKeepalive,
  streamUrl,
  type PlaybackState,
} from '$lib/api/subsonic'
import type { PlaylistTrack, Radio, Song } from '$lib/api/types'
import { t } from '$lib/i18n/index.svelte'
import { legacyState, persisted } from '$lib/state/persisted.svelte'
import { settings } from '$lib/state/settings.svelte'
import { toast } from '$lib/state/toast.svelte'
import { decisionService, detectBrowserProfile } from '$lib/transcode'
import { calculateGain, sendNotification } from '$lib/utils/misc'
import {
  insertAfter,
  itemId,
  move,
  nextIndex,
  playable,
  prevIndex,
  radioItem,
  removeAt,
  resumeSeq,
  shuffleUpcoming,
  songItem,
  trimForStorage,
  unshuffleUpcoming,
  type QueueItem,
  type RepeatMode,
} from './queue'

interface Persisted {
  queue: QueueItem[]
  index: number
  position: number
  volume: number
  muted: boolean
  repeat: RepeatMode
  shuffle: boolean
}

const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  typeof navigator === 'undefined' ? '' : navigator.userAgent,
)

/** Pressing "previous" this far into a track restarts it instead */
const RESTART_THRESHOLD = 3

/** Imports the React UI's persisted queue on first run */
const seedFromLegacy = (): Partial<Persisted> => {
  const player = legacyState()?.player as
    | { queue?: { song?: Song; isRadio?: boolean }[]; savedPlayIndex?: number; volume?: number }
    | undefined
  if (!player?.queue?.length) return {}
  const queue = player.queue
    .filter((q) => q.song && !q.isRadio)
    .map((q) => trimForStorage(songItem(q.song as Song)))
  return {
    queue,
    index: Math.min(player.savedPlayIndex ?? 0, queue.length - 1),
    // The legacy player stored sqrt(volume) and applied it squared, which matches our curve
    volume: player.volume ?? config.defaultUIVolume / 100,
  }
}

class PlayerEngine {
  #store = persisted<Persisted>(
    'nd-player',
    {
      queue: [],
      index: -1,
      position: 0,
      volume: config.defaultUIVolume / 100,
      muted: false,
      repeat: 'off',
      shuffle: false,
    },
    seedFromLegacy,
  )

  // Live element state, updated from media events
  paused = $state(true)
  currentTime = $state(0)
  duration = $state(0)
  buffered = $state(0)
  waiting = $state(false)
  /** Full record of the current song (lyrics, starred...), fetched when a track starts */
  details = $state<Song | null>(null)
  /** Whether the full-screen "now playing" view is open */
  expanded = $state(false)

  readonly isMobile = IS_MOBILE

  #el: HTMLAudioElement | null = null
  #loadToken = 0
  #reportedId: string | null = null
  #lastPositionMs = 0
  #heartbeat: ReturnType<typeof setInterval> | undefined
  #seekTimer: ReturnType<typeof setTimeout> | undefined
  #retried = false
  #audioContext: AudioContext | null = null
  #gainNode: GainNode | null = null
  #restorePosition = 0

  constructor() {
    resumeSeq(this.#store.queue)
    if (this.#store.index >= this.#store.queue.length)
      this.#store.index = this.#store.queue.length - 1
    this.#restorePosition = this.#store.position
    decisionService.setProfile(typeof Audio === 'undefined' ? null : detectBrowserProfile())
  }

  // ---- Derived state -------------------------------------------------------------------------

  get queue(): QueueItem[] {
    return this.#store.queue
  }

  get index() {
    return this.#store.index
  }

  get current(): QueueItem | undefined {
    return this.#store.queue[this.#store.index]
  }

  get currentSong() {
    const c = this.current
    return c?.kind === 'song' ? c.song : undefined
  }

  get isRadio() {
    return this.current?.kind === 'radio'
  }

  get hasQueue() {
    return this.#store.queue.length > 0
  }

  get upcoming(): QueueItem[] {
    return this.#store.queue.slice(this.#store.index + 1)
  }

  get history(): QueueItem[] {
    return this.#store.queue.slice(0, Math.max(this.#store.index, 0))
  }

  get volume() {
    return this.#store.volume
  }
  set volume(v: number) {
    this.#store.volume = Math.min(1, Math.max(0, v))
    if (v > 0) this.#store.muted = false
  }

  get muted() {
    return this.#store.muted
  }
  set muted(v: boolean) {
    this.#store.muted = v
  }

  get repeat() {
    return this.#store.repeat
  }
  set repeat(mode: RepeatMode) {
    this.#store.repeat = mode
  }

  get shuffle() {
    return this.#store.shuffle
  }

  get canNext() {
    return nextIndex(this.#store.queue.length, this.#store.index, this.#store.repeat) >= 0
  }

  // ---- Element wiring ------------------------------------------------------------------------

  /** Svelte attachment for the <audio> element; everything tracked lives in nested effects */
  attach = (el: HTMLAudioElement) => {
    this.#el = el
    const on = <K extends keyof HTMLMediaElementEventMap>(
      type: K,
      fn: (e: HTMLMediaElementEventMap[K]) => void,
    ) => el.addEventListener(type, fn)

    on('play', () => {
      this.paused = false
      this.#onPlay()
    })
    on('pause', () => {
      this.paused = true
      this.#onPause()
    })
    on('playing', () => {
      this.waiting = false
      // Audio is actually flowing, so a later failure deserves a fresh retry
      this.#retried = false
    })
    on('waiting', () => (this.waiting = true))
    on('timeupdate', () => {
      this.currentTime = el.currentTime
      if (!this.isRadio) this.#lastPositionMs = Math.floor(el.currentTime * 1000)
    })
    on('durationchange', () => {
      this.duration = isFinite(el.duration) ? el.duration : 0
    })
    on('progress', () => {
      const b = el.buffered
      this.buffered = b.length ? b.end(b.length - 1) : 0
    })
    on('loadedmetadata', () => {
      if (this.#restorePosition > 0 && !this.isRadio) {
        el.currentTime = Math.min(this.#restorePosition, el.duration || this.#restorePosition)
      }
      this.#restorePosition = 0
    })
    on('seeked', () => this.#onSeeked())
    on('ended', () => this.#onEnded())
    on('error', () => this.#onError())

    this.#setupMediaSession()

    const onPageHide = () => {
      this.#store.position = el.currentTime
      if (this.#reportedId && !this.isRadio) {
        reportPlaybackKeepalive(this.#reportedId, this.#lastPositionMs, 'stopped')
      }
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!el.paused) e.preventDefault()
    }
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)

    $effect(() => {
      // Phones use the hardware volume keys; a software level would only fight them
      el.volume = this.isMobile ? 1 : this.#store.muted ? 0 : this.#store.volume ** 2
    })

    $effect(() => {
      const gain = this.#currentGain()
      untrack(() => this.#applyGain(gain))
    })

    // Restore the last session's track without autoplaying
    untrack(() => {
      if (this.current) void this.#load(this.#store.index, false)
    })

    return () => {
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      clearInterval(this.#heartbeat)
      this.#el = null
    }
  }

  // ---- Transport -----------------------------------------------------------------------------

  play = async () => {
    const el = this.#el
    if (!el || !this.current) return
    if (!el.src) {
      await this.#load(this.#store.index, true)
      return
    }
    await this.#resumeContext()
    try {
      await el.play()
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') console.warn('play() failed', e)
    }
  }

  pause = () => this.#el?.pause()

  togglePlay = () => (this.paused ? this.play() : this.pause())

  next = () => {
    const i = nextIndex(this.#store.queue.length, this.#store.index, this.#store.repeat)
    if (i >= 0) void this.#load(i, true)
  }

  prev = () => {
    if (this.currentTime > RESTART_THRESHOLD || this.#store.index === 0) {
      this.seek(0)
      return
    }
    const i = prevIndex(this.#store.queue.length, this.#store.index, this.#store.repeat)
    if (i >= 0) void this.#load(i, true)
  }

  seek = (seconds: number) => {
    const el = this.#el
    if (!el || this.isRadio) return
    el.currentTime = Math.max(0, Math.min(seconds, this.duration || seconds))
    this.currentTime = el.currentTime
  }

  jumpTo = (index: number) => {
    if (index >= 0 && index < this.#store.queue.length) void this.#load(index, true)
  }

  cycleRepeat = () => {
    this.#store.repeat =
      this.#store.repeat === 'off' ? 'all' : this.#store.repeat === 'all' ? 'one' : 'off'
  }

  toggleShuffle = () => {
    const on = !this.#store.shuffle
    this.#store.shuffle = on
    this.#store.queue = on
      ? shuffleUpcoming(this.#store.queue, this.#store.index)
      : unshuffleUpcoming(this.#store.queue, this.#store.index)
  }

  // ---- Queue operations ----------------------------------------------------------------------

  /** Replaces the queue and starts playing at `startIndex` (or a random track if shuffling) */
  playTracks = (
    tracks: (Song | PlaylistTrack)[],
    opts: { startIndex?: number; shuffle?: boolean } = {},
  ) => {
    const songs = playable(tracks)
    if (songs.length === 0) return
    let start = Math.min(Math.max(opts.startIndex ?? 0, 0), songs.length - 1)
    // A start index refers to the unfiltered list; follow the song, not the position
    const startId = tracks[opts.startIndex ?? 0]?.id
    const found = songs.findIndex((s) => s.id === startId)
    if (found >= 0) start = found
    let queue = songs.map(songItem)
    // Playing a list explicitly starts in order; "shuffle" buttons opt in
    this.#store.shuffle = !!opts.shuffle
    if (opts.shuffle) {
      if (opts.startIndex !== undefined) {
        // Start on the chosen track, shuffle the rest after it
        const first = queue[start]
        queue = [
          first,
          ...shuffleUpcoming(
            queue.filter((q) => q !== first),
            -1,
          ),
        ]
      } else {
        queue = shuffleUpcoming(queue, -1)
      }
      start = 0
    }
    this.#replaceQueue(queue, start)
  }

  playRadio = (radio: Radio) => this.#replaceQueue([radioItem(radio)], 0)

  playNext = (tracks: (Song | PlaylistTrack)[]) => {
    const items = playable(tracks).map(songItem)
    if (items.length === 0) return
    if (!this.hasQueue) return this.#replaceQueue(items, 0)
    this.#store.queue = insertAfter(this.#store.queue, this.#store.index, items)
  }

  addToQueue = (tracks: (Song | PlaylistTrack)[]) => {
    const items = playable(tracks).map(songItem)
    if (items.length === 0) return
    if (!this.hasQueue) return this.#replaceQueue(items, 0)
    this.#store.queue = [...this.#store.queue, ...items]
  }

  moveItem = (from: number, to: number) => {
    const [queue, index] = move(this.#store.queue, from, to, this.#store.index)
    this.#store.queue = queue
    this.#store.index = index
  }

  remove = (indices: number[]) => {
    const wasCurrent = indices.includes(this.#store.index)
    const [queue, index] = removeAt(this.#store.queue, indices, this.#store.index)
    if (queue.length === 0) return this.clear()
    this.#store.queue = queue
    this.#store.index = index
    if (wasCurrent) void this.#load(index, !this.paused)
  }

  /** Drops everything after the current track */
  clearUpcoming = () => {
    this.#store.queue = this.#store.queue.slice(0, this.#store.index + 1)
  }

  clear = () => {
    this.#reportStop()
    const el = this.#el
    if (el) {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
    this.#store.queue = []
    this.#store.index = -1
    this.#store.position = 0
    this.#store.shuffle = false
    this.details = null
    this.currentTime = 0
    this.duration = 0
    this.expanded = false
    document.title = BRAND
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null
  }

  /** Patches the current song's details after e.g. starring it elsewhere */
  updateDetails(patch: Partial<Song>) {
    if (this.details) this.details = { ...this.details, ...patch }
  }

  #replaceQueue(queue: QueueItem[], start: number) {
    this.#reportStop()
    this.#restorePosition = 0
    this.#store.queue = queue
    void this.#load(start, true)
  }

  // ---- Loading -------------------------------------------------------------------------------

  /** `retry` marks the reload after an error, which must not re-arm the one-retry guard */
  async #load(index: number, autoplay: boolean, { retry = false }: { retry?: boolean } = {}) {
    const el = this.#el
    const item = this.#store.queue[index]
    if (!item) return
    const token = ++this.#loadToken
    if (itemId(item) !== this.#reportedId) this.#reportStop()
    this.#store.index = index
    if (!retry) this.#retried = false
    this.currentTime = this.#restorePosition || 0
    this.duration = item.kind === 'song' ? item.song.duration : 0
    this.buffered = 0
    this.details = null

    let src: string
    if (item.kind === 'radio') {
      src = item.radio.streamUrl
    } else {
      src = await decisionService
        .resolveStreamUrl(item.song.id)
        .catch(() => streamUrl(item.song.id))
      void this.#fetchDetails(item.song.id, token)
      this.#prefetchUpcoming()
    }
    if (token !== this.#loadToken || !el) return

    this.#updateMediaMetadata()
    this.#ensureGainGraph()
    el.src = src
    if (autoplay) {
      await this.#resumeContext()
      try {
        await el.play()
      } catch (e) {
        if ((e as DOMException).name !== 'AbortError') console.warn('play() failed', e)
      }
    }
  }

  async #fetchDetails(id: string, token: number) {
    try {
      const song = await getOne('song', id)
      if (token === this.#loadToken) this.details = song
    } catch {
      // Details only drive lyrics and the love button; playback does not depend on them
    }
  }

  #prefetchUpcoming() {
    const ids = this.#store.queue
      .slice(this.#store.index + 1, this.#store.index + 4)
      .flatMap((q) => (q.kind === 'song' ? [q.song.id] : []))
    if (ids.length) void decisionService.prefetchDecisions(ids)
  }

  // ---- Event handlers ------------------------------------------------------------------------

  #onPlay() {
    const item = this.current
    if (!item) return
    if (item.kind === 'song') {
      const song = item.song
      document.title = `${song.title} - ${song.artist} - ${BRAND}`
      const pos = this.#lastPositionMs
      if (this.#reportedId !== song.id) {
        this.#reportedId = song.id
        void reportPlayback(song.id, pos, 'starting').then(() =>
          reportPlayback(song.id, pos, 'playing'),
        )
        if (settings.notifications) {
          sendNotification(
            song.title,
            `${song.artist} - ${song.album}`,
            coverArtUrl('song', song, 300),
          )
        }
      } else {
        void reportPlayback(song.id, pos, 'playing')
      }
      this.#startHeartbeat(song.id)
    } else {
      document.title = `${item.radio.name} - ${BRAND}`
    }
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
  }

  #onPause() {
    this.#stopHeartbeat()
    if (this.#el) this.#store.position = this.#el.currentTime
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
    if (this.#reportedId && !this.isRadio && !this.#el?.ended) {
      void reportPlayback(this.#reportedId, this.#lastPositionMs, 'paused')
    }
  }

  #onEnded() {
    const item = this.current
    if (item?.kind === 'song') {
      void reportPlayback(item.song.id, Math.floor(item.song.duration * 1000), 'stopped')
      void keepalive(item.song.id)
    }
    this.#reportedId = null
    this.#stopHeartbeat()
    if (this.#store.repeat === 'one') {
      this.seek(0)
      void this.play()
      return
    }
    const i = nextIndex(this.#store.queue.length, this.#store.index, this.#store.repeat)
    if (i >= 0) {
      void this.#load(i, true)
    } else {
      this.#store.position = 0
      document.title = BRAND
    }
  }

  #onSeeked() {
    this.#store.position = this.#el?.currentTime ?? 0
    // Coalesce a drag across the progress bar into one report at the final position
    clearTimeout(this.#seekTimer)
    this.#seekTimer = setTimeout(() => {
      const el = this.#el
      if (!el || !this.#reportedId || this.isRadio) return
      void reportPlayback(
        this.#reportedId,
        Math.floor(el.currentTime * 1000),
        el.paused ? 'paused' : 'playing',
      )
    }, 250)
  }

  #onError() {
    const el = this.#el
    const item = this.current
    if (!el || !item || !el.src) return
    console.warn('Playback error', el.error?.code, el.error?.message, el.src)
    // A stale transcode token is the usual culprit: drop cached decisions and retry once
    decisionService.invalidateAll()
    if (!this.#retried && item.kind === 'song') {
      this.#retried = true
      this.#restorePosition = el.currentTime
      void this.#load(this.#store.index, !el.paused || this.waiting, { retry: true })
      return
    }
    this.waiting = false
    toast.error(t('ui.playerError'))
  }

  #startHeartbeat(id: string) {
    this.#stopHeartbeat()
    this.#heartbeat = setInterval(() => {
      if (this.#reportedId === id) void reportPlayback(id, this.#lastPositionMs, 'playing')
    }, config.playbackReportIntervalMs)
  }

  #stopHeartbeat() {
    clearInterval(this.#heartbeat)
    this.#heartbeat = undefined
  }

  #reportStop() {
    this.#stopHeartbeat()
    if (this.#reportedId && !this.isRadio) {
      void reportPlayback(this.#reportedId, this.#lastPositionMs, 'stopped' as PlaybackState)
    }
    this.#reportedId = null
  }

  // ---- ReplayGain ----------------------------------------------------------------------------

  #currentGain(): number {
    const song = this.details ?? this.currentSong
    if (!config.enableReplayGain || !song) return 1
    return calculateGain(settings.replayGain, settings.preAmp, song)
  }

  /**
   * Routes the element through a GainNode, created the first time a track loads with ReplayGain
   * on. It has to happen before `src` is set: Web Audio outputs silence for media fetched without
   * CORS, so the element must request anonymously from then on. That also means a mode switched
   * on mid-track takes effect from the next track. Radios without CORS headers can't play through
   * the graph, which is why it is never created while ReplayGain is off.
   */
  #ensureGainGraph() {
    const el = this.#el
    if (!el || this.#audioContext || settings.replayGain === 'none' || !config.enableReplayGain)
      return
    if (!('AudioContext' in window)) return
    el.crossOrigin = 'anonymous'
    const ctx = new AudioContext()
    const source = ctx.createMediaElementSource(el)
    const gain = ctx.createGain()
    source.connect(gain)
    gain.connect(ctx.destination)
    this.#audioContext = ctx
    this.#gainNode = gain
  }

  #applyGain(value: number) {
    if (this.#gainNode && this.#audioContext) {
      this.#gainNode.gain.setValueAtTime(value, this.#audioContext.currentTime)
    }
  }

  async #resumeContext() {
    if (this.#audioContext && this.#audioContext.state !== 'running') {
      await this.#audioContext.resume().catch(() => {})
    }
  }

  // ---- Media Session -------------------------------------------------------------------------

  #setupMediaSession() {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => void this.play()],
      ['pause', () => this.pause()],
      ['previoustrack', () => this.prev()],
      ['nexttrack', () => this.next()],
      ['seekto', (d) => d.seekTime !== undefined && this.seek(d.seekTime)],
      ['seekbackward', (d) => this.seek(this.currentTime - (d.seekOffset ?? 10))],
      ['seekforward', (d) => this.seek(this.currentTime + (d.seekOffset ?? 10))],
      ['stop', () => this.pause()],
    ]
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        // Unsupported action in this browser
      }
    }
  }

  #updateMediaMetadata() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
    const item = this.current
    if (!item) return
    if (item.kind === 'radio') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.radio.name,
        artwork: [{ src: coverArtUrl('radio', item.radio, 300, true), sizes: '300x300' }],
      })
      return
    }
    const s = item.song
    navigator.mediaSession.metadata = new MediaMetadata({
      title: s.title,
      artist: s.artist,
      album: s.album,
      artwork: [256, 512].map((size) => ({
        src: coverArtUrl('song', s, size, true),
        sizes: `${size}x${size}`,
        type: 'image/jpeg',
      })),
    })
  }
}

export const player = new PlayerEngine()
