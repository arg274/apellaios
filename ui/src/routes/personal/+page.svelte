<script lang="ts">
  import { Check, Monitor, Moon, Sun } from '@lucide/svelte'
  import config from '$lib/config'
  import { ACCENTS, type Scheme } from '$lib/accents'
  import { ALBUM_LISTS } from '$lib/albumLists'
  import { lastfm, listenbrainz } from '$lib/api/native'
  import { Loader } from '$lib/data.svelte'
  import { i18n, t } from '$lib/i18n/index.svelte'
  import { settings, type ReplayGainMode } from '$lib/state/settings.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { baseUrl, openInNewTab } from '$lib/utils/urls'
  import { cn } from '$lib/utils/cn'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import Field from '$lib/components/ui/Field.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Slider from '$lib/components/ui/Slider.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'

  const languages = new Loader(
    () => 'languages',
    () => i18n.languages(),
  )
  let changingLanguage = $state(false)

  const startPages = $derived([
    ...ALBUM_LISTS.map((l) => ({
      value: `/album/${l.id}`,
      label: t(`resources.album.lists.${l.id}`),
    })),
    ...['artist', 'song', 'playlist', 'radio'].map((r) => ({
      value: `/${r}`,
      label: t(`resources.${r}.name`, { smart_count: 2 }),
    })),
  ])

  // Desktop notifications need the browser's permission first
  const notificationsSupported = typeof Notification !== 'undefined'
  async function setNotifications(on: boolean) {
    if (!on) {
      settings.notifications = false
      return
    }
    if (!notificationsSupported) return toast.warning(t('message.notifications_not_available'))
    const permission =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission
    if (permission === 'granted') settings.notifications = true
    else toast.warning(t('message.notifications_blocked'))
  }

  // ---- Last.fm: open the auth page, then poll the link status until it flips or the tab closes
  let lastfmLinked = $state<boolean | null>(null)
  let lastfmApiKey = $state<string | undefined>(undefined)
  let lastfmChecking = $state(false)

  $effect(() => {
    if (!config.lastFMEnabled) return
    lastfm
      .status()
      .then((r) => {
        lastfmLinked = r.status === true
        lastfmApiKey = r.apiKey
      })
      .catch(() => (lastfmLinked = false))
  })

  async function toggleLastfm() {
    if (lastfmLinked) {
      try {
        await lastfm.unlink()
        lastfmLinked = false
        toast.success(t('message.lastfmUnlinkSuccess'))
      } catch {
        toast.warning(t('message.lastfmUnlinkFailure'))
      }
      return
    }
    // Open synchronously so popup blockers attribute it to the click
    const tab = openInNewTab('about:blank')
    if (!tab) return toast.warning(t('message.lastfmLinkFailure'))
    lastfmChecking = true
    try {
      const r = await lastfm.status()
      if (!r.linkToken) throw new Error('no link token')
      const callback = `${window.location.origin}${baseUrl(`/api/lastfm/link/callback?uid=${encodeURIComponent(r.linkToken)}`)}`
      tab.location.href = `https://www.last.fm/api/auth/?api_key=${lastfmApiKey}&cb=${callback}`
    } catch {
      tab.close()
      lastfmChecking = false
      return toast.warning(t('message.lastfmLinkFailure'))
    }
    let checks = 30
    const timer = setInterval(async () => {
      const done = (ok: boolean) => {
        clearInterval(timer)
        lastfmChecking = false
        lastfmLinked = ok
        if (ok) toast.success(t('message.lastfmLinkSuccess'))
        else toast.warning(t('message.lastfmLinkFailure'))
      }
      try {
        const s = await lastfm.status()
        if (s.status === true) done(true)
        else if (tab.closed || --checks === 0) done(false)
      } catch {
        done(false)
      }
    }, 2000)
  }

  // ---- ListenBrainz: linking asks for a user token in a dialog
  let lbLinked = $state<boolean | null>(null)
  const refreshListenBrainz = () =>
    listenbrainz
      .status()
      .then((r) => (lbLinked = r.status === true))
      .catch(() => (lbLinked = false))

  $effect(() => {
    // Re-read after the token dialog closes
    if (!config.listenBrainzEnabled || ui.listenBrainzToken) return
    void refreshListenBrainz()
  })

  async function toggleListenBrainz(on: boolean) {
    if (on) {
      ui.listenBrainzToken = true
      return
    }
    try {
      await listenbrainz.unlink()
      lbLinked = false
      toast.success(t('message.listenBrainzUnlinkSuccess'))
    } catch {
      toast.warning(t('message.listenBrainzUnlinkFailure'))
    }
  }

  const schemes: { value: Scheme; label: string; icon: typeof Sun }[] = [
    { value: 'auto', label: t('ui.schemeAuto'), icon: Monitor },
    { value: 'light', label: t('ui.schemeLight'), icon: Sun },
    { value: 'dark', label: t('ui.schemeDark'), icon: Moon },
  ]
