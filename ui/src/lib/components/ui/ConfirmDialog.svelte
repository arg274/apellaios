<script lang="ts">
  import { AlertDialog } from 'bits-ui'
  import { t } from '$lib/i18n/index.svelte'
  import { buttonVariants } from './Button.svelte'

  let {
    open = $bindable(false),
    title,
    message,
    confirmLabel = t('ra.action.confirm'),
    danger = false,
    onConfirm,
  }: {
    open?: boolean
    title: string
    message?: string
    confirmLabel?: string
    danger?: boolean
    onConfirm: () => void | Promise<void>
  } = $props()

  let busy = $state(false)

  async function confirm() {
    busy = true
    try {
      await onConfirm()
      open = false
    } finally {
      busy = false
    }
  }
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Portal>
    <AlertDialog.Overlay class="fixed inset-0 z-50 animate-fade bg-scrim" />
    <AlertDialog.Content
      class="glass-menu fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm origin-floating -translate-x-1/2 -translate-y-1/2 animate-pop rounded-2xl p-5 text-center text-label outline-none"
    >
      <AlertDialog.Title class="text-title-3 font-bold">{title}</AlertDialog.Title>
      {#if message}
        <AlertDialog.Description class="mt-2 text-body text-label-2"
          >{message}</AlertDialog.Description
        >
      {/if}
      <div class="mt-5 grid grid-cols-2 gap-2">
        <AlertDialog.Cancel class={buttonVariants({ variant: 'secondary' })}>
          {t('ra.action.cancel')}
        </AlertDialog.Cancel>
        <button
          type="button"
          class={buttonVariants({ variant: danger ? 'danger' : 'primary' })}
          disabled={busy}
          onclick={confirm}
        >
          {confirmLabel}
        </button>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
