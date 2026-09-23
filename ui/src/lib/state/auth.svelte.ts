import { jwtDecode } from 'jwt-decode'
import config, { type AuthInfo } from '$lib/config'
import { HttpError, http, setUnauthorizedHandler } from '$lib/api/http'
import { session } from '$lib/api/session'
import { librarySelection } from './library.svelte'

export interface Identity {
  id: string
  username: string
  name: string
  avatar: string | null
  isAdmin: boolean
}

const readIdentity = (): Identity | null =>
  session.isAuthenticated
    ? {
        id: session.userId ?? '',
        username: session.username ?? '',
        name: session.name ?? '',
        avatar: session.avatar,
        isAdmin: session.isAdmin,
      }
    : null

class AuthState {
  user = $state<Identity | null>(null)

  constructor() {
    // A reverse proxy may have authenticated the request that served index.html
    if (config.auth) {
      try {
        session.store(config.auth)
      } catch (e) {
        console.error(e)
      }
    }
    this.user = readIdentity()
    setUnauthorizedHandler(() => this.#expire())
  }

  get isAuthenticated() {
    return this.user !== null
  }

  get isAdmin() {
    return this.user?.isAdmin ?? false
  }

  /** Logs in, or creates the first admin when the server has no users yet */
  async login(username: string, password: string) {
    const path = config.firstTime ? '/auth/createAdmin' : '/auth/login'
    try {
      const { json } = await http<AuthInfo>(path, { method: 'POST', body: { username, password } })
      jwtDecode(json.token ?? '') // reject a malformed token before storing anything
      session.store(json)
      config.firstTime = false
      this.user = readIdentity()
    } catch (e) {
      if (e instanceof HttpError && e.status === 0)
        throw new Error('errors.network_error', { cause: e })
      if (e instanceof HttpError && e.status === 401)
        throw new Error('ra.auth.sign_in_error', { cause: e })
      throw e
    }
  }

  logout() {
    const redirect = config.extAuthLogoutURL && config.auth
    this.#clear()
    // Only proxy-authenticated sessions go to the IdP; direct logins get the login form
    if (redirect) window.location.href = config.extAuthLogoutURL!
  }

  #expire() {
    if (this.user) this.#clear()
  }

  #clear() {
    session.clear()
    librarySelection.reset()
    this.user = null
  }
}

export const auth = new AuthState()
