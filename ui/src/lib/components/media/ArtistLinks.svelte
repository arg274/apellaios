<script lang="ts">
  import type { Participants, Role } from '$lib/api/types'
  import { creditSegments, participantsFor } from '$lib/media'
  import { href } from '$lib/nav.svelte'
  import { cn } from '$lib/utils/cn'

  let {
    record,
    role = 'artist',
    limit = Infinity,
    class: className,
    linkClass = 'hover:underline',
  }: {
    record: {
      participants?: Participants
      artist?: string
      artistId?: string
      albumArtist?: string
      albumArtistId?: string
    }
    /** artist/albumartist use the display credit; other roles list participants */
    role?: Role
    limit?: number
    class?: string
    linkClass?: string
  } = $props()

  const segments = $derived.by(() => {
    if (role === 'artist' || role === 'albumartist') return creditSegments(record, role)
    return participantsFor(record.participants, role, limit).flatMap((artist, i) =>
      i ? [{ text: ', ' }, { artist }] : [{ artist }],
    )
  })
</script>

<span class={cn('min-w-0', className)}>
  {#each segments as seg, i (i)}
    {#if 'artist' in seg}
      <!-- No stopPropagation here: SvelteKit routes link clicks from a document listener, and a
           link it never sees is followed natively, which its hash router answers with a full page
           reload. Clickable rows ignore clicks that land on links instead. -->
      <a href={href(`/artist/${seg.artist.id}/show`)} class={linkClass}>
        {seg.artist.name}{#if seg.artist.subRoles?.length}<span class="text-label-3">
            ({seg.artist.subRoles.join(', ')})</span
          >{/if}
      </a>
    {:else}
      {seg.text}
    {/if}
  {/each}
</span>
