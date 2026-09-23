<script lang="ts">
  // Warns about ND_ENABLETRANSCODINGCONFIG: either that it's on (a security risk) or that it's needed
  import { ShieldAlert } from '@lucide/svelte'
  import config from '$lib/config'
  import { t } from '$lib/i18n/index.svelte'

  const PLACEHOLDER = '\u0000'
  const parts = $derived(
    t(
      config.enableTranscodingConfig ? 'message.transcodingEnabled' : 'message.transcodingDisabled',
      { config: PLACEHOLDER },
    ).split(PLACEHOLDER),
  )
</script>

<div
  class="mb-6 flex max-w-2xl gap-3 rounded-xl bg-fill-2 p-4 text-body text-label-2 ring-1 ring-divider ring-inset"
>
  <ShieldAlert class="mt-px size-4 shrink-0 text-warning" />
  <p>
    {parts[0]}<code class="rounded bg-fill px-1 font-mono text-callout text-label"
      >ND_ENABLETRANSCODINGCONFIG=true</code
    >{parts[1]}
  </p>
</div>
