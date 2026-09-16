import DodoPayments from 'dodopayments'
import { env } from '#/env'

export const dodo = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY ?? 'placeholder',
  environment: env.DODO_PAYMENTS_ENVIRONMENT,
})
