<script lang="ts">
  import { artistMenu } from '$lib/actions.svelte'
  import type { Artist } from '$lib/api/types'
  import { dragMusic } from '$lib/dnd'
  import { href } from '$lib/nav.svelte'
  import ContextMenuArea from '$lib/components/ui/menu/ContextMenuArea.svelte'
  import Artwork from './Artwork.svelte'

  let {
    artist,
    subtitle,
    size = 170,
    eager = false,
  }: {
    artist: Pick<Artist, 'id' | 'name'> & Partial<Artist>
    subtitle?: string
    size?: number
    eager?: boolean
  } = $props()

  let starred = $state<boolean | undefined>(undefined)
</script>

<!-- Apple's artist lockup: a circular portrait with the name centred beneath -->
<ContextMenuArea
  items={() =>
    artistMenu(artist as Artist, {
      starred: starred ?? artist.starred,
      onStar: (v) => (starred = v),
    })}
>
  {#snippet children(props)}
    <a
      {...props}
      href={href(`/artist/${artist.id}/show`)}
      draggable="true"
      ondragstart={dragMusic({ artistIds: [artist.id], label: artist.name })}
      class="group flex min-w-0 flex-col items-center gap-2 text-center"
    >
      <div
        class="w-full transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-[1.03]"
      >
        <Artwork kind="artist" record={artist as Artist} {size} {eager} round alt="" />
      </div>
      <div class="w-full min-w-0">
        <div class="truncate text-body text-label">{artist.name}</div>
        {#if subtitle}
          <div class="truncate text-callout text-label-2">{subtitle}</div>
        {/if}
      </div>
    </a>
  {/snippet}
</ContextMenuArea>
