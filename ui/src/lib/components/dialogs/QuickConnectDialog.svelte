<script lang="ts">
  // Signs a Jellyfin client in to this account: enter the code it shows, confirm the device
  import { authorizeQuickConnect, lookupQuickConnect, type QuickConnectInfo } from '$lib/api/native'
  import { HttpError } from '$lib/api/http'
  import { t } from '$lib/i18n/index.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import Input from '$lib/components/ui/Input.svelte'

  let code = $state('')
  let pending = $state<QuickConnectInfo | null>(null)
  let loading = $state(false)

  function close() {
    ui.quickConnect = false
    code = ''
    pending = null
  }

  function fail(e: unknown) {
    pending = null
    const status = e instanceof HttpError ? e.status : 0
    toast.warning(
      t(
        status === 404 || status === 409
          ? 'message.quickConnectInvalidCode'
          : 'message.quickConnectError',
      ),
    )
  }

  async function lookup(e: SubmitEvent) {
    e.preventDefault()
    loading = true
    try {
      pending = await lookupQuickConnect(code.trim())
    } catch (err) {
      fail(err)
    } finally {
      loading = false
    }
  }

  async function approve() {
    loading = true
    try {
      const data = await authorizeQuickConnect(code.trim())
      toast.success(
        t('message.quickConnectApproved', { app: data?.appName, device: data?.deviceName }),
      )
      close()
    } catch (err) {
      fail(err)
    } finally {
      loading = false
    }
  }
</script>

<Dialog
  bind:open={() => ui.quickConnect, (v) => !v && close()}
  title={t('menu.quickConnect.name')}
  size="sm"
>
  {#if pending}
    <p class="text-body text-label">
      {t('menu.quickConnect.confirm', {
        app: pending.appName,
        version: pending.appVersion,
        device: pending.deviceName,
      })}
    </p>
  {:else}
    <form id="quick-connect" onsubmit={lookup} class="flex flex-col gap-3">
      <p class="text-body text-label-2">{t('menu.quickConnect.help')}</p>
      <Input
        bind:value={code}
        autofocus
        inputmode="numeric"
        autocomplete="off"
        aria-label={t('menu.quickConnect.code')}
        placeholder={t('menu.quickConnect.code')}
        class="h-11 text-center font-mono text-title-2 tracking-[0.3em]"
      />
    </form>
  {/if}
  {#snippet footer()}
    {#if pending}
      <Button variant="ghost" onclick={() => (pending = null)}>{t('ra.action.back')}</Button>
      <Button disabled={loading} onclick={approve}>{t('menu.quickConnect.approve')}</Button>
    {:else}
      <Button variant="ghost" onclick={close}>{t('ra.action.cancel')}</Button>
      <Button type="submit" form="quick-connect" disabled={loading || !code.trim()}
        >{t('menu.quickConnect.continue')}</Button
      >
    {/if}
  {/snippet}
</Dialog>
