import { z } from 'zod'
import { authed } from '#/orpc/middleware'
import { db } from '#/db'
import { order, wallet } from '#/db/schema'
import { eq, desc } from 'drizzle-orm'
import { searchProducts } from '#/lib/quickcommerce'
import { flipkartCheckout } from '#/lib/solari/flipkart'
import { instamartAddToCart } from '#/lib/solari/instamart'

export const searchShop = authed
  .input(z.object({
    query: z.string().min(1),
    platform: z.enum(['flipkart', 'instamart']),
  }))
  .handler(async ({ input }) => {
    const qcPlatform = input.platform === 'instamart' ? 'Swiggy' : 'Flipkart'
    const { products, creditsRemaining } = await searchProducts(input.query, qcPlatform)
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
    amountPaise: z.number().int().positive(),
  }))
  .handler(async ({ input, context }) => {
    // Check wallet balance
    const userWallet = await db.query.wallet.findFirst({ where: eq(wallet.userId, context.user.id) })
    if (!userWallet || userWallet.balancePaise < input.amountPaise) {
      throw new Error(`Insufficient balance. Have ₹${((userWallet?.balancePaise ?? 0) / 100).toFixed(2)}, need ₹${(input.amountPaise / 100).toFixed(2)}`)
    }

    const orderId = crypto.randomUUID()
    const platformCard = {
      number: process.env.PLATFORM_CARD_NUMBER!,
      expiry: process.env.PLATFORM_CARD_EXPIRY!,
      cvv: process.env.PLATFORM_CARD_CVV!,
    }

    // Create order as pending
    const [newOrder] = await db.insert(order).values({
      id: orderId,
      userId: context.user.id,
      platform: input.platform,
      productId: input.productId,
      productName: input.productName,
      amountPaise: input.amountPaise,
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
      const result = await instamartAddToCart(input.productId)
      const [updated] = await db.update(order)
        .set({
          status: result.success ? 'awaiting_otp' : 'failed',
          solariSessionId: result.sessionId,
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
