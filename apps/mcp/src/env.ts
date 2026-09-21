import { config } from 'dotenv'
config()
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  SOLARI_API_KEY: z.string().min(1),
  SOLARI_PROFILE_ID: z.string().min(1),
  PLATFORM_CARD_NUMBER: z.string().min(1),
  PLATFORM_CARD_EXPIRY: z.string().min(1),
  PLATFORM_CARD_CVV: z.string().min(1),
  QUICKCOMMERCE_API_KEY: z.string().min(1),
  ZEPTO_CARD_INSTRUMENT_CODE: z.string().min(1),
})

export const env = envSchema.parse({
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  SOLARI_API_KEY: process.env.SOLARI_API_KEY,
  SOLARI_PROFILE_ID:
    process.env.SOLARI_PROFILE_ID ??
    process.env.INSTAMART_PROFILE_ID ??
    process.env.FLIPKART_PROFILE_ID,
  PLATFORM_CARD_NUMBER: process.env.PLATFORM_CARD_NUMBER,
  PLATFORM_CARD_EXPIRY: process.env.PLATFORM_CARD_EXPIRY,
  PLATFORM_CARD_CVV: process.env.PLATFORM_CARD_CVV,
  QUICKCOMMERCE_API_KEY: process.env.QUICKCOMMERCE_API_KEY,
  ZEPTO_CARD_INSTRUMENT_CODE: process.env.ZEPTO_CARD_INSTRUMENT_CODE,
})
