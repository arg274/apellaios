// A small JSON Schema + JSONForms-style UI schema engine for plugin configuration. Plugins ship
// the same `schema`/`uiSchema` pair the React UI fed to JSONForms, so the UI schema vocabulary
// (layouts, Group, Label, Control scopes, `options.detail`, rules) is kept.
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'

export interface JsonSchema {
  type?: string | string[]
  title?: string
  description?: string
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  enum?: unknown[]
  oneOf?: JsonSchema[]
  const?: unknown
  default?: unknown
  format?: string
  readOnly?: boolean
  [key: string]: unknown
}

export interface UiRule {
  effect: 'HIDE' | 'SHOW' | 'ENABLE' | 'DISABLE'
  condition: { scope: string; schema: JsonSchema }
}

export interface UiElement {
  type: string
  elements?: UiElement[]
  scope?: string
  label?: string | boolean | { text?: string; show?: boolean }
  text?: string
  options?: Record<string, unknown>
  rule?: UiRule
}

export type Path = (string | number)[]

export const toPointer = (path: Path): string =>
  path.length
    ? '/' + path.map((p) => String(p).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')
    : ''

/** '#/properties/a/properties/b' → the subschema and data path ['a', 'b'] */
export function resolveScope(
  schema: JsonSchema,
  scope: string,
): { schema: JsonSchema | undefined; path: string[] } {
  const parts = scope.replace(/^#\/?/, '').split('/').filter(Boolean)
  const path: string[] = []
  let current: JsonSchema | undefined = schema
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'properties' && i + 1 < parts.length) {
      const key = parts[++i]
      path.push(key)
      current = current?.properties?.[key]
    } else {
      // Anything else (definitions, items...) only walks the schema
      current = current?.[parts[i]] as JsonSchema | undefined
    }
  }
  return { schema: current, path }
}

/** What JSONForms generates when a plugin ships no UI schema: every property, top to bottom */
export const defaultLayout = (schema: JsonSchema): UiElement => ({
  type: 'VerticalLayout',
  elements: Object.keys(schema.properties ?? {}).map((key) => ({
    type: 'Control',
    scope: `#/properties/${key}`,
  })),
})

/** "reconnectDelay" → "Reconnect Delay", JSONForms' fallback when a property has no title */
export const startCase = (key: string): string =>
  key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

export function labelFor(
  ui: UiElement | undefined,
  schema: JsonSchema | undefined,
  key: string | number | undefined,
): string {
  const l = ui?.label
  if (typeof l === 'string') return l
  if (l && typeof l === 'object' && l.text) return l.text
  return schema?.title ?? (key !== undefined ? startCase(String(key)) : '')
}

export const showsLabel = (ui: UiElement | undefined): boolean =>
  !(ui?.label === false || (typeof ui?.label === 'object' && ui.label.show === false))

export type ControlKind =
  'enum' | 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'unknown'

export function kindOf(schema: JsonSchema | undefined): ControlKind {
  if (!schema) return 'unknown'
  if (schema.enum || schema.oneOf?.every((s) => 'const' in s)) return 'enum'
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type
  if (!type && schema.properties) return 'object'
  switch (type) {
    case 'string':
    case 'number':
    case 'integer':
    case 'boolean':
    case 'object':
    case 'array':
      return type
    default:
      return 'unknown'
  }
}

/** Choices for an enum control, from `enum` or a `oneOf` of titled consts */
export const enumOptions = (schema: JsonSchema): { value: unknown; label: string }[] =>
  schema.enum
    ? schema.enum.map((v) => ({ value: v, label: String(v) }))
    : (schema.oneOf ?? []).map((s) => ({ value: s.const, label: s.title ?? String(s.const) }))

export function getAt(data: unknown, path: Path): unknown {
  let current = data
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string | number, unknown>)[key]
  }
  return current
}

/** Sets a value in place, creating objects and arrays on the way; undefined deletes the key */
export function setAt(data: Record<string, unknown>, path: Path, value: unknown): void {
  let current: Record<string | number, unknown> = data
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (current[key] === null || typeof current[key] !== 'object') {
      current[key] = typeof path[i + 1] === 'number' ? [] : {}
    }
    current = current[key] as Record<string | number, unknown>
  }
  const last = path[path.length - 1]
  if (value === undefined && !Array.isArray(current)) delete current[last]
  else current[last] = value
}

/** An empty value for a new array item */
export function emptyValue(schema: JsonSchema | undefined): unknown {
  if (schema?.default !== undefined) return structuredClone(schema.default)
  switch (kindOf(schema)) {
    case 'object':
      return {}
    case 'array':
      return []
    case 'boolean':
      return false
    case 'string':
      return ''
    default:
      return undefined
  }
}

const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false })
addFormats(ajv)
const compiled = new WeakMap<object, ValidateFunction>()

function validator(schema: JsonSchema): ValidateFunction {
  let fn = compiled.get(schema)
  if (!fn) {
    fn = ajv.compile({ type: 'object', ...schema })
    compiled.set(schema, fn)
  }
  return fn
}

export interface SchemaError {
  pointer: string
  message: string
}

/**
 * Validates `data` in place, filling in schema defaults like JSONForms did. A missing required
 * property is reported on the property itself rather than its parent, so it shows under its input.
 */
export function validate(schema: JsonSchema, data: Record<string, unknown>): SchemaError[] {
  const fn = validator(schema)
  fn(data)
  return (fn.errors ?? []).map((e: ErrorObject) => {
    const missing =
      e.keyword === 'required'
        ? (e.params as { missingProperty?: string }).missingProperty
        : undefined
    return {
      pointer: missing ? `${e.instancePath}/${missing}` : e.instancePath,
      message: missing ? 'is required' : (e.message ?? 'is invalid'),
    }
  })
}

/** Whether a rule leaves its element visible and editable */
export function evaluateRule(
  rule: UiRule | undefined,
  rootSchema: JsonSchema,
  rootData: unknown,
): { visible: boolean; enabled: boolean } {
  if (!rule?.condition?.scope) return { visible: true, enabled: true }
  const { path } = resolveScope(rootSchema, rule.condition.scope)
  let fn = compiled.get(rule.condition.schema)
  if (!fn) {
    fn = ajv.compile(rule.condition.schema)
    compiled.set(rule.condition.schema, fn)
  }
  const matches = !!fn(getAt(rootData, path))
  switch (rule.effect) {
    case 'HIDE':
      return { visible: !matches, enabled: true }
    case 'SHOW':
      return { visible: matches, enabled: true }
    case 'DISABLE':
      return { visible: true, enabled: !matches }
    case 'ENABLE':
      return { visible: true, enabled: matches }
  }
}

/** A readable name for the field behind a pointer, e.g. "User Tokens[1].Discord Token" */
export function describePointer(schema: JsonSchema, pointer: string): string {
  const parts = pointer.split('/').filter(Boolean)
  let current: JsonSchema | undefined = schema
  let out = ''
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      out += `[${part}]`
      current = current?.items
    } else {
      current = current?.properties?.[part]
      out += (out ? '.' : '') + (current?.title ?? part)
    }
  }
  return out
}
