<script lang="ts">
  import { Dialog } from 'bits-ui'
  import { X } from '@lucide/svelte'
  import { t } from '$lib/i18n/index.svelte'

  let {
    open = $bindable(false),
    src,
    title,
  }: { open?: boolean; src: string; title: string } = $props()
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 animate-fade bg-black/80 backdrop-blur-xl" />
    <Dialog.Content
      class="fixed inset-0 z-50 flex origin-floating animate-pop flex-col items-center justify-center gap-4 p-8 outline-none"
      onclick={() => (open = false)}
    >
      <Dialog.Title class="sr-only">{title}</Dialog.Title>
      <img
        {src}
        alt={title}
        class="max-h-[85dvh] max-w-full rounded-art-lg object-contain shadow-2xl"
      />
      <p class="text-body text-white/80">{title}</p>
      <Dialog.Close
        class="glass absolute top-4 right-4 flex size-9 items-center justify-center rounded-full text-white"
        aria-label={t('ra.action.close')}
      >
        <X class="size-4" />
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
