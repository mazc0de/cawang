import { z } from 'zod'

export const emailSchema = z.email('validation.emailInvalid')
export const newPasswordSchema = z.string().min(8, 'validation.passwordMin')

export const newPasswordPairSchema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'validation.passwordMismatch',
  })
