<script lang="ts">
  import { ExternalLink } from '@lucide/svelte'
  import { listenbrainz } from '$lib/api/native'
  import { t } from '$lib/i18n/index.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import Input from '$lib/components/ui/Input.svelte'

  let token = $state('')
  let checking = $state(false)

  async function save(e: SubmitEvent) {
    e.preventDefault()
    checking = true
    try {
      const res = await listenbrainz.link(token.trim())
      toast.success(t('message.listenBrainzLinkSuccess', { user: res?.user ?? '' }))
      ui.listenBrainzToken = false
      token = ''
    } catch {
      toast.error(t('message.listenBrainzLinkFailure'))
    } finally {
      checking = false
    }
  }
</script>

<Dialog bind:open={ui.listenBrainzToken} title="ListenBrainz" size="sm">
  <form id="lb-token" onsubmit={save} class="flex flex-col gap-3">
    <p class="text-body text-label-2">
      {t('resources.user.message.listenBrainzToken')}
      <a
        href="https://listenbrainz.org/profile/"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-0.5 text-accent hover:underline"
      >
        {t('resources.user.message.clickHereForToken')}<ExternalLink class="size-3" />
      </a>
    </p>
    <Input
      bind:value={token}
      autofocus
      autocomplete="off"
      aria-label={t('resources.user.fields.token')}
      placeholder={t('resources.user.fields.token')}
      class="font-mono"
    />
  </form>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (ui.listenBrainzToken = false)}
      >{t('ra.action.cancel')}</Button
    >
    <Button type="submit" form="lb-token" disabled={checking || !token.trim()}
      >{t('ra.action.save')}</Button
    >
  {/snippet}
</Dialog>
