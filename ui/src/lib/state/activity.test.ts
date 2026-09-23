import { describe, expect, it } from 'vitest'
import { refreshMatches } from './activity.svelte'

describe('refreshMatches', () => {
  it('matches the global wildcard', () => {
    expect(refreshMatches({ '*': '*' }, ['album'])).toBe(true)
  })

  it('matches a wildcard only on a watched resource', () => {
    expect(refreshMatches({ album: ['*'] }, ['album'])).toBe(true)
    expect(refreshMatches({ artist: ['*'] }, ['album'])).toBe(false)
  })

  it('matches when a changed id is loaded', () => {
    expect(refreshMatches({ album: ['a1', 'a2'] }, ['album'], { album: ['a2', 'a3'] })).toBe(true)
    expect(refreshMatches({ album: ['a1'] }, ['album'], { album: ['a3'] })).toBe(false)
  })

  it('treats a watched resource without known loaded ids as affected', () => {
    expect(refreshMatches({ song: ['s1'] }, ['song'])).toBe(true)
  })
})
