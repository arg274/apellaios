import type { UserInput } from '$lib/api/native'
import { t } from '$lib/i18n/index.svelte'

export type UserErrors = Partial<
  Record<
    | 'userName'
    | 'name'
    | 'email'
    | 'password'
    | 'currentPassword'
    | 'libraryIds'
    | 'scrobbleFilter',
    string
  >
>

// react-admin's email() rule, which the server's data was validated against so far
const EMAIL =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

/** Client-side checks; the server re-validates passwords, uniqueness and filter semantics */
export function validateUser(
  u: UserInput,
  opts: {
    requireUserName: boolean
    requirePassword: boolean
    requireCurrentPassword: boolean
    checkLibraries: boolean
  },
): UserErrors {
  const errors: UserErrors = {}
  const required = t('ra.validation.required')
  if (opts.requireUserName && !u.userName?.trim()) errors.userName = required
  if (!u.name?.trim()) errors.name = required
  if (u.email?.trim() && !EMAIL.test(u.email.trim())) errors.email = t('ra.validation.email')
  if (opts.requirePassword && !u.password) errors.password = required
  if (opts.requireCurrentPassword && !u.currentPassword) errors.currentPassword = required
  if (opts.checkLibraries && !u.isAdmin && !u.libraryIds?.length) {
    errors.libraryIds = t('resources.user.validation.librariesRequired')
  }
  if (u.scrobbleFilter?.trim()) {
    try {
      JSON.parse(u.scrobbleFilter)
    } catch {
      errors.scrobbleFilter = t('resources.user.validation.invalidScrobbleFilter')
    }
  }
  return errors
}

/** Server messages are i18n keys; translate them for display */
export const translateErrors = (errors: Record<string, string>): UserErrors =>
  Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v, { _: v })]))
