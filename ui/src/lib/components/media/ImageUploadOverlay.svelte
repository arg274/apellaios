<script lang="ts">
  import { ImageUp, Trash2 } from '@lucide/svelte'
  import config from '$lib/config'
  import { deleteImage, uploadImage, type ImageEntity } from '$lib/api/native'
  import { session } from '$lib/api/session'
  import { t } from '$lib/i18n/index.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { cn } from '$lib/utils/cn'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  let {
    entity,
    id,
    hasUploadedImage = false,
    canEdit = true,
    class: className,
    onchange,
  }: {
    entity: ImageEntity
    id: string
    hasUploadedImage?: boolean
    /** Extra permission gate (e.g. playlist ownership) */
    canEdit?: boolean
    class?: string
    onchange?: () => void
  } = $props()

  const allowed = $derived(canEdit && (config.enableArtworkUpload || session.isAdmin))
  let input = $state<HTMLInputElement | null>(null)
  let busy = $state(false)

  async function run(action: () => Promise<unknown>, ok: string, fail: string) {
    busy = true
    try {
      await action()
      toast.success(t(ok))
      onchange?.()
    } catch {
      toast.error(t(fail))
    } finally {
      busy = false
    }
  }

  function upload(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    void run(
      () => uploadImage(entity, id, file),
      'message.coverUploaded',
      'message.coverUploadError',
    )
    ;(e.currentTarget as HTMLInputElement).value = ''
  }
</script>

{#if allowed}
  <div
    class={cn(
      'absolute inset-0 flex items-end justify-center gap-2 rounded-[inherit] bg-gradient-to-t from-black/60 to-transparent to-50% p-3 opacity-0 transition-opacity group-hover/art:opacity-100 focus-within:opacity-100',
      busy && 'opacity-100',
      className,
    )}
  >
    {#if busy}
      <Spinner class="text-white" />
    {:else}
      <button
        type="button"
        title={t('message.uploadCover')}
        aria-label={t('message.uploadCover')}
        class="glass flex size-9 items-center justify-center rounded-full text-white"
        onclick={() => input?.click()}
      >
        <ImageUp class="size-4" />
      </button>
      {#if hasUploadedImage}
        <button
          type="button"
          title={t('message.removeCover')}
          aria-label={t('message.removeCover')}
          class="glass flex size-9 items-center justify-center rounded-full text-white"
          onclick={() =>
            run(() => deleteImage(entity, id), 'message.coverRemoved', 'message.coverRemoveError')}
        >
          <Trash2 class="size-4" />
        </button>
      {/if}
    {/if}
    <input bind:this={input} type="file" accept="image/*" class="hidden" onchange={upload} />
  </div>
{/if}
