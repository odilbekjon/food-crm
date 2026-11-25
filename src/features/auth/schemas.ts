import { z } from 'zod'
import type { TFn } from '@/i18n/core'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const emailSchema = (t: TFn) => z.string().trim().regex(EMAIL_PATTERN, t('auth.err.email'))

export const phoneSchema = (t: TFn) =>
  z
    .string()
    .trim()
    .refine(
      (value) => /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, '').length >= 9 && value.replace(/\D/g, '').length <= 12,
      { message: t('auth.err.phone') },
    )

/** Kamida 8 ta belgi, kamida bitta harf va bitta raqam. */
export const newPasswordSchema = (t: TFn) =>
  z
    .string()
    .min(8, t('auth.err.passwordWeak'))
    .regex(/\p{L}/u, t('auth.err.passwordWeak'))
    .regex(/\d/, t('auth.err.passwordWeak'))

export const loginSchema = (t: TFn) =>
  z.object({
    email: emailSchema(t),
    password: z.string().min(1, t('auth.err.passwordRequired')),
  })
export type LoginValues = z.infer<ReturnType<typeof loginSchema>>

export const signupSchema = (t: TFn) =>
  z
    .object({
      name: z.string().trim().min(2, t('auth.err.name')),
      storeName: z.string().trim().min(2, t('auth.err.store')),
      phone: phoneSchema(t),
      email: emailSchema(t),
      password: newPasswordSchema(t),
      confirm: z.string(),
      terms: z.boolean().refine((value) => value, { message: t('auth.err.terms') }),
    })
    .refine((values) => values.password === values.confirm, { path: ['confirm'], message: t('auth.err.confirm') })
export type SignupValues = z.infer<ReturnType<typeof signupSchema>>
