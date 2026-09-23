<script lang="ts" module>
  import { autoFillColumns } from '$lib/utils/grid'

  /**
   * The columns this grid shows at `width` px, for lists that page by whole rows. Mirrors the
   * classes below: 150px tracks, 170px from the sm breakpoint, 20px gutters.
   */
  export const albumGridColumns = (width: number) =>
    autoFillColumns(width, matchMedia('(min-width: 40rem)').matches ? 170 : 150, 20)
</script>

<script lang="ts">
  import type { Album } from '$lib/api/types'
  import { cn } from '$lib/utils/cn'
  import AlbumCard from './AlbumCard.svelte'

  let {
    albums,
    subtitle = 'artist',
    loading = false,
    class: className,
  }: {
    albums: Album[]
    subtitle?: 'artist' | 'year' | 'both'
    loading?: boolean
    class?: string
  } = $props()
</script>

<!-- Apple's shelf grid: fluid columns with 20px gutters and 24px rows -->
<div
  class={cn(
    'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-6 transition-opacity sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]',
    loading && 'opacity-60',
    className,
  )}
>
  {#each albums as album, i (album.id)}
    <AlbumCard {album} {subtitle} eager={i < 12} />
  {/each}
</div>
