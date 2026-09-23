import { describe, expect, it } from 'vitest'
import {
  defaultLayout,
  describePointer,
  enumOptions,
  evaluateRule,
  getAt,
  kindOf,
  labelFor,
  resolveScope,
  setAt,
  startCase,
  toPointer,
  validate,
  type JsonSchema,
} from './schema'

const discord: JsonSchema = {
  type: 'object',
  properties: {
    clientid: { type: 'string', title: 'Client ID', minLength: 17, pattern: '^[0-9]+$' },
    users: {
      type: 'array',
      title: 'User Tokens',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          username: { type: 'string', title: 'Username', minLength: 1 },
          token: { type: 'string', title: 'Token', minLength: 1 },
        },
        required: ['username', 'token'],
      },
    },
    reconnectDelay: { type: 'integer', default: 5, minimum: 1 },
  },
  required: ['clientid', 'users'],
}

describe('resolveScope', () => {
  it('walks nested properties into a data path', () => {
    const r = resolveScope(discord, '#/properties/users')
    expect(r.path).toEqual(['users'])
    expect(r.schema?.title).toBe('User Tokens')
  })

  it('resolves relative to an item schema', () => {
    const r = resolveScope(discord.properties!.users.items!, '#/properties/token')
    expect(r.path).toEqual(['token'])
    expect(r.schema?.title).toBe('Token')
  })
})

describe('defaultLayout', () => {
  it('lists every property as a control', () => {
    expect(defaultLayout(discord).elements?.map((e) => e.scope)).toEqual([
      '#/properties/clientid',
      '#/properties/users',
      '#/properties/reconnectDelay',
    ])
  })
})

describe('labels', () => {
  it('prefers the UI label, then the title, then the key', () => {
    expect(
      labelFor({ type: 'Control', label: 'Custom' }, discord.properties!.clientid, 'clientid'),
    ).toBe('Custom')
    expect(labelFor({ type: 'Control' }, discord.properties!.clientid, 'clientid')).toBe(
      'Client ID',
    )
    expect(
      labelFor({ type: 'Control' }, discord.properties!.reconnectDelay, 'reconnectDelay'),
    ).toBe('Reconnect Delay')
  })

  it('start-cases keys like JSONForms', () => {
    expect(startCase('max_retries')).toBe('Max Retries')
    expect(startCase('logPrices')).toBe('Log Prices')
  })
})

describe('kindOf / enumOptions', () => {
  it('detects enums from enum and titled oneOf consts', () => {
    expect(kindOf({ type: 'string', enum: ['a', 'b'] })).toBe('enum')
    const oneOf = { type: 'string', oneOf: [{ const: 'x', title: 'Ex' }, { const: 'y' }] }
    expect(kindOf(oneOf)).toBe('enum')
    expect(enumOptions(oneOf)).toEqual([
      { value: 'x', label: 'Ex' },
      { value: 'y', label: 'y' },
    ])
  })

  it('treats nullable types as their base type', () => {
    expect(kindOf({ type: ['null', 'integer'] })).toBe('integer')
  })
})

describe('getAt / setAt', () => {
  it('creates containers on the way', () => {
    const data: Record<string, unknown> = {}
    setAt(data, ['users', 0, 'token'], 'abc')
    expect(data).toEqual({ users: [{ token: 'abc' }] })
    expect(getAt(data, ['users', 0, 'token'])).toBe('abc')
  })

  it('deletes object keys set to undefined', () => {
    const data: Record<string, unknown> = { a: 1, b: 2 }
    setAt(data, ['a'], undefined)
    expect(data).toEqual({ b: 2 })
  })

  it('escapes pointer segments', () => {
    expect(toPointer(['a/b', 0])).toBe('/a~1b/0')
  })
})

describe('validate', () => {
  it('fills defaults and reports required fields on the field itself', () => {
    const data: Record<string, unknown> = { users: [{ username: 'me' }] }
    const errors = validate(discord, data)
    expect(data.reconnectDelay).toBe(5)
    expect(errors.map((e) => e.pointer)).toEqual(
      expect.arrayContaining(['/clientid', '/users/0/token']),
    )
  })

  it('passes a valid config', () => {
    const data = { clientid: '12345678901234567', users: [{ username: 'me', token: 't' }] }
    expect(validate(discord, data)).toEqual([])
  })

  it('names nested fields by their titles', () => {
    expect(describePointer(discord, '/users/1/token')).toBe('User Tokens[1].Token')
  })
})

describe('evaluateRule', () => {
  const schema: JsonSchema = { properties: { mode: { type: 'string' } } }
  const rule = {
    effect: 'SHOW' as const,
    condition: { scope: '#/properties/mode', schema: { const: 'advanced' } },
  }

  it('shows only when the condition matches', () => {
    expect(evaluateRule(rule, schema, { mode: 'basic' }).visible).toBe(false)
    expect(evaluateRule(rule, schema, { mode: 'advanced' }).visible).toBe(true)
  })

  it('leaves elements without rules alone', () => {
    expect(evaluateRule(undefined, schema, {})).toEqual({ visible: true, enabled: true })
  })
})
