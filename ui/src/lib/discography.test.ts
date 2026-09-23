import { describe, expect, it } from 'vitest'
import type { Album } from '$lib/api/types'
import { discography, shelfOf } from './discography'

const album = (over: Partial<Album>): Album =>
  ({ id: 'x', name: 'x', albumArtistId: 'me', maxYear: 2000, tags: {}, ...over }) as Album

describe('shelfOf', () => {
  it('uses MusicBrainz primary and secondary types', () => {
    expect(shelfOf(album({ tags: { releasetype: ['album'] } }), 'me')).toBe('albums')
    expect(shelfOf(album({ tags: { releasetype: ['ep'] } }), 'me')).toBe('eps')
    expect(shelfOf(album({ tags: { releasetype: ['single'] } }), 'me')).toBe('singles')
    expect(shelfOf(album({ tags: { releasetype: ['album', 'live'] } }), 'me')).toBe('live')
    expect(shelfOf(album({ tags: { releasetype: ['album;compilation'] } }), 'me')).toBe(
      'compilations',
    )
    expect(shelfOf(album({ tags: { releasetype: ['album', 'soundtrack'] } }), 'me')).toBe(
      'soundtracks',
    )
  })

  it('treats untyped albums as albums and other artists’ albums as appearances', () => {
    expect(shelfOf(album({}), 'me')).toBe('albums')
    expect(shelfOf(album({ albumArtistId: 'someone' }), 'me')).toBe('appearsOn')
  })

  it('counts a co-credited album artist as their own release', () => {
    const shared = album({
      albumArtistId: 'duo',
      participants: { albumartist: [{ id: 'me', name: 'Me' }] },
    })
    expect(shelfOf(shared, 'me')).toBe('albums')
  })
})

describe('discography', () => {
  it('orders shelves and sorts newest first', () => {
    const groups = discography(
      [
        album({ id: 'old', originalDate: '1990-01-01' }),
        album({ id: 'ep', tags: { releasetype: ['ep'] } }),
        album({ id: 'new', originalDate: '2020-01-01' }),
        album({ id: 'guest', albumArtistId: 'other' }),
      ],
      'me',
    )
    expect(groups.map((g) => g.kind)).toEqual(['albums', 'eps', 'appearsOn'])
    expect(groups[0].albums.map((a) => a.id)).toEqual(['new', 'old'])
  })
})
