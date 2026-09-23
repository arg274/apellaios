<script lang="ts">
  import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from '@lucide/svelte'
  import { flip } from 'svelte/animate'
  import { fly } from 'svelte/transition'
  import { t } from '$lib/i18n/index.svelte'
  import { toast } from '$lib/state/toast.svelte'

  const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert }
  const tones = {
    info: 'text-label-2',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-danger',
  }
</script>

<!-- Glass toasts stacked at the top centre, clear of the floating player -->
<div
  class="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4"
  aria-live="polite"
>
  {#each toast.items as item (item.id)}
    {@const Icon = icons[item.kind]}
    <div
      animate:flip={{ duration: 200 }}
      in:fly={{ y: -16, duration: 220 }}
      out:fly={{ y: -16, duration: 160 }}
      role={item.kind === 'error' ? 'alert' : 'status'}
      class="glass-menu pointer-events-auto flex max-w-md min-w-64 items-center gap-3 rounded-full py-2 pr-2 pl-4 text-body text-label"
    >
      <Icon class="size-4 shrink-0 {tones[item.kind]}" />
      <span class="flex-1">{item.message}</span>
      {#if item.action}
        <button
          type="button"
          class="rounded-full px-2 py-1 font-semibold text-accent hover:bg-hover"
          onclick={() => {
            item.action?.run()
            toast.dismiss(item.id)
          }}
        >
          {item.action.label}
        </button>
      {/if}
      <button
        type="button"
        aria-label={t('ra.action.close')}
        class="flex size-6 items-center justify-center rounded-full text-label-3 hover:bg-hover hover:text-label"
        onclick={() => toast.dismiss(item.id)}
      >
        <X class="size-3.5" />
      </button>
    </div>
  {/each}
</div>
