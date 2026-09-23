<script lang="ts">
  import { addToPlaylist } from '$lib/api/native'
  import { create } from '$lib/api/rest'
  import { t } from '$lib/i18n/index.svelte'
  import { navigate } from '$lib/nav.svelte'
  import { player } from '$lib/player/player.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import Input from '$lib/components/ui/Input.svelte'

  let name = $state('')
  let busy = $state(false)

  async function save(e?: SubmitEvent) {
    e?.preventDefault()
    if (!name.trim()) return
    busy = true
    try {
      const ids = player.queue.flatMap((q) => (q.kind === 'song' ? [q.song.id] : []))
      const pls = await create('playlist', { name: name.trim() })
      await addToPlaylist(pls.id, { ids })
      toast.success(t('ra.notification.created', { smart_count: 1 }))
      ui.saveQueue = false
      name = ''
      void navigate(`/playlist/${pls.id}/show`)
    } catch {
      toast.error(t('ra.page.error'))
    } finally {
      busy = false
    }
  }
</script>

<Dialog bind:open={ui.saveQueue} title={t('resources.playlist.actions.saveQueue')} size="sm">
  <form id="save-queue" onsubmit={save}>
    <label class="flex flex-col gap-1.5">
      <span class="text-body font-medium">{t('resources.playlist.fields.name')}</span>
      <Input bind:value={name} autofocus />
    </label>
  </form>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (ui.saveQueue = false)}>{t('ra.action.cancel')}</Button>
    <Button type="submit" form="save-queue" disabled={busy || !name.trim()}
      >{t('ra.action.save')}</Button
    >
  {/snippet}
</Dialog>
