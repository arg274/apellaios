<script lang="ts">
  // Scaffolding for create/edit screens: title, grouped fields, and a sticky save bar with
  // cancel/delete. Saving and deleting are async; errors surface as toasts.
  import { ChevronLeft } from '@lucide/svelte'
  import type { Snippet } from 'svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { navigate } from '$lib/nav.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import PageTitle from '$lib/components/layout/PageTitle.svelte'
  import Button from './Button.svelte'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import Spinner from './Spinner.svelte'

  let {
    title,
    backHref,
    loading = false,
    dirty = true,
    onsave,
    ondelete,
    deleteTitle = t('ra.action.delete'),
    deleteMessage = t('ra.message.are_you_sure'),
    saveLabel = t('ra.action.save'),
    stayAfterSave = false,
    children,
    aside,
  }: {
    title: string
    /** Where Cancel and the back chevron go */
    backHref: string
    loading?: boolean
    /** Disables Save until something changed */
    dirty?: boolean
    /** Return false to stay on the page (e.g. validation failed) */
    onsave: () => Promise<boolean | void>
    ondelete?: () => Promise<void>
    deleteTitle?: string
    deleteMessage?: string
    saveLabel?: string
    /** Keep the page open after saving (settings-style screens) instead of going back */
    stayAfterSave?: boolean
    children: Snippet
    /** Optional side column (artwork, stats...) */
    aside?: Snippet
  } = $props()

  let saving = $state(false)
  let confirmDelete = $state(false)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    saving = true
    try {
      const result = await onsave()
      if (result !== false) {
        toast.success(t('ra.notification.updated', { smart_count: 1 }))
        if (!stayAfterSave) void navigate(backHref)
      }
    } catch (err) {
      toast.error((err as Error).message || t('ra.notification.http_error'))
    } finally {
      saving = false
    }
  }

  async function remove() {
    try {
      await ondelete?.()
      toast.success(t('ra.notification.deleted', { smart_count: 1 }))
      void navigate(backHref)
    } catch (err) {
      toast.error((err as Error).message || t('ra.notification.http_error'))
    }
  }
</script>

<PageTitle {title} />

<a
  href={backHref}
  class="mb-2 inline-flex items-center gap-0.5 text-body text-accent hover:opacity-80"
>
  <ChevronLeft class="size-4" />{t('ra.action.back')}
</a>
<h1 class="mb-6 text-[28px] leading-tight font-bold text-label">{title}</h1>

{#if loading}
  <div class="flex justify-center py-20"><Spinner class="size-7" /></div>
{:else}
  <form onsubmit={submit} class="flex flex-col gap-8 lg:flex-row lg:items-start" novalidate>
    <div class="flex max-w-2xl min-w-0 flex-1 flex-col gap-5">
      {@render children()}

      <div class="sticky bottom-24 z-10 mt-2 flex items-center gap-2">
        <div class="glass flex w-full items-center gap-2 rounded-full p-1.5">
          <Button type="submit" disabled={saving || !dirty}>
            {#if saving}<Spinner class="size-4 text-on-accent" />{/if}
            {saveLabel}
          </Button>
          <Button variant="ghost" href={backHref}>{t('ra.action.cancel')}</Button>
          {#if ondelete}
            <Button
              variant="ghost"
              class="ml-auto text-danger"
              onclick={() => (confirmDelete = true)}
            >
              {t('ra.action.delete')}
            </Button>
          {/if}
        </div>
      </div>
    </div>
    {#if aside}
      <aside class="w-full shrink-0 lg:w-72">{@render aside()}</aside>
    {/if}
  </form>
{/if}

{#if ondelete}
  <ConfirmDialog
    bind:open={confirmDelete}
    title={deleteTitle}
    message={deleteMessage}
    danger
    confirmLabel={t('ra.action.delete')}
    onConfirm={remove}
  />
{/if}
