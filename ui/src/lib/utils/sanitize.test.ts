import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('removes scripts, event handlers and javascript: links', () => {
    const out = sanitizeHtml(
      '<p onclick="steal()">Bio</p><script>steal()</script><img src=x onerror="steal()"><a href="javascript:steal()">x</a>',
    )
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i)
    expect(out).toContain('<p>Bio</p>')
  })

  it('keeps new-tab links but cuts them off from this window', () => {
    const out = sanitizeHtml('<a href="https://www.last.fm/music/X" target="_blank">Read more</a>')
    expect(out).toContain('href="https://www.last.fm/music/X"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('leaves same-tab links alone', () => {
    expect(sanitizeHtml('<a href="https://example.com">x</a>')).not.toContain('rel=')
  })
})
