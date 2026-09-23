<script lang="ts">
  import { Switch } from 'bits-ui'
  import { cn } from '$lib/utils/cn'

  let {
    checked = $bindable(false),
    disabled = false,
    id,
    name,
    label,
    class: className,
    onCheckedChange,
  }: {
    checked?: boolean
    disabled?: boolean
    id?: string
    name?: string
    /** Accessible name when there is no visible <label for> */
    label?: string
    class?: string
    onCheckedChange?: (checked: boolean) => void
  } = $props()
</script>

<!-- iOS-style switch: green track, white knob with a soft shadow -->
<Switch.Root
  bind:checked
  {disabled}
  {id}
  {name}
  {onCheckedChange}
  aria-label={label}
  class={cn(
    'inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 disabled:opacity-40 data-[state=checked]:bg-success data-[state=unchecked]:bg-control',
    className,
  )}
>
  <Switch.Thumb
    class="block size-[18px] rounded-full bg-white shadow-[0_2px_4px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-[var(--ease-spring)] data-[state=checked]:translate-x-4"
  />
</Switch.Root>
