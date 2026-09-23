<script lang="ts">
  // An EAN-13 / UPC-A / EAN-8 barcode as vector SVG. Adjacent modules are merged into one rect per
  // bar, so it stays seamless at any scale; set the size in pixels, or scale it with CSS width.
  import { barRuns, encodeBarcode, type Barcode, type BarcodeFormat } from '$lib/barcode'
  import { cn } from '$lib/utils/cn'

  let {
    value,
    format,
    height = 60,
    moduleWidth = 2,
    color = 'currentColor',
    background = 'transparent',
    showText = true,
    compact = false,
    class: className,
  }: {
    /** Digits, with or without the check digit; spaces and dashes are ignored */
    value: string
    /** Needed only to read 11/12 digits as UPC-A rather than EAN-13 */
    format?: BarcodeFormat
    /** Bar height in px, not counting the digits below */
    height?: number
    /** Width of the thinnest bar in px; every other bar is a multiple of it */
    moduleWidth?: number
    color?: string
    background?: string
    /** Print the digits under the bars */
    showText?: boolean
    /**
     * Fit into running text instead of the printed-label layout: no quiet zones, bars of even
     * height, and the digits in one row spanning exactly the bars, so the barcode starts and ends
     * with them. The default is the standard layout, with the outer digits beside the bars and the
     * guard bars dropping between the digit groups.
     */
    compact?: boolean
    class?: string
  } = $props()

  const code = $derived.by((): Barcode | null => {
    try {
      return encodeBarcode(value, format)
    } catch {
      return null
    }
  })
  const runs = $derived(code ? barRuns(code) : [])

  // Standard quiet zones in modules, wide enough for the digits printed beside the bars
  const quiet = $derived(
    compact
      ? [0, 0]
      : code?.format === 'ean8'
        ? [7, 7]
        : code?.format === 'upca'
          ? [9, 9]
          : [11, 7],
  )
  const fontSize = $derived(moduleWidth * 9)
  const barsWidth = $derived(code ? code.modules.length * moduleWidth : 0)
  const guardHeight = $derived(showText && !compact ? height + fontSize * 0.5 : height)
  const totalHeight = $derived(showText ? height + fontSize * 1.15 : height)
  const width = $derived(code ? (quiet[0] + code.modules.length + quiet[1]) * moduleWidth : 0)
  const x = (module: number) => (quiet[0] + module) * moduleWidth
</script>

{#if code}
  <svg
    role="img"
    aria-label="Barcode {code.digits}"
    {width}
    height={totalHeight}
    viewBox="0 0 {width} {totalHeight}"
    class={cn('shrink-0', className)}
    shape-rendering="crispEdges"
  >
    {#if background !== 'transparent'}
      <rect {width} height={totalHeight} fill={background} />
    {/if}
    {#each runs as run (run.start)}
      <rect
        x={x(run.start)}
        width={run.width * moduleWidth}
        height={run.guard ? guardHeight : height}
        fill={color}
      />
    {/each}
    {#if showText && compact}
      <!-- One row stretched to the bars' width: it starts and ends with them -->
      <text
        x={0}
        y={height + fontSize}
        font-size={fontSize}
        textLength={barsWidth}
        lengthAdjust="spacing"
        fill={color}
        class="font-mono">{code.digits}</text
      >
    {:else if showText}
      {#each code.text as { digit, center }, i (i)}
        <text
          x={x(center)}
          y={height + fontSize}
          font-size={fontSize}
          text-anchor="middle"
          fill={color}
          class="font-mono">{digit}</text
        >
      {/each}
    {/if}
  </svg>
{/if}
