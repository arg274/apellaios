import { describe, expect, it } from 'vitest'
import { isLastFmURL } from './urls'

describe('isLastFmURL', () => {
  it('accepts Last.fm music URLs', () => {
    expect(isLastFmURL('https://last.fm/music/The+Beatles')).toBe(true)
    expect(isLastFmURL('http://last.fm/music/Radiohead')).toBe(true)
    expect(isLastFmURL('https://www.last.fm/music/Daft+Punk')).toBe(true)
  })

  it('rejects non-http(s) protocols', () => {
    expect(isLastFmURL('javascript:alert(1)//last.fm/music/')).toBe(false)
    expect(isLastFmURL('data:text/html,<script>//last.fm/music/')).toBe(false)
  })

  it('rejects other domains, paths and garbage', () => {
    expect(isLastFmURL('https://example.com/?q=last.fm/music/')).toBe(false)
    expect(isLastFmURL('https://fake-last.fm/music/Artist')).toBe(false)
    expect(isLastFmURL('https://last.fm/user/someone')).toBe(false)
    expect(isLastFmURL(null)).toBe(false)
    expect(isLastFmURL('not-a-url')).toBe(false)
  })
})
