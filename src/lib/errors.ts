import type { TFunction } from 'i18next'
import { en } from '@/i18n/locales/en'

type ErrorCode = keyof typeof en.errors.codes

function isErrorCode(value: string): value is ErrorCode {
  return value in en.errors.codes
}

/** A translated sentence for anything thrown by Supabase, Postgres or the network. */
export function errorMessage(error: unknown, t: TFunction): string {
  const { message = '', code = '' } = (error ?? {}) as { message?: string; code?: string }

  if (isErrorCode(message)) return t(`errors.codes.${message}`)

  switch (code) {
    case 'invalid_credentials':
      return t('errors.invalidCredentials')
    case 'email_not_confirmed':
      return t('errors.emailNotConfirmed')
    case 'user_already_exists':
    case 'email_exists':
      return t('errors.userExists')
    case 'weak_password':
      return t('errors.weakPassword')
    case 'same_password':
      return t('errors.samePassword')
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return t('errors.rateLimited')
  }

  // PostgREST: a column the app expects is missing because schema.sql has not been re-run.
  if (code === 'PGRST204') return t('errors.schemaOutdated')

  // Postgres: a row still referenced elsewhere (an Account or Category with Transactions).
  if (code === '23503') return t('errors.inUse')

  if (error instanceof TypeError && /fetch/i.test(message)) return t('errors.network')
  return t('errors.generic')
}
