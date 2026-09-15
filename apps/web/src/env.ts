import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),
    SOLARI_API_KEY: z.string().min(1),
    FLIPKART_PROFILE_ID: z.string().min(1),
    INSTAMART_PROFILE_ID: z.string().min(1),
    PLATFORM_CARD_NUMBER: z.string().min(1),
    PLATFORM_CARD_EXPIRY: z.string().min(1),
    PLATFORM_CARD_CVV: z.string().min(1),
    QUICKCOMMERCE_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    SENTRY_AUTH_TOKEN: z.string().optional(),
  },
  clientPrefix: 'VITE_',
  client: {
    VITE_SENTRY_DSN: z.string().optional(),
    VITE_SENTRY_ORG: z.string().optional(),
    VITE_SENTRY_PROJECT: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    SOLARI_API_KEY: process.env.SOLARI_API_KEY,
    FLIPKART_PROFILE_ID: process.env.FLIPKART_PROFILE_ID,
    INSTAMART_PROFILE_ID: process.env.INSTAMART_PROFILE_ID,
    PLATFORM_CARD_NUMBER: process.env.PLATFORM_CARD_NUMBER,
    PLATFORM_CARD_EXPIRY: process.env.PLATFORM_CARD_EXPIRY,
    PLATFORM_CARD_CVV: process.env.PLATFORM_CARD_CVV,
    QUICKCOMMERCE_API_KEY: process.env.QUICKCOMMERCE_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_SENTRY_ORG: import.meta.env.VITE_SENTRY_ORG,
    VITE_SENTRY_PROJECT: import.meta.env.VITE_SENTRY_PROJECT,
  },
  emptyStringAsUndefined: true,
})
