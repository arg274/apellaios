<script lang="ts">
  import { AudioLines } from '@lucide/svelte'
  import DOMPurify from 'dompurify'
  import { BRAND } from '$lib/brand'
  import config from '$lib/config'
  import { t } from '$lib/i18n/index.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const firstTime = config.firstTime

  let username = $state('')
  let password = $state('')
  let confirm = $state('')
  let error = $state('')
  let busy = $state(false)
  let bgLoaded = $state(false)

  const welcome = config.welcomeMessage ? DOMPurify.sanitize(config.welcomeMessage) : ''

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    error = ''
    if (!username || !password) {
      error = t('ra.validation.required')
      return
    }
    if (firstTime && password !== confirm) {
      error = t('ra.validation.passwordDoesNotMatch')
      return
    }
    busy = true
    try {
      await auth.login(username, password)
    } catch (err) {
      const key = (err as Error).message
      error =
        key.startsWith('ra.') || key.startsWith('errors.') ? t(key) : t('ra.auth.sign_in_error')
    } finally {
      busy = false
    }
  }
</script>

<div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-page p-4">
  {#if config.loginBackgroundURL}
    <img
      src={config.loginBackgroundURL}
      alt=""
      class="absolute inset-0 size-full object-cover transition-opacity duration-700 {bgLoaded
        ? 'opacity-100'
        : 'opacity-0'}"
      onload={() => (bgLoaded = true)}
    />
    <div class="absolute inset-0 bg-black/30"></div>
  {/if}

  <form
    onsubmit={submit}
    class="glass relative w-full max-w-sm animate-pop rounded-3xl px-8 pt-8 pb-7 text-label"
    novalidate
  >
    <div class="mb-6 flex flex-col items-center gap-3 text-center">
      <span
        class="flex size-14 items-center justify-center rounded-[14px] bg-gradient-to-br from-accent to-accent/60 text-white shadow-lg"
      >
        <AudioLines class="size-8" strokeWidth={2.5} />
      </span>
      <h1 class="text-title-1 font-bold tracking-tight">{BRAND}</h1>
      {#if firstTime}
        <p class="text-body text-label-2">
          {t('ra.auth.welcome1')}<br />{t('ra.auth.welcome2')}
        </p>
      {/if}
      {#if welcome}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised with DOMPurify -->
        <div class="text-body text-label-2">{@html welcome}</div>
      {/if}
    </div>

    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1">
        <span class="text-callout font-medium text-label-2">{t('ra.auth.username')}</span>
        <Input
          bind:value={username}
          autocomplete="username"
          autocapitalize="none"
          autofocus
          disabled={busy}
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-callout font-medium text-label-2">{t('ra.auth.password')}</span>
        <Input
          type="password"
          bind:value={password}
          autocomplete={firstTime ? 'new-password' : 'current-password'}
          disabled={busy}
        />
      </label>
      {#if firstTime}
        <label class="flex flex-col gap-1">
          <span class="text-callout font-medium text-label-2">{t('ra.auth.confirmPassword')}</span>
          <Input type="password" bind:value={confirm} autocomplete="new-password" disabled={busy} />
        </label>
      {/if}
    </div>

    {#if error}
      <p role="alert" class="mt-3 text-center text-callout text-danger">{error}</p>
    {/if}

    <Button type="submit" size="lg" class="mt-6 w-full" disabled={busy}>
      {#if busy}
        <Spinner class="size-4 text-on-accent" />
      {:else}
        {firstTime ? t('ra.auth.buttonCreateAdmin') : t('ra.auth.sign_in')}
      {/if}
    </Button>
  </form>

  <p class="absolute right-0 bottom-3 left-0 text-center text-footnote text-white/70">
    {config.version}
  </p>
</div>
