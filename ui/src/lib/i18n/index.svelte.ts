import Polyglot from 'node-polyglot'
import { rebrand } from '$lib/brand'
import config from '$lib/config'
import { http } from '$lib/api/http'
import { REST_URL } from '$lib/api/rest'
import type { Translation } from '$lib/api/types'
import en from './en.json'

type Messages = Record<string, unknown>

const LOCALE_KEY = 'locale'
const CACHE_KEY = 'translation'

const isObject = (v: unknown): v is Messages =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

/** Drops empty strings so untranslated keys fall through to English */
const pruneEmpty = (obj: Messages): Messages => {
  const out: Messages = {}
  for (const [k, v] of Object.entries(obj)) {
    if (isObject(v)) out[k] = pruneEmpty(v)
    else if (v) out[k] = v
  }
  return out
}

/** Applies the display brand to every string (the translation files say Navidrome) */
const rebrandAll = (obj: Messages): Messages => {
  const out: Messages = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = isObject(v) ? rebrandAll(v) : typeof v === 'string' ? rebrand(v) : v
  }
  return out
}

const deepMerge = (base: Messages, over: Messages): Messages => {
  const out: Messages = { ...base }
  for (const [k, v] of Object.entries(over)) {
    out[k] = isObject(v) && isObject(base[k]) ? deepMerge(base[k] as Messages, v) : v
  }
  return out
}

const prepare = (lang: Messages): Messages => {
  const merged = rebrandAll(deepMerge(en as Messages, pruneEmpty(lang)))
  const resources = merged.resources as Messages
  // Album tracks and playlist tracks are songs as far as labels go
  resources.albumSong = resources.song
  resources.playlistTrack = resources.song
  ;((merged.ra as Messages).boolean as Messages).null = ''
  return merged
}

const readCache = (): Translation | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Translation) : null
  } catch {
    return null
  }
}

const makePolyglot = (locale: string, phrases: Messages) =>
  new Polyglot({
    locale,
    phrases,
    allowMissing: true,
    // react-admin's convention, which the translation files use: %{name}
    interpolation: { prefix: '%{', suffix: '}' },
    onMissingKey: (key: string) => key,
  })

export interface Language {
  id: string
  name: string
}

class I18n {
  locale = $state('en')
  #polyglot = $state.raw(makePolyglot('en', prepare(en as Messages)))

  constructor() {
    // Start from the cached translation so the first paint is already in the user's language
    const wanted = this.#stored()
    const cached = readCache()
    if (wanted !== 'en' && cached?.id === wanted) {
      try {
        this.#apply(wanted, JSON.parse(cached.data))
      } catch {
        // Corrupt cache: stay on English until init() fetches a fresh copy
      }
    }
  }

  #stored(): string {
    try {
      return localStorage.getItem(LOCALE_KEY) || 'en'
    } catch {
      return 'en'
    }
  }

  #apply(locale: string, messages: Messages) {
    this.#polyglot = makePolyglot(locale, prepare(messages))
    this.locale = locale
    document.documentElement.lang = locale
  }

  /** Translate a key. Reads rune state, so templates re-render when the language changes. */
  t = (key: string, options?: Polyglot.InterpolationOptions | number): string =>
    this.#polyglot.t(key, options as Polyglot.InterpolationOptions)

  has = (key: string): boolean => this.#polyglot.has(key)

  /** Refreshes the stored language from the server, honouring the server default on first run */
  async init() {
    let locale = this.#stored()
    const hasChoice = (() => {
      try {
        return localStorage.getItem(LOCALE_KEY) !== null
      } catch {
        return false
      }
    })()
    if (!hasChoice && config.defaultLanguage) locale = config.defaultLanguage
    if (locale === 'en') return
    try {
      await this.setLocale(locale)
    } catch (e) {
      console.error(`Cannot load language "${locale}"`, e)
    }
  }

  async setLocale(locale: string) {
    if (locale === 'en') {
      this.#apply('en', en as Messages)
    } else {
      const { json } = await http<Translation>(`${REST_URL}/translation/${locale}`)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(json))
      } catch {
        // Cache is only an optimisation
      }
      this.#apply(locale, JSON.parse(json.data))
    }
    try {
      localStorage.setItem(LOCALE_KEY, locale)
    } catch {
      // ignore
    }
  }

  async languages(): Promise<Language[]> {
    const { json } = await http<Translation[]>(`${REST_URL}/translation?_sort=name&_order=ASC`)
    return (json ?? [])
      .map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}

export const i18n = new I18n()

/** Shorthand for i18n.t, safe to destructure because it's an arrow property */
export const t = i18n.t

/** Label for a resource field, e.g. field('album', 'songCount') */
export const field = (resource: string, name: string): string =>
  t(`resources.${resource}.fields.${name}`)

/** Localised resource name; count picks the plural form */
export const resourceName = (resource: string, count = 2): string =>
  t(`resources.${resource}.name`, { smart_count: count })
