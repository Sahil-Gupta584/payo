import { z } from 'zod'
import { authed } from '#/orpc/middleware'
import { db } from '#/db'
import { wallet } from '#/db/schema'
import { eq } from 'drizzle-orm'

export const getWalletBalance = authed.handler(async ({ context }) => {
  const row = await db.query.wallet.findFirst({ where: eq(wallet.userId, context.user.id) })
  return { balance: row?.balance ?? 0 }
})

export const topupWallet = authed
  .input(z.object({ amount: z.number().int().positive() }))
  .handler(async ({ input, context }) => {
    const existing = await db.query.wallet.findFirst({ where: eq(wallet.userId, context.user.id) })
    if (existing) {
      const [updated] = await db
        .update(wallet)
        .set({ balance: existing.balance + input.amount })
        .where(eq(wallet.userId, context.user.id))
        .returning()
      return updated
    }
    const [created] = await db
      .insert(wallet)
      .values({ id: crypto.randomUUID(), userId: context.user.id, balance: input.amount })
      .returning()
    return created
  })
