import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { handleMcpRequest } from '#/utils/mcp-handler'
import { auth } from '#/lib/auth'
import { db } from '#/db'
import { apiKey, wallet, order } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { instamartCheckout } from '#/lib/solari/instamart'
import { searchProducts } from '#/lib/quickcommerce'
import { env } from '#/env'

type ResolvedUser = Awaited<ReturnType<typeof resolveUser>>

async function resolveUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (session?.user) return session.user

  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return null

  const hash = createHash('sha256').update(token).digest('hex')
  const [key] = await db.select({ userId: apiKey.userId }).from(apiKey).where(eq(apiKey.keyHash, hash)).limit(1)
  if (!key) return null

  return db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, key.userId) }) ?? null
}

function createServer(user: ResolvedUser) {
  const server = new McpServer({ name: 'payi', version: '0.1.0' })

  const unauthed = { content: [{ type: 'text' as const, text: 'Error: unauthorized' }], isError: true as const }

  server.registerTool(
    'search_products',
    {
      title: 'Search products',
      description: 'Search products on Swiggy Instamart. Returns up to 30 results (default 15) with id, name, price, availability.',
      inputSchema: {
        query: z.string().describe('e.g. diet coke, peanut butter'),
        limit: z.number().int().min(1).max(30).default(15).describe('Number of results to return (1-30, default 15)'),
      },
    },
    async ({ query, limit }) => {
      const effectiveLimit = limit ?? 15
      const { products } = await searchProducts(query)
      const results = products.slice(0, effectiveLimit).map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        price: `$${p.offer_price}`,
        mrp: `$${p.mrp}`,
        quantity: p.quantity,
        available: p.available,
      }))
      console.log(JSON.stringify({ query, limit: effectiveLimit, count: results.length }))
      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] }
    },
  )

  server.registerTool(
    'get_wallet_balance',
    {
      title: 'Get wallet balance',
      description: 'Returns the current wallet balance for the authenticated user.',
      inputSchema: {},
    },
    async () => {
      if (!user) return unauthed
      const row = await db.query.wallet.findFirst({ where: eq(wallet.userId, user.id) })
      return { content: [{ type: 'text' as const, text: `Wallet balance: $${((row?.balance ?? 0) / 100).toFixed(2)}` }] }
    },
  )

  server.registerTool(
    'initiate_order',
    {
      title: 'Initiate order',
      description: 'Place an order on Instamart. Checks wallet balance, runs browser automation.',
      inputSchema: {
        product_id: z.string().describe('id from search_products'),
        product_name: z.string(),
        amount: z.number().int().positive().describe('price in cents ($1 = 100)'),
      },
    },
    async ({ product_id, product_name, amount }) => {
      if (!user) return unauthed

      const userWallet = await db.query.wallet.findFirst({ where: eq(wallet.userId, user.id) })
      if (!userWallet || userWallet.balance < amount) {
        return { content: [{ type: 'text' as const, text: `Insufficient balance. Have $${((userWallet?.balance ?? 0) / 100).toFixed(2)}, need $${(amount / 100).toFixed(2)}` }], isError: true }
      }

      const orderId = crypto.randomUUID()
      await db.insert(order).values({ id: orderId, userId: user.id, platform: 'instamart', productId: product_id, productName: product_name, amount, status: 'pending' })

      const card = { number: env.PLATFORM_CARD_NUMBER, expiry: env.PLATFORM_CARD_EXPIRY, cvv: env.PLATFORM_CARD_CVV }
      const amountInr = amount / 100
      const result = await instamartCheckout(product_id, card, amountInr)
      await db.update(order).set({
        status: result.success ? 'awaiting_otp' : 'failed',
        solariSessionId: result.sessionId,
        sbiTransactionId: result.sbiFields?.transactionIdentifier,
        sbiNonce: result.sbiFields?.nonce,
        sbiTimestamp: result.sbiFields?.timestamp,
        sbiSignature: result.sbiFields?.signature,
        errorMessage: result.error,
      }).where(eq(order.id, orderId))
      if (!result.success) return { content: [{ type: 'text' as const, text: `Order failed: ${result.error}` }], isError: true }
      return { content: [{ type: 'text' as const, text: `Order initiated — OTP sent to your mobile number.\n\nOrder ID: ${orderId}\nProduct: ${product_name} ($${(amount / 100).toFixed(2)})\n\nTo complete the booking, please share the 6-digit OTP and I will confirm the order via confirm_order.` }] }
    },
  )

  server.registerTool(
    'list_orders',
    {
      title: 'List orders',
      description: 'List recent orders for the authenticated user.',
      inputSchema: {},
    },
    async () => {
      if (!user) return unauthed
      const orders = await db.query.order.findMany({ where: eq(order.userId, user.id), limit: 10 })
      return { content: [{ type: 'text' as const, text: JSON.stringify(orders, null, 2) }] }
    },
  )

  server.registerTool(
    'confirm_order',
    {
      title: 'Confirm order with OTP',
      description: 'Submit the 6-digit OTP received on your mobile to complete the payment. Debits wallet on success.',
      inputSchema: {
        order_id: z.string().describe('order_id returned by initiate_order'),
        otp: z.string().length(6).describe('6-digit OTP from your bank SMS'),
      },
    },
    async ({ order_id, otp }) => {
      if (!user) return unauthed

      const existing = await db.query.order.findFirst({ where: eq(order.id, order_id) })
      if (!existing || existing.userId !== user.id) return { content: [{ type: 'text' as const, text: 'Error: order not found' }], isError: true }
      if (existing.status !== 'awaiting_otp') return { content: [{ type: 'text' as const, text: `Error: order status is '${existing.status}', not awaiting_otp` }], isError: true }
      if (!existing.sbiTransactionId || !existing.sbiNonce || !existing.sbiTimestamp || !existing.sbiSignature) {
        return { content: [{ type: 'text' as const, text: 'Error: SBI payment fields not found for this order' }], isError: true }
      }

      const { submitOtpDirect } = await import('#/lib/solari/sbi-otp.js')
      const result = await submitOtpDirect({
        transactionIdentifier: existing.sbiTransactionId,
        nonce: existing.sbiNonce,
        timestamp: existing.sbiTimestamp,
        signature: existing.sbiSignature,
      }, otp)

      if (!result.success) {
        await db.update(order).set({ status: 'failed', errorMessage: result.error }).where(eq(order.id, order_id))
        return { content: [{ type: 'text' as const, text: `Payment failed: ${result.error}` }], isError: true }
      }

      const userWallet = await db.query.wallet.findFirst({ where: eq(wallet.userId, user.id) })
      if (userWallet) {
        await db.update(wallet).set({ balance: Math.max(0, userWallet.balance - existing.amount) }).where(eq(wallet.userId, user.id))
      }
      await db.update(order).set({ status: 'confirmed' }).where(eq(order.id, order_id))

      return { content: [{ type: 'text' as const, text: `✅ Order confirmed!\n\nOrder ID: ${order_id}\nAmount: $${(existing.amount / 100).toFixed(2)} debited from wallet.` }] }
    },
  )

  return server
}

export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await resolveUser(request)
        return handleMcpRequest(request, createServer(user))
      },
    },
  },
})
