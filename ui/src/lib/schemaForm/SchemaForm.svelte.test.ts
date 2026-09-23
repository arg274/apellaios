import { fireEvent, render as mount, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'
import WithProviders from '$lib/test/WithProviders.svelte'
import SchemaForm from './SchemaForm.svelte'
import type { JsonSchema, UiElement } from './schema'

// The Discord Rich Presence example plugin's config, which exercises detail layouts in arrays
const schema: JsonSchema = {
  type: 'object',
  properties: {
    clientid: { type: 'string', title: 'Discord Application Client ID', pattern: '^[0-9]+$' },
    users: {
      type: 'array',
      title: 'User Tokens',
      items: {
        type: 'object',
        properties: {
          username: { type: 'string', title: 'Navidrome Username', minLength: 1 },
          token: { type: 'string', title: 'Discord Token', minLength: 1 },
        },
        required: ['username', 'token'],
      },
    },
    logPrices: { type: 'boolean', title: 'Log Prices', default: false },
    level: {
      type: 'string',
      title: 'Level',
      oneOf: [
        { const: 'info', title: 'Info' },
        { const: 'debug', title: 'Debug' },
      ],
    },
  },
  required: ['clientid'],
}

// SchemaForm's controls use tooltips, which need the app's provider
const render = (props: Record<string, unknown>) =>
  mount(WithProviders, { props: { component: SchemaForm as never, props } })

const uiSchema: UiElement = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/clientid' },
    {
      type: 'Control',
      scope: '#/properties/users',
      options: {
        elementLabelProp: 'username',
        detail: {
          type: 'HorizontalLayout',
          elements: [
            { type: 'Control', scope: '#/properties/username' },
            { type: 'Control', scope: '#/properties/token', options: { format: 'password' } },
          ],
        },
      },
    },
    { type: 'Control', scope: '#/properties/logPrices' },
  ],
}

describe('SchemaForm', () => {
  it('renders controls with their titles and existing values', () => {
    render({
      schema,
      uiSchema,
      value: { clientid: '123', users: [{ username: 'me', token: 'x' }] },
    })
    expect(screen.getByLabelText(/Discord Application Client ID/)).toHaveValue('123')
    expect(screen.getByLabelText(/Navidrome Username/)).toHaveValue('me')
    expect(screen.getByLabelText(/Discord Token/)).toHaveAttribute('type', 'password')
    // The array item is titled by its elementLabelProp
    expect(screen.getByText('me', { selector: 'span' })).toBeInTheDocument()
  })

  it('reports edits with validation errors', async () => {
    const onchange = vi.fn()
    render({ schema, uiSchema, value: {}, onchange })
    await fireEvent.input(screen.getByLabelText(/Discord Application Client ID/), {
      target: { value: 'abc' },
    })
    const [data, errors] = onchange.mock.lastCall!
    expect(data).toMatchObject({ clientid: 'abc', logPrices: false })
    expect(errors.map((e: { pointer: string }) => e.pointer)).toContain('/clientid')
    expect(screen.getAllByText(/must match pattern/).length).toBeGreaterThan(0)
  })

  it('adds array items and flags their required fields', async () => {
    const onchange = vi.fn()
    render({ schema, uiSchema, value: { clientid: '1' }, onchange })
    await fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    const [data, errors] = onchange.mock.lastCall!
    expect(data.users).toEqual([{}])
    expect(errors.map((e: { pointer: string }) => e.pointer)).toEqual(
      expect.arrayContaining(['/users/0/username', '/users/0/token']),
    )
  })

  it('falls back to a generated layout without a UI schema', () => {
    render({ schema, value: {} })
    expect(screen.getByText('Level')).toBeInTheDocument()
    expect(screen.getByLabelText(/Log Prices/)).toBeInTheDocument()
  })
})
