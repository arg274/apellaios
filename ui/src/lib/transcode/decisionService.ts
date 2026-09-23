import { jwtDecode } from 'jwt-decode'
import { streamUrl, transcodeStreamUrl, type TranscodeDecision } from '$lib/api/subsonic'
import type { BrowserProfile } from './browserProfile'

/**
 * Reads the exp claim of the transcode token. The token is meant to be opaque, but the UI ships
 * with the server, so peeking lets us refresh decisions before they go stale mid-queue rather
 * than waiting for a stream request to fail.
 */
export function decodeJwtExp(token: string | null | undefined): number | null {
  try {
    if (!token) return null
    const payload = jwtDecode<{ exp?: unknown }>(token)
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

export type FetchDecision = (songId: string, profile: BrowserProfile) => Promise<TranscodeDecision>

export function createDecisionService(fetchFn: FetchDecision) {
  const cache = new Map<string, TranscodeDecision>()
  let currentProfile: BrowserProfile | null = null

  // 60s of slack so a token never expires between resolving the URL and the request landing
  const isFresh = (decision: TranscodeDecision) => {
    const exp = decodeJwtExp(decision.transcodeParams)
    return exp != null && Date.now() < (exp - 60) * 1000
  }

  const cached = (songId: string) => {
    const entry = cache.get(songId)
    return entry && isFresh(entry) ? entry : null
  }

  async function getDecision(songId: string, profile = currentProfile) {
    if (!profile) return null
    const hit = cached(songId)
    if (hit) return hit
    const decision = await fetchFn(songId, profile)
    cache.set(songId, decision)
    return decision
  }

  async function prefetchDecisions(songIds: string[], profile = currentProfile) {
    if (!profile) return
    const missing = songIds.filter((id) => !cached(id))
    await Promise.allSettled(
      missing.map(async (id) => {
        cache.set(id, await fetchFn(id, profile))
      }),
    )
  }

  /** The URL to stream a song from: transcoded when the server decided so, raw otherwise */
  async function resolveStreamUrl(songId: string) {
    const decision = await getDecision(songId)
    if (!decision?.transcodeParams) return streamUrl(songId)
    return transcodeStreamUrl(songId, decision.transcodeParams)
  }

  return {
    getDecision,
    getCachedDecision: cached,
    prefetchDecisions,
    resolveStreamUrl,
    invalidateAll: () => cache.clear(),
    setProfile: (profile: BrowserProfile | null) => {
      currentProfile = profile
    },
    getProfile: () => currentProfile,
  }
}

export type DecisionService = ReturnType<typeof createDecisionService>