</script>

<PageHeader title={t('menu.personal.name')} />

<div class="flex max-w-2xl flex-col gap-8">
  <FormSection>
    <Field label={t('ui.colorScheme')} inline>
      <SegmentedControl
        value={settings.colorScheme}
        options={schemes}
        label={t('ui.colorScheme')}
        onValueChange={(v) => (settings.colorScheme = v)}
      />
    </Field>
    <div class="flex flex-col gap-2.5">
      <span class="text-body font-medium text-label">{t('ui.accent')}</span>
      <div class="flex flex-wrap gap-3" role="radiogroup" aria-label={t('ui.accent')}>
        {#each ACCENTS as accent (accent.id)}
          {@const on = settings.accentId === accent.id}
          <button
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={t(`ui.accents.${accent.id}`)}
            title={t(`ui.accents.${accent.id}`)}
            class={cn(
              'flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-page transition-transform hover:scale-110',
              on && 'ring-2 ring-label-3',
            )}
            style:background={settings.isDark ? accent.dark : accent.light}
            onclick={() => (settings.accentId = accent.id)}
          >
            {#if on}<Check class="size-4 text-white" strokeWidth={3} />{/if}
          </button>
        {/each}
      </div>
    </div>
  </FormSection>

  <FormSection>
    <Field label={t('menu.personal.options.language')} for="language">
      <div class="flex items-center gap-2">
        <Select
          id="language"
          value={i18n.locale}
          options={[
            { value: 'en', label: 'English' },
            ...(languages.value ?? [])
              .filter((l) => l.id !== 'en')
              .map((l) => ({ value: l.id, label: l.name })),
          ]}
          class="flex-1"
          onValueChange={async (v) => {
            changingLanguage = true
            try {
              await i18n.setLocale(v)
            } catch {
              toast.error(t('ra.page.error'))
            } finally {
              changingLanguage = false
            }
          }}
        />
        {#if changingLanguage}<Spinner class="size-4" />{/if}
      </div>
    </Field>
    <Field label={t('menu.personal.options.defaultView')} for="start-page">
      <Select
        id="start-page"
        value={settings.defaultView}
        options={startPages}
        class="w-full"
        onValueChange={(v) => (settings.defaultView = v)}
      />
    </Field>
  </FormSection>

  {#if config.enableReplayGain}
    <FormSection title={t('ui.playback')}>
      <Field label={t('menu.personal.options.replaygain')} for="replaygain">
        <Select
          id="replaygain"
          value={settings.replayGain}
          options={(['none', 'album', 'track'] as ReplayGainMode[]).map((m) => ({
            value: m,
            label: t(`menu.personal.options.gain.${m}`),
          }))}
          class="w-full"
          onValueChange={(v) => (settings.replayGain = v)}
        />
      </Field>
      {#if settings.replayGain !== 'none'}
        <Field
          label="{t('menu.personal.options.preAmp')}: {settings.preAmp > 0
            ? '+'
            : ''}{settings.preAmp.toFixed(1)}"
        >
          <Slider
            value={settings.preAmp}
            min={-15}
            max={15}
            step={0.5}
            label={t('menu.personal.options.preAmp')}
            onValueChange={(v) => (settings.preAmp = v)}
          />
        </Field>
      {/if}
    </FormSection>
  {/if}

  <FormSection>
    <Field label={t('menu.personal.options.desktop_notifications')} for="notifications" inline>
      <Switch
        id="notifications"
        checked={settings.notifications}
        disabled={!notificationsSupported}
        onCheckedChange={setNotifications}
      />
    </Field>
  </FormSection>

  {#if config.lastFMEnabled || config.listenBrainzEnabled}
    <FormSection title={t('ui.scrobbling')}>
      {#if config.lastFMEnabled}
        <Field
          label={t('menu.personal.options.lastfmScrobbling')}
          for="lastfm"
          inline
          hint={lastfmLinked !== null && !lastfmApiKey
            ? t('menu.personal.options.lastfmNotConfigured')
            : undefined}
        >
          <div class="flex items-center gap-2">
            {#if lastfmChecking}<Spinner class="size-4" />{/if}
            <Switch
              id="lastfm"
              checked={!!lastfmLinked || lastfmChecking}
              disabled={!lastfmApiKey || lastfmLinked === null || lastfmChecking}
              onCheckedChange={toggleLastfm}
            />
          </div>
        </Field>
      {/if}
      {#if config.listenBrainzEnabled}
        <Field label={t('menu.personal.options.listenBrainzScrobbling')} for="listenbrainz" inline>
          <Switch
            id="listenbrainz"
            checked={!!lbLinked}
            disabled={lbLinked === null}
            onCheckedChange={toggleListenBrainz}
          />
        </Field>
      {/if}
    </FormSection>
  {/if}
</div>
