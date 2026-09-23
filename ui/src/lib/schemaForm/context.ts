import { getContext, setContext } from 'svelte'
import type { JsonSchema, Path } from './schema'

/** What every control in a SchemaForm reads from and writes to */
export interface SchemaFormContext {
  readonly rootSchema: JsonSchema
  readonly readonly: boolean
  get(path: Path): unknown
  set(path: Path, value: unknown): void
  errorAt(pointer: string): string | undefined
}

const KEY = Symbol('schema-form')

export const setSchemaForm = (ctx: SchemaFormContext) => setContext(KEY, ctx)
export const getSchemaForm = () => getContext<SchemaFormContext>(KEY)
