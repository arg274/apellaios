<script lang="ts">
  // Admin activity: server uptime, the last or running scan, and scan controls
  import { Activity, CircleAlert, FolderSearch, RefreshCw, ServerOff } from '@lucide/svelte'
  import { Popover } from 'bits-ui'
  import { onMount } from 'svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { scanLibraries } from '$lib/scan'
  import { activity } from '$lib/state/activity.svelte'
  import { formatDuration, formatNumber, formatShortDuration } from '$lib/utils/formatters'
  import { cn } from '$lib/utils/cn'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import Tooltip from '$lib/components/ui/Tooltip.svelte'

  let open = $state(false)
  let now = $state(Date.now())

  // A clock for uptime and the running scan's elapsed time, only while someone is looking
  $effect(() => {
    if (!open) return
    now = Date.now()
    const timer = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(timer)
  })

  onMount(() => void activity.loadScanStatus())

  const status = $derived(activity.scanStatus)
  const serverDown = $derived(!activity.serverUp || !activity.serverStart.startTime)
  const uptime = $derived(
    activity.serverStart.startTime
      ? formatDuration((now - activity.serverStart.startTime) / 1000)
      : '',
  )
  // The server reports nanoseconds when an event arrives; count on from there while scanning
  const elapsed = $derived(
    status.elapsedTime + (status.scanning ? Math.max(0, now - activity.scanStatusAt) * 1e6 : 0),
  )

  const scanType = $derived(
    status.scanType === 'full'
      ? t('activity.fullScan')
      : status.scanType === 'quick'
        ? t('activity.quickScan')
        : status.scanType?.endsWith('-selective')
          ? t('activity.selectiveScan')
          : '—',
  )

  const Icon = $derived(serverDown ? ServerOff : status.error ? CircleAlert : Activity)
  const tooltip = $derived(
    status.error ? `${t('activity.status')}: ${status.error}` : t('activity.title'),
  )
</script>

<Popover.Root bind:open>
  <Tooltip content={tooltip}>
    {#snippet trigger(tooltipProps)}
      <Popover.Trigger {...tooltipProps}>
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            aria-label={t('activity.title')}
            class={cn(
              'relative flex size-8 shrink-0 items-center justify-center rounded-full text-label-2 hover:bg-hover hover:text-label',
              serverDown && 'text-danger hover:text-danger',
              !serverDown && status.error && 'text-warning hover:text-warning',
            )}
          >
            <Icon class="size-4" />
            {#if status.scanning}
              <!-- A spinning ring around the icon while a scan runs -->
              <span
                class="absolute inset-0.5 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
              ></span>
            {/if}
          </button>
        {/snippet}
      </Popover.Trigger>
    {/snippet}
  </Tooltip>
  <Popover.Portal>
    <Popover.Content
      side="top"
      align="end"
      sideOffset={8}
      class="glass-menu z-50 w-80 animate-pop rounded-2xl p-4 text-body"
    >
      <h3 class="mb-3 text-title-3 font-bold text-label">{t('activity.title')}</h3>

      <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
        <dt class="text-label-2">{t('activity.serverUptime')}</dt>
        <dd
          class={cn(
            'text-right tabular-nums',
            serverDown ? 'font-semibold text-danger' : 'text-label',
          )}
        >
          {serverDown ? t('activity.serverDown') : uptime}
        </dd>
      </dl>

      <div class="my-3 h-px bg-divider"></div>

      <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
        <dt class="text-label-2">{t('activity.totalScanned')}</dt>
        <dd class="text-right text-label tabular-nums">
          {status.folderCount ? formatNumber(status.folderCount) : '—'}
        </dd>
        <dt class="text-label-2">{t('activity.scanType')}</dt>
        <dd class="text-right text-label">{scanType}</dd>
        <dt class="text-label-2">{t('activity.elapsedTime')}</dt>
        <dd class="text-right text-label tabular-nums">
          {elapsed ? formatShortDuration(elapsed) : '—'}
        </dd>
      </dl>

      {#if status.error}
        <div class="mt-3 rounded-lg bg-danger/10 p-2.5 text-callout text-danger">
          <p class="font-semibold">{t('activity.status')}</p>
          <p class="mt-0.5 break-words">{status.error}</p>
        </div>
      {/if}

      <div class="mt-4 flex items-center gap-1 border-t border-divider pt-3">
        <IconButton
          label={t('activity.quickScan')}
          disabled={status.scanning}
          onclick={() => scanLibraries(false)}
        >
          <RefreshCw class={status.scanning ? 'animate-spin' : ''} />
        </IconButton>
        <IconButton
          label={t('activity.fullScan')}
          disabled={status.scanning}
          onclick={() => scanLibraries(true)}
        >
          <FolderSearch />
        </IconButton>
        {#if status.scanning}
          <span class="ml-auto text-callout text-label-2 tabular-nums"
            >{formatNumber(status.count)}</span
          >
        {/if}
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
