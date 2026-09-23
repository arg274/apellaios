import { describe, expect, it } from 'vitest'
import type { Song } from '$lib/api/types'
import {
  albumYears,
  creditSegments,
  groupByDisc,
  linkDisplayArtist,
  participantsFor,
  qualityLabel,
  releaseTypeLabel,
} from './media'

describe('linkDisplayArtist', () => {
  it('keeps joiners between linked names', () => {
    const segs = linkDisplayArtist('A feat. B & C', [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ])
    expect(segs).toEqual([
      { artist: { id: 'a', name: 'A' } },
      { text: ' feat. ' },
      { artist: { id: 'b', name: 'B' } },
      { text: ' & ' },
      { artist: { id: 'c', name: 'C' } },
    ])
  })

  it('returns null when no participant appears', () => {
    expect(linkDisplayArtist('Someone', [{ id: 'x', name: 'Other' }])).toBeNull()
  })
})

describe('participantsFor', () => {
  it('dedupes by id and merges sub-roles', () => {
    const result = participantsFor(
      {
        performer: [
          { id: 'p', name: 'P', subRole: 'Keyboard' },
          { id: 'p', name: 'P', subRole: 'Synthesizer' },
          { id: 'q', name: 'Q' },
        ],
      },
      'performer',
    )
    expect(result).toEqual([
      { id: 'p', name: 'P', subRole: 'Keyboard', subRoles: ['Keyboard', 'Synthesizer'] },
      { id: 'q', name: 'Q', subRoles: [] },
    ])
  })
})

describe('creditSegments', () => {
  it('falls back to the plain name and id without participants', () => {
    expect(creditSegments({ artist: 'Solo', artistId: 's1' }, 'artist')).toEqual([
      { artist: { id: 's1', name: 'Solo' } },
    ])
  })
})

describe('albumYears', () => {
  it('shows a single year', () => {
    expect(
      albumYears({
        minOriginalYear: 2011,
        maxOriginalYear: 2011,
        maxYear: 2011,
        minYear: 2011,
        releaseDate: '2011-05-01',
      }),
    ).toBe('2011')
  })
  it('marks reissues', () => {
    expect(
      albumYears({
        minOriginalYear: 1967,
        maxOriginalYear: 1967,
        maxYear: 2009,
        minYear: 2009,
        releaseDate: '2009',
      }),
    ).toBe('♫ 1967 · ○ 2009')
  })
  it('hides unknown years', () => {
    expect(albumYears({ minOriginalYear: 0, maxOriginalYear: 0, maxYear: 0, minYear: 0 })).toBe('')
  })
})

describe('qualityLabel', () => {
  const song = { suffix: 'mp3', bitRate: 320 } as Song
  it('adds bitrate for lossy formats only', () => {
    expect(qualityLabel(song)).toBe('MP3 320')
    expect(qualityLabel({ ...song, suffix: 'flac', bitRate: 900 })).toBe('FLAC')
  })
  it('shows the transcode target', () => {
    expect(
      qualityLabel(
        { ...song, suffix: 'flac' },
        { transcode: { codec: 'opus', audioBitrate: 128000 } },
      ),
    ).toBe('FLAC → OPUS 128')
  })
})

describe('groupByDisc', () => {
  it('groups consecutive tracks by disc', () => {
    const groups = groupByDisc([
      { discNumber: 1 },
      { discNumber: 1 },
      { discNumber: 2, discSubtitle: 'Live' },
    ] as Song[])
    expect(groups.map((g) => [g.disc, g.subtitle, g.songs.length])).toEqual([
      [1, undefined, 2],
      [2, 'Live', 1],
    ])
  })
})

describe('releaseTypeLabel', () => {
  it('formats MusicBrainz release types', () => {
    expect(releaseTypeLabel('ep')).toBe('EP')
    expect(releaseTypeLabel('single')).toBe('Single')
    expect(releaseTypeLabel('album;compilation')).toBe('Album · Compilation')
    expect(releaseTypeLabel(undefined)).toBe('')
  })
})
