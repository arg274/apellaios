import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TranscodeDecision } from '$lib/api/subsonic'
import type { BrowserProfile } from './browserProfile'
import { createDecisionService, decodeJwtExp, type FetchDecision } from './decisionService'

const fakeJwt = (payload: object) =>
  `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify(payload))}.sig`

const profile: BrowserProfile = {
  name: 'NavidromeUI',
  platform: 'test',
  directPlayProfiles: [],
  transcodingProfiles: [],
  codecProfiles: [],
}

const decision = (expiresInMs = 3600_000, transcode = false): TranscodeDecision => ({
  canDirectPlay: !transcode,
  canTranscode: transcode,
  transcodeParams: fakeJwt({ exp: Math.floor((Date.now() + expiresInMs) / 1000) }),
})

describe('decodeJwtExp', () => {
  it('extracts exp from a JWT', () => {
    expect(decodeJwtExp(fakeJwt({ exp: 1700000000 }))).toBe(1700000000)
  })
  it('returns null without an exp claim or for garbage', () => {
    expect(decodeJwtExp(fakeJwt({ sub: 'x' }))).toBeNull()
    expect(decodeJwtExp('not-a-jwt')).toBeNull()
    expect(decodeJwtExp('')).toBeNull()
    expect(decodeJwtExp(null)).toBeNull()
  })
})

describe('decisionService', () => {
  let fetchFn: ReturnType<typeof vi.fn<FetchDecision>>
  let service: ReturnType<typeof createDecisionService>

  beforeEach(() => {
    localStorage.setItem('username', 'u')
    localStorage.setItem('subsonic-token', 't')
    localStorage.setItem('subsonic-salt', 's')
    fetchFn = vi.fn<FetchDecision>().mockImplementation(() => Promise.resolve(decision()))
    service = createDecisionService(fetchFn)
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('returns null without a profile', async () => {
    expect(await service.getDecision('s1')).toBeNull()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('caches decisions until the token is about to expire', async () => {
    vi.useFakeTimers()
    await service.getDecision('s1', profile)
    await service.getDecision('s1', profile)
    expect(fetchFn).toHaveBeenCalledTimes(1)

    // Inside the 60s safety margin the entry counts as stale
    vi.advanceTimersByTime(3600_000 - 30_000)
    await service.getDecision('s1', profile)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('prefetches only uncached songs', async () => {
    service.setProfile(profile)
    await service.getDecision('s1')
    await service.prefetchDecisions(['s1', 's2', 's3'])
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect(service.getCachedDecision('s2')).not.toBeNull()
  })

  it('keeps going when one prefetch fails', async () => {
    service.setProfile(profile)
    fetchFn.mockImplementation((id: string) =>
      id === 'bad' ? Promise.reject(new Error('x')) : Promise.resolve(decision()),
    )
    await service.prefetchDecisions(['bad', 'good'])
    expect(service.getCachedDecision('good')).not.toBeNull()
    expect(service.getCachedDecision('bad')).toBeNull()
  })

  it('resolves a transcode URL when the server provides params', async () => {
    service.setProfile(profile)
    fetchFn.mockResolvedValue(decision(3600_000, true))
    const url = await service.resolveStreamUrl('s1')
    expect(url).toContain('/rest/getTranscodeStream')
    expect(url).toContain('mediaId=s1')
    expect(url).toContain('transcodeParams=')
  })

  it('falls back to a plain stream URL without params', async () => {
    service.setProfile(profile)
    fetchFn.mockResolvedValue({ canDirectPlay: true })
    const url = await service.resolveStreamUrl('s1')
    expect(url).toContain('/rest/stream')
    expect(url).toContain('id=s1')
  })

  it('invalidateAll drops every cached entry', async () => {
    service.setProfile(profile)
    await service.getDecision('s1')
    service.invalidateAll()
    expect(service.getCachedDecision('s1')).toBeNull()
  })
})
