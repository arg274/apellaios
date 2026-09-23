// EAN-13, UPC-A and EAN-8 encoding: the barcodes on record sleeves and CD cases (and in the
// `barcode` tag). Produces the module pattern (1 = bar, 0 = space) plus what a renderer needs to
// lay out the human-readable digits the standard way.

export type BarcodeFormat = 'ean13' | 'upca' | 'ean8'

export interface Barcode {
  format: BarcodeFormat
  /** Every digit, check digit included */
  digits: string
  /** One character per module, left to right, without quiet zones */
  modules: string
  /** Per module: part of a guard pattern, drawn longer than data bars */
  guard: boolean[]
  /** Printed digits and the module each is centred on; outside digits sit in the quiet zones */
  text: { digit: string; center: number }[]
}

// Left-hand odd (L) and even (G) parity, right-hand (R) patterns per digit
// prettier-ignore
const L = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
]
// prettier-ignore
const G = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
]
// prettier-ignore
const R = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
]
/** EAN-13: the first digit is encoded as the L/G parity of the next six */
// prettier-ignore
const PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
]

const EDGE = '101'
const MIDDLE = '01010'

/** The check digit for the digits before it: weights 3, 1, 3... from the right */
export function checkDigit(payload: string): number {
  let sum = 0
  for (let i = 0; i < payload.length; i++) {
    const weight = (payload.length - i) % 2 === 1 ? 3 : 1
    sum += Number(payload[i]) * weight
  }
  return (10 - (sum % 10)) % 10
}

/**
 * Encodes a code with or without its check digit: 12/13 digits are EAN-13, 11/12 read as UPC-A
 * when `format` asks for it, 7/8 digits are EAN-8. Spaces and dashes are ignored. Throws on
 * anything else or a wrong check digit.
 */
export function encodeBarcode(value: string, format?: BarcodeFormat): Barcode {
  const raw = value.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(raw)) throw new Error(`Not a numeric barcode: "${value}"`)
  const kind = format ?? inferFormat(raw.length)
  const size = { ean13: 13, upca: 12, ean8: 8 }[kind]
  let digits = raw
  if (digits.length === size - 1) digits += checkDigit(digits)
  if (digits.length !== size)
    throw new Error(`${kind.toUpperCase()} needs ${size - 1} or ${size} digits`)
  if (Number(digits[size - 1]) !== checkDigit(digits.slice(0, -1))) {
    throw new Error(`Wrong check digit in "${value}"`)
  }
  return kind === 'ean8'
    ? ean8(digits)
    : ean13(kind === 'upca' ? '0' + digits : digits, kind, digits)
}

function inferFormat(length: number): BarcodeFormat {
  if (length === 12 || length === 13) return 'ean13'
  if (length === 7 || length === 8) return 'ean8'
  if (length === 11) return 'upca'
  throw new Error(`Unsupported barcode length ${length}`)
}

/** Module pattern and guard flags from [pattern, isGuard] pieces */
function assemble(pieces: [string, boolean][]) {
  let modules = ''
  const guard: boolean[] = []
  for (const [pattern, isGuard] of pieces) {
    modules += pattern
    for (let i = 0; i < pattern.length; i++) guard.push(isGuard)
  }
  return { modules, guard }
}

/** Where digit `i` of a 7-module block starting at `start` is centred */
const centre = (start: number, i: number) => start + i * 7 + 3.5

function ean13(ean: string, format: 'ean13' | 'upca', digits: string): Barcode {
  const parity = PARITY[Number(ean[0])]
  const left = [...ean.slice(1, 7)].map((d, i) => (parity[i] === 'L' ? L : G)[Number(d)])
  const right = [...ean.slice(7)].map((d) => R[Number(d)])
  const upc = format === 'upca'
  // UPC-A draws its first and last digits (the number system and check digit) as tall as the guards
  const { modules, guard } = assemble([
    [EDGE, true],
    ...left.map((p, i): [string, boolean] => [p, upc && i === 0]),
    [MIDDLE, true],
    ...right.map((p, i): [string, boolean] => [p, upc && i === 5]),
    [EDGE, true],
  ])
  const text = upc
    ? [
        { digit: digits[0], center: -4 },
        ...[...digits.slice(1, 6)].map((digit, i) => ({ digit, center: centre(3, i + 1) })),
        ...[...digits.slice(6, 11)].map((digit, i) => ({ digit, center: centre(50, i) })),
        { digit: digits[11], center: modules.length + 4 },
      ]
    : [
        { digit: ean[0], center: -4 },
        ...[...ean.slice(1, 7)].map((digit, i) => ({ digit, center: centre(3, i) })),
        ...[...ean.slice(7)].map((digit, i) => ({ digit, center: centre(50, i) })),
      ]
  return { format, digits, modules, guard, text }
}

function ean8(digits: string): Barcode {
  const { modules, guard } = assemble([
    [EDGE, true],
    ...[...digits.slice(0, 4)].map((d): [string, boolean] => [L[Number(d)], false]),
    [MIDDLE, true],
    ...[...digits.slice(4)].map((d): [string, boolean] => [R[Number(d)], false]),
    [EDGE, true],
  ])
  const text = [
    ...[...digits.slice(0, 4)].map((digit, i) => ({ digit, center: centre(3, i) })),
    ...[...digits.slice(4)].map((digit, i) => ({ digit, center: centre(36, i) })),
  ]
  return { format: 'ean8', digits, modules, guard, text }
}

/** Consecutive bar modules merged into runs, so a renderer draws one shape per bar */
export function barRuns(code: Barcode): { start: number; width: number; guard: boolean }[] {
  const runs: { start: number; width: number; guard: boolean }[] = []
  for (let i = 0; i < code.modules.length; i++) {
    if (code.modules[i] !== '1') continue
    const last = runs.at(-1)
    if (last && last.start + last.width === i && last.guard === code.guard[i]) last.width++
    else runs.push({ start: i, width: 1, guard: code.guard[i] })
  }
  return runs
}
