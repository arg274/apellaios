import { jwtDecode } from 'jwt-decode'
import config from '$lib/config'
import { baseUrl } from '$lib/utils/urls'
import { session } from './session'

const AUTH_HEADER = 'X-ND-Authorization'
export const CLIENT_ID_HEADER = 'X-ND-Client-Unique-Id'
/**
 * A v4 UUID. crypto.randomUUID only exists in secure contexts, and Navidrome is often reached
 * over plain http on a LAN address, so fall back to getRandomValues, which has no such limit.
 */
export const uuid = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Identifies this tab to the server, so it can skip echoing our own events back to us */
export const clientUniqueId = uuid()

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export interface HttpResponse<T> {
  status: number
  headers: Headers
  json: T
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler = () => {}

/** Lets the auth state react to an expired session without the HTTP layer importing it */
export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  onUnauthorized = handler
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | object | null
  /** Skip prefixing the configured BasePath (the url is already absolute or pre-built) */
  raw?: boolean
}

const isPlainBody = (body: unknown): body is object =>
  body !== null &&
  typeof body === 'object' &&
  !(body instanceof FormData) &&
  !(body instanceof Blob) &&
  !(body instanceof URLSearchParams) &&
  !(body instanceof ArrayBuffer)

export async function http<T = unknown>(
  url: string,
  { body, raw, headers: extraHeaders, ...init }: RequestOptions = {},
): Promise<HttpResponse<T>> {
  const headers = new Headers(extraHeaders)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  headers.set(CLIENT_ID_HEADER, clientUniqueId)
  const token = session.token
  if (token) headers.set(AUTH_HEADER, `Bearer ${token}`)

  let payload: BodyInit | null | undefined
  if (isPlainBody(body)) {
    headers.set('Content-Type', 'application/json')
    payload = JSON.stringify(body)
  } else {
    payload = body as BodyInit | null | undefined
  }

  let response: Response
  try {
    response = await fetch(raw ? url : baseUrl(url), { ...init, headers, body: payload })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new HttpError('errors.network_error', 0, null)
  }

  // The server slides the session by returning a refreshed token on each call
  const renewed = response.headers.get(AUTH_HEADER)
  if (renewed) {
    try {
      const claims = jwtDecode<{ uid?: string }>(renewed)
      session.token = renewed
      if (claims.uid) session.userId = claims.uid
      // A token means a user exists, so never offer the "create admin" form again
      config.firstTime = false
    } catch {
      // Malformed token: keep the old one
    }
  }

  const text = await response.text()
  let json: unknown = undefined
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = text
    }
  }

  if (response.status < 200 || response.status >= 300) {
    if (response.status === 401) onUnauthorized()
    const body = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
    const message =
      (body.message ? String(body.message) : '') ||
      (body.error ? String(body.error) : '') ||
      response.statusText ||
      `HTTP ${response.status}`
    throw new HttpError(message, response.status, json)
  }

  return { status: response.status, headers: response.headers, json: json as T }
}

/** Per-field messages (usually i18n keys) from a server-side validation failure, if that's what `err` is */
export const validationErrors = (err: unknown): Record<string, string> | null => {
  if (!(err instanceof HttpError)) return null
  const errors = (err.body as { errors?: unknown } | null)?.errors
  return errors && typeof errors === 'object' ? (errors as Record<string, string>) : null
}
