import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { handleMcpRequest } from '#/utils/mcp-handler'
import { auth } from '#/lib/auth'
import { db } from '#/db'
import { apiKey } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { searchProducts } from '#/lib/quickcommerce'
import { flipkartCheckout } from '#/lib/solari/flipkart'
import { instamartAddToCart } from '#/lib/solari/instamart'
import { wallet, order } from '#/db/schema'
import { env } from '#/env'

async function resolveUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (session?.user) return session.user

  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return null

  const hash = createHash('sha256').update(token).digest('hex')
  const [key] = await db.select({ userId: apiKey.userId }).from(apiKey).where(eq(apiKey.keyHash, hash)).limit(1)
  if (!key) return null

  return db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, key.userId) })
}

const server = new McpServer({ name: 'shop-mcp', version: '0.1.0' })

server.registerTool(
  'search_products',
  {
    title: 'Search products',
    description: 'Search products on Flipkart or Instamart. Returns up to 5 results with id, name, price, availability.',
    inputSchema: {
      query: z.string().describe('e.g. diet coke, peanut butter'),
      platform: z.enum(['flipkart', 'instamart']),
    },
  },
  async ({ query, platform }) => {
    const qcPlatform = platform === 'instamart' ? 'Swiggy' : 'Flipkart'
    const { products } = await searchProducts(query, qcPlatform)
    const top5 = products.slice(0, 5).map((p: any) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: `₹${p.offer_price}`,
      mrp: `₹${p.mrp}`,
      quantity: p.quantity,
      available: p.available,
    }))
    return { content: [{ type: 'text', text: JSON.stringify(top5, null, 2) }] }
  },
)

server.registerTool(
  'get_wallet_balance',
  {
    title: 'Get wallet balance',
    description: 'Returns the current wallet balance for the authenticated user.',
    inputSchema: {},
  },
  async (_input, extra) => {
    const user = await resolveUser((extra as any)._meta?.request as Request ?? (extra as any).meta?.request as Request)
    if (!user) return { content: [{ type: 'text', text: 'Error: unauthorized' }], isError: true }
    const row = await db.query.wallet.findFirst({ where: eq(wallet.userId, user.id) })
    return { content: [{ type: 'text', text: `Wallet balance: ₹${((row?.balancePaise ?? 0) / 100).toFixed(2)}` }] }
  },
)

server.registerTool(
  'initiate_order',
  {
    title: 'Initiate order',
    description: 'Place an order on Flipkart or Instamart. Checks wallet balance, runs browser automation, returns OTP page details when ready.',
    inputSchema: {
      platform: z.enum(['flipkart', 'instamart']),
      product_id: z.string().describe('id from search_products'),
      product_name: z.string(),
      amount_paise: z.number().int().positive().describe('price in paise (₹1 = 100 paise)'),
    },
  },
  async ({ platform, product_id, product_name, amount_paise }, extra) => {
    const user = await resolveUser((extra as any)._meta?.request as Request ?? (extra as any).meta?.request as Request)
    if (!user) return { content: [{ type: 'text', text: 'Error: unauthorized' }], isError: true }

    const userWallet = await db.query.wallet.findFirst({ where: eq(wallet.userId, user.id) })
    if (!userWallet || userWallet.balancePaise < amount_paise) {
      return { content: [{ type: 'text', text: `Insufficient balance. Have ₹${((userWallet?.balancePaise ?? 0) / 100).toFixed(2)}, need ₹${(amount_paise / 100).toFixed(2)}` }], isError: true }
    }

    const orderId = crypto.randomUUID()
    const card = { number: env.PLATFORM_CARD_NUMBER, expiry: env.PLATFORM_CARD_EXPIRY, cvv: env.PLATFORM_CARD_CVV }

    await db.insert(order).values({ id: orderId, userId: user.id, platform, productId: product_id, productName: product_name, amountPaise: amount_paise, status: 'pending' })

    if (platform === 'flipkart') {
      const result = await flipkartCheckout(product_id, card)
      await db.update(order).set({ status: result.success ? 'awaiting_otp' : 'failed', solariSessionId: result.sessionId, otpPageUrl: result.otpPageUrl, errorMessage: result.error }).where(eq(order.id, orderId))
      if (!result.success) return { content: [{ type: 'text', text: `Order failed: ${result.error}` }], isError: true }
      return { content: [{ type: 'text', text: `Order initiated. OTP sent to your bank-registered mobile.\n\nOrder ID: ${orderId}\n\nOTP page: ${result.otpPageUrl}\n\nPage text: ${result.otpPageText}` }] }
    }

    if (platform === 'instamart') {
      const result = await instamartAddToCart(product_id)
      await db.update(order).set({ status: result.success ? 'awaiting_otp' : 'failed', solariSessionId: result.sessionId, errorMessage: result.error }).where(eq(order.id, orderId))
      if (!result.success) return { content: [{ type: 'text', text: `Order failed: ${result.error}` }], isError: true }
      return { content: [{ type: 'text', text: `Added to Instamart cart. Checkout automation pending.\n\nOrder ID: ${orderId}` }] }
    }

    return { content: [{ type: 'text', text: 'Unknown platform' }], isError: true }
  },
)

server.registerTool(
  'list_orders',
  {
    title: 'List orders',
    description: 'List recent orders for the authenticated user.',
    inputSchema: {},
  },
  async (_input, extra) => {
    const user = await resolveUser((extra as any)._meta?.request as Request ?? (extra as any).meta?.request as Request)
    if (!user) return { content: [{ type: 'text', text: 'Error: unauthorized' }], isError: true }
    const orders = await db.query.order.findMany({ where: eq(order.userId, user.id), limit: 10 })
    return { content: [{ type: 'text', text: JSON.stringify(orders, null, 2) }] }
  },
)

export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      POST: async ({ request }) => handleMcpRequest(request, server),
    },
  },
})
