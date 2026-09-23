// A few albums to show on each genre tile of the browse page. Tiles ask as they scroll into view,
// so this caps concurrent requests (a fast scroll would otherwise fire dozens at once) and keeps
// each genre's answer for the session.
import { getList } from '$lib/api/rest'
import type { Album } from '$lib/api/types'

/** A few spares, so albums that turn out to have no art can be skipped */
const CANDIDATES_PER_GENRE = 6
const MAX_IN_FLIGHT = 4

const cache = new Map<string, Promise<Album[]>>()
const waiting: (() => void)[] = []
let inFlight = 0

function limited<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      inFlight++
      task()
        .then(resolve, reject)
        .finally(() => {
          inFlight--
          waiting.shift()?.()
        })
    }
    if (inFlight < MAX_IN_FLIGHT) run()
    else waiting.push(run)
  })
}

/**
 * The genre's most played albums, a few more than a tile shows. A stable pick (rather than
 * random) keeps tiles from reshuffling between visits and lets the browser reuse cached covers.
 */
export function genreCovers(genreId: string): Promise<Album[]> {
  let hit = cache.get(genreId)
  if (!hit) {
    hit = limited(() =>
      getList('album', {
        filter: { genre_id: genreId },
        sort: 'play_count',
        order: 'DESC',
        perPage: CANDIDATES_PER_GENRE,
      }).then((r) => r.data),
    )
    // A failure shouldn't stick: the tile falls back to its plain gradient and may retry later
    hit.catch(() => cache.delete(genreId))
    cache.set(genreId, hit)
  }
  return hit
}
