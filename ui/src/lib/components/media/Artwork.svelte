<script lang="ts">
  import { Disc3, ListMusic, Mic2, Music, Radio } from '@lucide/svelte'
  import { coverArtUrl, discCoverArtUrl, type ArtKind, type ArtRef } from '$lib/api/subsonic'
  import { cn } from '$lib/utils/cn'
  import { sizeBucket, thumbhashDataUrl } from './thumbhashUrl'

  let {
    kind,
    record,
    size = 300,
    square = true,
    disc,
    alt = '',
    eager = false,
    round = false,
    class: className,
  }: {
    kind: ArtKind
    record: ArtRef | null | undefined
    /** Displayed size in CSS px; the request is scaled for the device pixel ratio */
    size?: number
    square?: boolean
    /** Disc artwork: the album id comes from `record` */
    disc?: number
    alt?: string
    eager?: boolean
    /** Circular crop (artists) */
    round?: boolean
    class?: string
  } = $props()

  const src = $derived.by(() => {
    if (!record || record.imageAbsent) return undefined
    const px = sizeBucket(size)
    return disc !== undefined
      ? discCoverArtUrl(record.id, disc, record.updatedAt, px)
      : coverArtUrl(kind, record, px, square)
  })
  const placeholder = $derived(thumbhashDataUrl(record?.thumbHash))
  const fallbackIcons = {
    album: Disc3,
    song: Music,
    playlist: ListMusic,
    radio: Radio,
    artist: Mic2,
  }
  const FallbackIcon = $derived(fallbackIcons[kind])

  // Keyed on the URL, so a component reused for another record starts over by itself
  let loadedSrc = $state<string>()
  let failedSrc = $state<string>()
  const loaded = $derived(!!src && loadedSrc === src)
  const failed = $derived(!!src && failedSrc === src)
</script>

<div
  class={cn(
    'artwork-frame aspect-square w-full',
    round ? 'rounded-full' : 'rounded-art',
    className,
  )}
  style:--art-bg={record?.dominantColor}
>
  {#if placeholder && !loaded}
    <img
      src={placeholder}
      alt=""
      aria-hidden="true"
      class="absolute inset-0 size-full scale-110 object-cover blur-md"
    />
  {/if}
  {#if src && !failed}
    <img
      {src}
      {alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable="false"
      class={cn(
        'absolute inset-0 size-full object-cover transition-opacity duration-300',
        loaded ? 'opacity-100' : 'opacity-0',
      )}
      onload={() => (loadedSrc = src)}
      onerror={() => (failedSrc = src)}
    />
  {/if}
  {#if (!src || failed) && !placeholder}
    <div
      class="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-fill to-fill-2 text-label-3"
    >
      <FallbackIcon class="size-1/3" strokeWidth={1.25} />
    </div>
  {/if}
</div>
