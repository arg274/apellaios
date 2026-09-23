<script lang="ts">
  import { Play } from '@lucide/svelte'
  import { radioMenu } from '$lib/actions.svelte'
  import type { Radio } from '$lib/api/types'
  import { t } from '$lib/i18n/index.svelte'
  import { player } from '$lib/player/player.svelte'
  import { externalUrl } from '$lib/utils/urls'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import ContextMenuArea from '$lib/components/ui/menu/ContextMenuArea.svelte'
  import Artwork from './Artwork.svelte'
  import PlayingBars from './PlayingBars.svelte'

  let {
    radio,
    size = 190,
    eager = false,
  }: { radio: Radio; size?: number; eager?: boolean } = $props()
  let menuOpen = $state(false)

  const host = $derived.by(() => {
    try {
      return new URL(radio.homePageUrl || radio.streamUrl).host.replace(/^www\./, '')
    } catch {
      return ''
    }
  })
  // Only web links become clickable; anything else shows as plain text
  const homePage = $derived(externalUrl(radio.homePageUrl))
  const current = $derived(player.current?.kind === 'radio' && player.current.radio.id === radio.id)
</script>

<!-- A station has no page of its own: the artwork starts it, like Apple Music's radio tiles -->
<ContextMenuArea items={() => radioMenu(radio)}>
  {#snippet children(props)}
    <div {...props} class="group min-w-0">
      <div class="relative">
        <button
          type="button"
          class="block w-full shadow-[0_3px_10px_rgb(0_0_0/0.15)]"
          aria-label="{t('resources.radio.actions.playNow')}: {radio.name}"
          onclick={() => (current ? player.togglePlay() : player.playRadio(radio))}
        >
          <!-- Stations only have art once an image was uploaded; the server has no fallback -->
          <Artwork kind="radio" record={radio.uploadedImage ? radio : null} {size} {eager} />
          <span
            class="absolute inset-0 rounded-art transition-colors duration-200 group-hover:bg-black/25 {menuOpen
              ? 'bg-black/25'
              : ''}"
          ></span>
          <span
            class="absolute bottom-2.5 left-2.5 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 {current
              ? 'opacity-100'
              : 'scale-90 opacity-0'}"
          >
            {#if current}
              <PlayingBars playing={!player.paused} class="text-white" />
            {:else}
              <Play class="size-4" fill="currentColor" />
            {/if}
          </span>
        </button>
        <div
          class="absolute right-2.5 bottom-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 {menuOpen
            ? 'opacity-100'
            : ''}"
        >
          <ActionMenu
            items={() => radioMenu(radio)}
            bind:open={menuOpen}
            triggerClass="size-8 bg-black/40 text-white backdrop-blur-md hover:bg-black/60 hover:text-white"
          />
        </div>
      </div>
      <div class="mt-1.5 min-w-0 pr-1">
        <div class="line-clamp-2 text-body text-label">{radio.name}</div>
        {#if host}
          {#if homePage}
            <a
              href={homePage}
              target="_blank"
              rel="noopener noreferrer"
              class="block truncate text-body text-label-2 hover:underline">{host}</a
            >
          {:else}
            <div class="truncate text-body text-label-2">{host}</div>
          {/if}
        {/if}
      </div>
    </div>
  {/snippet}
</ContextMenuArea>
