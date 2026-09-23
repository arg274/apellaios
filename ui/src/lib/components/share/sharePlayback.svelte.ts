import type { Attachment } from 'svelte/attachments'
import type { ShareTrack } from '$lib/config'
import { shareCoverUrl, shareStreamUrl } from '$lib/utils/urls'

/**
 * Playback for the public share page. It is deliberately separate from the app's PlayerEngine:
 * there is no session, so nothing is scrobbled, persisted or transcoded client-side, and tracks
 * stream from the share's own signed URLs.
 */
export class SharePlayback {
  readonly tracks: ShareTrack[]
  index = $state(-1)
  paused = $state(true)
  position = $state(0)
  #elementDuration = $state(0)
  #el: HTMLAudioElement | null = null

  constructor(tracks: ShareTrack[]) {
    this.tracks = tracks
  }

  get current(): ShareTrack | undefined {
    return this.tracks[this.index]
  }

  /** The element's figure once metadata loads, the share's own until then */
  get duration() {
    return this.#elementDuration || this.current?.duration || 0
  }

  get hasNext() {
    return this.index < this.tracks.length - 1
  }

  attach: Attachment<HTMLAudioElement> = (el) => {
    this.#el = el
    const on = <K extends keyof HTMLMediaElementEventMap>(type: K, fn: () => void) => {
      el.addEventListener(type, fn)
      return () => el.removeEventListener(type, fn)
    }
    const offs = [
      on('play', () => (this.paused = false)),
      on('pause', () => (this.paused = true)),
      on('timeupdate', () => (this.position = el.currentTime)),
      on(
        'durationchange',
        () => (this.#elementDuration = Number.isFinite(el.duration) ? el.duration : 0),
      ),
      on('ended', () => (this.hasNext ? this.play(this.index + 1) : (this.position = 0))),
    ]
    const session = 'mediaSession' in navigator ? navigator.mediaSession : null
    session?.setActionHandler('play', () => this.toggle())
    session?.setActionHandler('pause', () => this.toggle())
    session?.setActionHandler('previoustrack', () => this.previous())
    session?.setActionHandler('nexttrack', () => this.next())
    return () => {
      offs.forEach((off) => off())
      this.#el = null
    }
  }

  /** Starts track `i`; the current one toggles instead */
  play = (i: number): void => {
    const el = this.#el
    const track = this.tracks[i]
    if (!el || !track) return
    if (i === this.index) return this.toggle()
    this.index = i
    this.position = 0
    this.#elementDuration = 0
    el.src = shareStreamUrl(track.id)
    void el.play().catch(() => {})
    if ('mediaSession' in navigator) {
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- only resolves an absolute URL
      const artwork = new URL(shareCoverUrl(track.id, true), location.href).href
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [{ src: artwork, sizes: '300x300' }],
      })
    }
  }

  toggle = (): void => {
    const el = this.#el
    if (!el) return
    if (this.index < 0) return this.play(0)
    if (el.paused) void el.play().catch(() => {})
    else el.pause()
  }

  next = () => {
    if (this.hasNext) this.play(this.index + 1)
  }

  /** Apple's rule: a few seconds in, "previous" restarts the track */
  previous = () => {
    if (this.position > 3 || this.index <= 0) this.seek(0)
    else this.play(this.index - 1)
  }

  seek = (seconds: number) => {
    if (!this.#el) return
    this.#el.currentTime = seconds
    this.position = seconds
  }
}
