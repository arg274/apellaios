// The server stores lyrics as JSON: [{ lang, synced, line: [{ start?: ms, value }] }]

export interface LyricLine {
  /** Milliseconds from the start of the track; undefined for unsynced lyrics */
  start?: number
  value: string
}

export interface Lyrics {
  lang?: string
  synced: boolean
  lines: LyricLine[]
}

interface StructuredLyric {
  lang?: string
  synced?: boolean
  line?: { start?: number; value?: string }[]
}

/** Parses the stored lyrics, preferring a synced set; null when there are none */
export function parseLyrics(raw: string | undefined | null): Lyrics | null {
  if (!raw) return null
  let parsed: StructuredLyric[]
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null
  const pick = parsed.find((l) => l.synced && l.line?.length) ?? parsed.find((l) => l.line?.length)
  if (!pick?.line) return null
  return {
    lang: pick.lang,
    synced: !!pick.synced,
    lines: pick.line.map((l) => ({
      start: pick.synced ? l.start : undefined,
      value: l.value ?? '',
    })),
  }
}

/** Index of the line being sung at `ms`, or -1 before the first line */
export function activeLineIndex(lines: LyricLine[], ms: number): number {
  let lo = 0
  let hi = lines.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if ((lines[mid].start ?? 0) <= ms) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}
