import { z } from 'zod'
import { authed } from '#/orpc/middleware'
import { db } from '#/db'
import { user, walletHistory } from '#/db/schema'
import { eq, desc } from 'drizzle-orm'
import { dodo } from '#/lib/dodo'
import { env } from '#/env'

export const getWalletBalance = authed.handler(async ({ context }) => {
  const row = await db.query.user.findFirst({ where: eq(user.id, context.user.id) })
  return { balance: row?.balance ?? 0 }
})

export const getWalletHistory = authed.handler(async ({ context }) => {
  return db.query.walletHistory.findMany({
    where: eq(walletHistory.userId, context.user.id),
    orderBy: desc(walletHistory.createdAt),
    limit: 50,
  })
})

export const createWalletCheckout = authed
  .input(
    z.object({
      amount: z.number().int().positive().describe('Amount in cents (e.g. 500 = $5.00)'),
      returnUrl: z.string().trim().url(),
    }),
  )
  .handler(async ({ input, context }) => {
    const productId = env.DODO_PAYMENTS_WALLET_PRODUCT_ID
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1, amount: input.amount }],
      customer: { email: context.user.email, name: context.user.name ?? undefined },
      return_url: input.returnUrl,
      metadata: { userId: context.user.id, type: 'wallet_topup', amount: String(input.amount) },
    } as any)
    return { url: (session as any).checkout_url ?? (session as any).url ?? null, sessionId: (session as any).session_id }
  })

// Legacy / dev direct topup (instantly credits balance)
export const topupWallet = authed
  .input(z.object({ amount: z.number().int().positive() }))
  .handler(async ({ input, context }) => {
    const row = await db.query.user.findFirst({ where: eq(user.id, context.user.id) })
    const newBalance = (row?.balance ?? 0) + input.amount
    const [updated] = await db.update(user).set({ balance: newBalance }).where(eq(user.id, context.user.id)).returning()
    await db.insert(walletHistory).values({
      userId: context.user.id,
      amount: input.amount,
      type: 'credit',
      description: 'Wallet topup (instant)',
      balanceAfter: newBalance,
    })
    return updated
  })
