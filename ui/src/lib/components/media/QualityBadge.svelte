<script lang="ts">
  import type { Song } from '$lib/api/types'
  import { isHiRes, isLossless, qualityLabel, type QualityOptions } from '$lib/media'
  import { cn } from '$lib/utils/cn'

  let {
    song,
    options = {},
    class: className,
  }: {
    song: Pick<
      Song,
      | 'suffix'
      | 'bitRate'
      | 'bitDepth'
      | 'sampleRate'
      | 'rgAlbumGain'
      | 'rgAlbumPeak'
      | 'rgTrackGain'
      | 'rgTrackPeak'
    >
    options?: QualityOptions
    class?: string
  } = $props()

  const label = $derived(qualityLabel(song, options))
  const detail = $derived(
    song.bitDepth && song.sampleRate
      ? `${song.bitDepth}-bit / ${(song.sampleRate / 1000).toFixed(1)} kHz`
      : undefined,
  )
</script>

<!-- Apple's title badge: a small rounded plate, highlighted for hi-res lossless -->
<span
  title={detail}
  class={cn(
    'inline-flex h-4 shrink-0 items-center rounded-[4px] px-1.5 font-mono text-[9.5px] leading-none font-semibold tracking-wide whitespace-nowrap',
    isLossless(song.suffix) && isHiRes(song) ? 'bg-accent/15 text-accent' : 'bg-fill text-label-2',
    className,
  )}
>
  {label}
</span>
