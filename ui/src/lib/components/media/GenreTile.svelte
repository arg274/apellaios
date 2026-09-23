<script lang="ts">
  // A browse tile for one genre: its gradient and a small fan of the genre's album covers. The
  // albums are only fetched once the tile nears the viewport, and the covers are only in the page
  // while it stays near: scrolled well away, their images are dropped so a long genre list holds
  // no more covers than are on screen. Coming back they return from the HTTP cache.
  import type { Album } from '$lib/api/types'
  import { nearView } from '$lib/attachments/inView'
  import { genreCovers } from '$lib/genreCovers'
  import { href } from '$lib/nav.svelte'
  import { cn } from '$lib/utils/cn'
  import Artwork from './Artwork.svelte'

  let { id, name, hue }: { id: string; name: string; hue: number } = $props()

  const FAN_SIZE = 3

  // Albums already known to have no art are dropped up front; the rest are tried in order, and
  // one whose image turns out to be the server's placeholder is swapped for the next
  let candidates = $state<Album[]>([])
  let verdict = $state<Record<string, 'art' | 'placeholder'>>({})
  const fanned = $derived(
    candidates.filter((a) => verdict[a.id] !== 'placeholder').slice(0, FAN_SIZE),
  )

  let near = $state(false)
  let requested = false
  // Back to front, so the first (most played) album paints last and sits on top; none while away
  const shown = $derived(near ? fanned.map((album, i) => ({ album, i })).reverse() : [])

  const onNear = (value: boolean) => {
    near = value
    if (!value || requested) return
    requested = true
    genreCovers(id)
      .then((albums) => (candidates = albums.filter((a) => !a.imageAbsent)))
      .catch(() => {})
  }

  // Front to back: the most played album on top. Hovering spreads the fan a little.
  const fan = [
    'right-[4%] -bottom-[10%] rotate-[8deg] group-hover:translate-x-[6%] group-hover:rotate-[12deg]',
    'right-[20%] -bottom-[6%] -rotate-[4deg] group-hover:-translate-x-[10%] group-hover:-rotate-[7deg]',
    'right-[36%] -bottom-[2%] -rotate-[14deg] group-hover:-translate-x-[22%] group-hover:-rotate-[19deg]',
  ]
</script>

<a
  {@attach nearView(onNear, '200px')}
  href={href('/album/all', { filter: JSON.stringify({ genre_id: id }) })}
  class="group relative isolate flex aspect-[16/10] overflow-hidden rounded-xl bg-linear-135 from-[oklch(0.55_0.15_var(--hue))] to-[oklch(0.38_0.12_calc(var(--hue)+40))] p-3 shadow-sm"
  style:--hue={hue}
>
  <span
    class="relative z-10 line-clamp-2 max-w-[60%] text-title-3 font-bold text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.35)]"
  >
    {name}
  </span>

  {#each shown as { album, i } (album.id)}
    <div
      class={cn(
        'absolute aspect-square w-[44%] overflow-hidden rounded-md shadow-[0_4px_14px_rgb(0_0_0/0.35)] transition-[rotate,translate,opacity] duration-300 ease-apple',
        fan[i],
        // Hidden until the image proves to be real art, so a placeholder never flashes up
        verdict[album.id] === 'art' ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden="true"
    >
      <!-- Not square: the server pads square requests into lossless PNGs (~30 KB); a cropped
           JPEG is ~5 KB and the tilt hides the crop -->
      <Artwork
        kind="album"
        record={album}
        size={96}
        square={false}
        class="rounded-none"
        onloaded={({ placeholder }) => (verdict[album.id] = placeholder ? 'placeholder' : 'art')}
      />
    </div>
  {/each}

  <!-- Hover dims the tile like the album and artist cards; the name (z-10) stays above it -->
  <span
    class="pointer-events-none absolute inset-0 transition-colors duration-200 group-hover:bg-black/25"
  ></span>
</a>
