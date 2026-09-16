import { z } from 'zod'
import { authed } from '#/orpc/middleware'
import { db } from '#/db'
import { order, wallet } from '#/db/schema'
import { eq, desc } from 'drizzle-orm'
import { searchProducts } from '#/lib/quickcommerce'
import { flipkartCheckout } from '#/lib/solari/flipkart'
import { instamartCheckout } from '#/lib/solari/instamart'
import { submitSbiOtp } from '#/lib/solari/sbi-otp'
import { env } from '#/env'

export const searchShop = authed
  .input(z.object({
    query: z.string().min(1),
  }))
  .handler(async ({ input }) => {
    const { products, creditsRemaining } = await searchProducts(input.query)
    return {
      products: products.slice(0, 5).map((p: any) => ({
        id: p.id as string,
        name: p.name as string,
        brand: p.brand as string,
        price: Number(p.offer_price),
        mrp: Number(p.mrp),
        quantity: p.quantity as string,
        rating: p.rating as number | null,
        available: p.available as boolean,
        deeplink: p.deeplink as string,
      })),
      creditsRemaining,
    }
  })

export const initiateOrder = authed
  .input(z.object({
    platform: z.enum(['flipkart', 'instamart']),
    productId: z.string(),
    productName: z.string(),
    amount: z.number().int().positive(),
  }))
  .handler(async ({ input, context }) => {
    const userWallet = await db.query.wallet.findFirst({ where: eq(wallet.userId, context.user.id) })
    if (!userWallet || userWallet.balance < input.amount) {
      throw new Error(`Insufficient balance. Have $${((userWallet?.balance ?? 0) / 100).toFixed(2)}, need $${(input.amount / 100).toFixed(2)}`)
    }

    const orderId = crypto.randomUUID()
    const platformCard = {
      number: env.PLATFORM_CARD_NUMBER,
      expiry: env.PLATFORM_CARD_EXPIRY,
      cvv: env.PLATFORM_CARD_CVV,
    }

    // Create order as pending
    const [newOrder] = await db.insert(order).values({
      id: orderId,
      userId: context.user.id,
      platform: input.platform,
      productId: input.productId,
      productName: input.productName,
      amount: input.amount,
      status: 'pending',
    }).returning()

    // Run checkout async per platform
    if (input.platform === 'flipkart') {
      const result = await flipkartCheckout(input.productId, platformCard)
      const [updated] = await db.update(order)
        .set({
          status: result.success ? 'awaiting_otp' : 'failed',
          solariSessionId: result.sessionId,
          otpPageUrl: result.otpPageUrl,
          errorMessage: result.error,
        })
        .where(eq(order.id, orderId))
        .returning()
      return updated
    }

    if (input.platform === 'instamart') {
      const card = { number: env.PLATFORM_CARD_NUMBER, expiry: env.PLATFORM_CARD_EXPIRY, cvv: env.PLATFORM_CARD_CVV }
      const result = await instamartCheckout(input.productId, card, input.amount / 100)
      const [updated] = await db.update(order)
        .set({
          status: result.success ? 'awaiting_otp' : 'failed',
          solariSessionId: result.sessionId,
          sbiTransactionId: result.sbiFields?.transactionIdentifier,
          sbiNonce: result.sbiFields?.nonce,
          sbiTimestamp: result.sbiFields?.timestamp,
          sbiSignature: result.sbiFields?.signature,
          errorMessage: result.error,
        })
        .where(eq(order.id, orderId))
        .returning()
      return updated
    }

    return newOrder
  })

export const listOrders = authed.handler(async ({ context }) => {
  return db.query.order.findMany({
    where: eq(order.userId, context.user.id),
    orderBy: desc(order.createdAt),
    limit: 20,
  })
})

export const confirmOrder = authed
  .input(z.object({
    orderId: z.string(),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  }))
  .handler(async ({ input, context }) => {
    const existing = await db.query.order.findFirst({ where: eq(order.id, input.orderId) })
    if (!existing) throw new Error('Order not found')
    if (existing.userId !== context.user.id) throw new Error('Unauthorized')
    if (existing.status !== 'awaiting_otp') throw new Error(`Order is not awaiting OTP — status: ${existing.status}`)
    if (!existing.otpPageUrl) throw new Error('No OTP page URL stored for this order')

    const profileId = existing.platform === 'flipkart' ? env.FLIPKART_PROFILE_ID : env.INSTAMART_PROFILE_ID
    const result = await submitSbiOtp(existing.otpPageUrl, input.otp, profileId)

    if (!result.success) {
      await db.update(order).set({ status: 'failed', errorMessage: result.error }).where(eq(order.id, input.orderId))
      throw new Error(`OTP failed: ${result.error}`)
    }

    // debit wallet
    const userWallet = await db.query.wallet.findFirst({ where: eq(wallet.userId, context.user.id) })
    if (userWallet) {
      await db.update(wallet)
        .set({ balance: Math.max(0, userWallet.balance - existing.amount) })
        .where(eq(wallet.userId, context.user.id))
    }

    const [confirmed] = await db.update(order)
      .set({ status: 'confirmed' })
      .where(eq(order.id, input.orderId))
      .returning()

    return confirmed
  })
