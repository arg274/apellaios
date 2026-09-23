// Persisted session credentials. The keys match the legacy React UI so an upgrade keeps users
// logged in, and they stay plain localStorage (not runes) because the HTTP layer reads them
// outside any component.
import type { AuthInfo } from '$lib/config'

const KEYS = [
  'token',
  'userId',
  'name',
  'username',
  'avatar',
  'role',
  'subsonic-salt',
  'subsonic-token',
  'is-authenticated',
] as const

const get = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const set = (key: string, value: string | undefined | null) => {
  try {
    if (value === undefined || value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage blocked: the session simply won't survive a reload
  }
}

export const session = {
  get token() {
    return get('token')
  },
  set token(value: string | null) {
    set('token', value)
  },
  get userId() {
    return get('userId')
  },
  set userId(value: string | null) {
    set('userId', value)
  },
  get username() {
    return get('username')
  },
  get name() {
    return get('name')
  },
  get avatar() {
    return get('avatar')
  },
  get isAdmin() {
    return get('role') === 'admin'
  },
  get isAuthenticated() {
    return get('is-authenticated') === 'true'
  },
  get subsonicSalt() {
    return get('subsonic-salt')
  },
  get subsonicToken() {
    return get('subsonic-token')
  },

  store(info: AuthInfo) {
    if (info.token) set('token', info.token)
    set('userId', info.id)
    set('name', info.name)
    set('username', info.username)
    if (info.avatar) set('avatar', info.avatar)
    set('role', info.isAdmin ? 'admin' : 'regular')
    set('subsonic-salt', info.subsonicSalt)
    set('subsonic-token', info.subsonicToken)
    set('is-authenticated', 'true')
  },

  clear() {
    for (const key of KEYS) set(key, null)
  },
}
