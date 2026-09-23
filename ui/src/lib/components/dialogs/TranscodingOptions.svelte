<script lang="ts">
  // "Original format" or a transcode target + max bitrate, shared by the share and download dialogs
  import { BITRATES, DEFAULT_SHARE_BITRATE } from '$lib/bitrates'
  import config from '$lib/config'
  import { getAll } from '$lib/api/rest'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import Field from '$lib/components/ui/Field.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'

  let {
    original = $bindable(true),
    format = $bindable(config.defaultDownsamplingFormat),
    maxBitRate = $bindable(DEFAULT_SHARE_BITRATE),
    label,
  }: { original?: boolean; format?: string; maxBitRate?: number; label: string } = $props()

  const formats = new Loader(
    () => 'transcodings',
    () => getAll('transcoding', { sort: 'name', order: 'ASC' }),
  )
</script>

<Field {label} for="tc-original" inline>
  <Switch
    id="tc-original"
    bind:checked={original}
    onCheckedChange={(v) => {
      if (v) {
        format = config.defaultDownsamplingFormat
        maxBitRate = DEFAULT_SHARE_BITRATE
      }
    }}
  />
</Field>
{#if !original}
  <div class="grid grid-cols-2 gap-3">
    <Field label={t('resources.player.fields.transcodingId')} for="tc-format">
      <Select
        id="tc-format"
        bind:value={format}
        options={(formats.value ?? []).map((f) => ({ value: f.targetFormat, label: f.name }))}
      />
    </Field>
    <Field label={t('resources.player.fields.maxBitRate')} for="tc-bitrate">
      <Select
        id="tc-bitrate"
        value={String(maxBitRate)}
        options={BITRATES.map((b) => ({ value: String(b), label: String(b) }))}
        onValueChange={(v) => (maxBitRate = Number(v))}
      />
    </Field>
  </div>
{/if}
