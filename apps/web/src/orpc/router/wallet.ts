import { z } from 'zod'
import { authed } from '#/orpc/middleware'
import { db } from '#/db'
import { user } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { dodo } from '#/lib/dodo'
import { env } from '#/env'

export const getWalletBalance = authed.handler(async ({ context }) => {
  const row = await db.query.user.findFirst({ where: eq(user.id, context.user.id) })
  return { balance: row?.balance ?? 0 }
})

export const createWalletCheckout = authed
  .input(
    z.object({
      amount: z.number().int().positive().describe('Amount in cents (e.g. 500 = $5.00)'),
      returnUrl: z.string().url(),
    }),
  )
  .handler(async ({ input, context }) => {
    const productId = env.DODO_PAYMENTS_WALLET_PRODUCT_ID
    if (!productId) throw new Error('DODO_PAYMENTS_WALLET_PRODUCT_ID not configured')
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1, amount: input.amount }],
      customer: { email: context.user.email, name: context.user.name ?? undefined },
      return_url: input.returnUrl,
      metadata: { userId: context.user.id, type: 'wallet_topup', amount: String(input.amount) },
    } as any)
    return { url: (session as any).checkout_url ?? (session as any).url ?? null, sessionId: (session as any).session_id }
  })

// Legacy direct topup (no payment) — keep for testing, use createWalletCheckout in prod
export const topupWallet = authed
  .input(z.object({ amount: z.number().int().positive() }))
  .handler(async ({ input, context }) => {
    const row = await db.query.user.findFirst({ where: eq(user.id, context.user.id) })
    const newBalance = (row?.balance ?? 0) + input.amount
    const [updated] = await db.update(user).set({ balance: newBalance }).where(eq(user.id, context.user.id)).returning()
    const { walletHistory } = await import('#/db/schema')
    await db.insert(walletHistory).values({ userId: context.user.id, amount: input.amount, type: 'credit', description: 'Wallet topup (direct)', balanceAfter: newBalance })
    return updated
  })
