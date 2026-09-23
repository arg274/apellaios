import { describe, expect, it } from 'vitest'
import { externalUrl, isLastFmURL } from './urls'

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

describe('externalUrl', () => {
  it('passes web links through unchanged', () => {
    expect(externalUrl('https://somafm.com/groovesalad/')).toBe('https://somafm.com/groovesalad/')
    expect(externalUrl('http://example.com')).toBe('http://example.com')
  })

  it('drops anything that is not http(s)', () => {
    expect(externalUrl('javascript:alert(1)')).toBeUndefined()
    expect(externalUrl(' JAVASCRIPT:alert(1)')).toBeUndefined()
    expect(externalUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined()
    expect(externalUrl('ftp://files.example.com')).toBeUndefined()
    expect(externalUrl('not a url')).toBeUndefined()
    expect(externalUrl('')).toBeUndefined()
    expect(externalUrl(undefined)).toBeUndefined()
  })
})
