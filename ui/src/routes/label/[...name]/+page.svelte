<script lang="ts">
  // A record label, laid out like Apple Music's label pages without the hero image (Navidrome has
  // no label artwork): every release, then the latest ones.
  import { Building2, Ellipsis } from '@lucide/svelte'
  import { page } from '$app/state'
  import { labelMenu } from '$lib/actions.svelte'
  import { getAll } from '$lib/api/rest'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { byLatest, byName, findLabel } from '$lib/labels'
  import { href } from '$lib/nav.svelte'
  import PageTitle from '$lib/components/layout/PageTitle.svelte'
  import AlbumCard from '$lib/components/media/AlbumCard.svelte'
  import Shelf from '$lib/components/media/Shelf.svelte'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import { iconButtonVariants } from '$lib/components/ui/IconButton.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const name = $derived(page.params.name ?? '')

  const label = new Loader(
    () => name || null,
    (n) => findLabel(n),
  )
  // Only trust a result for the name on screen (the loader may still hold the previous label's)
  const tag = $derived(
    label.value && label.value.tagValue.trim().toLowerCase() === name.trim().toLowerCase()
      ? label.value
      : undefined,
  )
  const albums = new Loader(
    () => tag?.id ?? null,
    (id, signal) => getAll('album', { filter: { recordlabel: id }, signal }),
  )
  const all = $derived(tag && albums.value ? albums.value : [])

  const everything = $derived(byName(all))
  const latest = $derived(byLatest(all).slice(0, 12))

  // Two rows like Apple's first shelf; a small label fits in one
  const rows = $derived(all.length >= 12 ? 2 : 1)
  const columns = $derived(
    Array.from({ length: Math.ceil(everything.length / rows) }, (_, i) =>
      everything.slice(i * rows, i * rows + rows),
    ),
  )

  const seeAll = $derived(
    tag ? href('/album/all', { filter: JSON.stringify({ recordlabel: tag.id }) }) : undefined,
  )
</script>

<PageTitle title={tag?.tagValue ?? name} />

{#if label.loading && !tag}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if !tag}
  <EmptyState
    icon={Building2}
    title={t('ui.labelPage.notFound', { name })}
    message={t('ui.labelPage.notFoundHint')}
  />
{:else}
  <!-- Apple's header without the hero: 34/40 bold name, the "..." button level with it -->
  <header class="flex min-h-10 items-center justify-between gap-4">
    <h1 class="min-w-0 truncate text-[34px] leading-10 font-bold text-label">{tag.tagValue}</h1>
    <ActionMenu items={() => labelMenu(tag.id)}>
      {#snippet trigger(props)}
        <button
          {...props}
          aria-label={t('ui.more')}
          class={iconButtonVariants({ variant: 'filled', size: 'md', class: 'text-accent' })}
        >
          <Ellipsis />
        </button>
      {/snippet}
    </ActionMenu>
  </header>

  {#if albums.loading && !all.length}
    <div class="flex justify-center py-16"><Spinner /></div>
  {:else}
    <Shelf class="pt-3" title={t('ui.labelPage.allReleases')} href={seeAll}>
      {#each columns as column (column[0].id)}
        <div class="flex w-[190px] flex-col gap-6">
          {#each column as album (album.id)}
            <AlbumCard {album} size={190} />
          {/each}
        </div>
      {/each}
    </Shelf>

    {#if all.length > 1}
      <Shelf class="pt-9" title={t('ui.labelPage.latestReleases')} href={seeAll}>
        {#each latest as album (album.id)}
          <div class="w-[190px]"><AlbumCard {album} subtitle="both" size={190} /></div>
        {/each}
      </Shelf>
    {/if}
  {/if}
{/if}
