import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { handleMcpRequest } from '#/utils/mcp-handler'
import { auth } from '#/lib/auth'
import { db } from '#/db'
import { apiKey, user as userTable, order, orderHistory, orderPaymentSession, userAddress } from '#/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { instamartCheckout } from '#/lib/solari/instamart'
import { blinkitCheckout } from '#/lib/solari/blinkit'
import { searchProducts, verifyProductPrice } from '#/lib/quickcommerce'
import { phoneSchema, pincodeSchema, latitudeSchema, longitudeSchema } from '#/orpc/router/addresses'
import { processOrderOtpPayment } from '#/lib/order-settlement'
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
  const server = new McpServer({ name: 'payo', version: '0.1.0' })

  const unauthed = { content: [{ type: 'text' as const, text: 'Error: unauthorized' }], isError: true as const }

  server.registerTool(
    'search_products',
    {
      title: 'Search products',
      description: 'Search products on Swiggy Instamart and Blinkit. Returns up to 30 results (default 15) with id, name, price, availability, platform.',
      inputSchema: {
        query: z.string().trim().describe('e.g. diet coke, peanut butter'),
        platform: z.enum(['swiggy', 'blinkit', 'all']).default('all').describe('Filter platform: swiggy, blinkit, or all (default all)'),
        limit: z.number().int().min(1).max(30).default(15).describe('Number of results to return (1-30, default 15)'),
        address_id: z.string().trim().optional().describe('ID of saved address to search nearby dark stores for. If not provided, uses your first saved address.'),
      },
    },
    async ({ query, platform, limit, address_id }) => {
      const effectiveLimit = limit ?? 15

      // Dynamically locate user's local dark store using their saved delivery address
      let userLat: number | undefined
      let userLon: number | undefined
      if (user) {
        const userAddr = address_id
          ? await db.query.userAddress.findFirst({
              where: and(eq(userAddress.userId, user.id), eq(userAddress.id, address_id)),
            })
          : await db.query.userAddress.findFirst({
              where: eq(userAddress.userId, user.id),
              orderBy: [desc(userAddress.createdAt)],
            })
        if (userAddr?.latitude && userAddr?.longitude) {
          const parsedLat = parseFloat(userAddr.latitude)
          const parsedLon = parseFloat(userAddr.longitude)
          if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
            userLat = parsedLat
            userLon = parsedLon
          }
        }
      }

      const { products } = await searchProducts(
        query,
        platform ?? 'all',
        userLat ?? 19.1851092,
        userLon ?? 72.9949806,
      )
      const results = products.slice(0, effectiveLimit).map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        platform: p.platform?.name?.toLowerCase() === 'swiggy' ? 'instamart' : (p.platform?.name?.toLowerCase() || 'instamart'),
        price: `$${p.offer_price}`,
        mrp: `$${p.mrp}`,
        quantity: p.quantity,
        available: p.available,
      }))
      console.log(JSON.stringify({ query, platform, limit: effectiveLimit, count: results.length }))
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
      const row = await db.query.user.findFirst({ where: eq(userTable.id, user.id) })
      return { content: [{ type: 'text' as const, text: `Wallet balance: $${((row?.balance ?? 0) / 100).toFixed(2)}` }] }
    },
  )

  server.registerTool(
    'list_addresses',
    {
      title: 'List saved delivery addresses',
      description: 'List all delivery addresses saved for this user (e.g. Home, Office). Returns id, label, recipientName, phone, and address.',
      inputSchema: {},
    },
    async () => {
      if (!user) return unauthed
      const addresses = await db.query.userAddress.findMany({
        where: eq(userAddress.userId, user.id),
        orderBy: [desc(userAddress.createdAt)],
      })
      if (addresses.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No delivery addresses saved yet. Use save_address to add one.' }] }
      }
      const formatted = addresses.map(a => ({
        id: a.id,
        label: a.label,
        recipient_name: a.recipientName,
        recipient_phone: a.recipientPhone,
        address: [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', '),
      }))
      return { content: [{ type: 'text' as const, text: JSON.stringify(formatted, null, 2) }] }
    },
  )

  server.registerTool(
    'save_address',
    {
      title: 'Save delivery address',
      description: 'Save a new delivery address for the user (e.g. Home, Office) with recipient name and mobile number for the delivery driver.',
      inputSchema: {
        label: z.string().trim().default('Home').describe('Label for this address: e.g. Home, Office, Parents'),
        recipient_name: z.string().trim().describe('Full name of the person receiving the order'),
        recipient_phone: phoneSchema.describe('Mobile number for the delivery driver to call'),
        line1: z.string().trim().describe('House/flat number, building name, street'),
        line2: z.string().trim().optional().describe('Area, colony, locality'),
        landmark: z.string().trim().optional().describe('Nearby landmark'),
        city: z.string().trim().describe('City (e.g. Navi Mumbai, Thane, Mumbai, Bangalore)'),
        state: z.string().trim().describe('State (e.g. Maharashtra, Karnataka)'),
        pincode: pincodeSchema.describe('6-digit postal pincode'),
        latitude: latitudeSchema.describe('Latitude coordinates (e.g. "19.1851092")'),
        longitude: longitudeSchema.describe('Longitude coordinates (e.g. "72.9949806")'),
      },
    },
    async (args) => {
      if (!user) return unauthed

      const [newAddr] = await db.insert(userAddress).values({
        userId: user.id,
        label: args.label || 'Home',
        recipientName: args.recipient_name,
        recipientPhone: args.recipient_phone,
        line1: args.line1,
        line2: args.line2 ?? null,
        landmark: args.landmark ?? null,
        city: args.city,
        state: args.state,
        pincode: args.pincode,
        latitude: args.latitude,
        longitude: args.longitude,
      }).returning()

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Address saved!\n\nID: ${newAddr?.id}\nLabel: ${newAddr?.label}\nRecipient: ${newAddr?.recipientName} (${newAddr?.recipientPhone})\nAddress: ${[newAddr?.line1, newAddr?.line2, newAddr?.city, newAddr?.pincode].filter(Boolean).join(', ')}`,
          },
        ],
      }
    },
  )

  server.registerTool(
    'initiate_order',
    {
      title: 'Initiate order',
      description: 'Place an order on Instamart or Blinkit. For card payment: checks wallet balance, runs browser automation, returns OTP prompt. For cod: places order directly via browser, no wallet needed.',
      inputSchema: {
        product_id: z.string().trim().describe('id from search_products'),
        product_name: z.string().trim(),
        platform: z.enum(['instamart', 'blinkit']).default('instamart').describe('Platform: instamart or blinkit (default instamart)'),
        amount: z.number().int().positive().describe('price in cents ($1 = 100)'),
        payment_method: z.enum(['card', 'cod']).default('card').describe('card = charge wallet via card (requires OTP), cod = cash on delivery (no wallet needed)'),
        address_id: z.string().trim().describe('ID of saved address from list_addresses to deliver to (required)'),
      },
    },
    async ({ product_id, product_name, platform, amount, payment_method, address_id }) => {
      if (!user) return unauthed

      const targetPlatform = platform ?? 'instamart'
      const pm = payment_method ?? 'card'

      // Resolve delivery address from database
      const chosenAddress = await db.query.userAddress.findFirst({
        where: and(eq(userAddress.userId, user.id), eq(userAddress.id, address_id)),
      })

      if (!chosenAddress) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Address with ID '${address_id}' not found. Please use list_addresses to find a valid address ID or save_address to save a new one.`,
            },
          ],
          isError: true,
        }
      }

      // Verify product price & live availability via QuickCommerce API
      const lat = chosenAddress.latitude ? parseFloat(chosenAddress.latitude) : 19.1851092
      const lon = chosenAddress.longitude ? parseFloat(chosenAddress.longitude) : 72.9949806
      const priceVerification = await verifyProductPrice(
        product_id,
        product_name,
        targetPlatform,
        isNaN(lat) ? 19.1851092 : lat,
        isNaN(lon) ? 72.9949806 : lon,
        chosenAddress.pincode || undefined,
      )

      if (priceVerification.verified && !priceVerification.available) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ Product "${product_name}" is currently OUT OF STOCK on ${targetPlatform} for your address (${chosenAddress.label}). Please select another item.`,
            },
          ],
          isError: true,
        }
      }

      // Use authoritative verified price in cents if available, otherwise fallback to provided amount
      const finalAmount =
        priceVerification.verified && priceVerification.priceCents > 0
          ? priceVerification.priceCents
          : amount

      // Strict wallet balance check for card payments
      if (pm === 'card') {
        const freshUser = await db.query.user.findFirst({ where: eq(userTable.id, user.id) })
        const balance = freshUser?.balance ?? 0
        if (balance < finalAmount) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ Insufficient wallet balance.\n\nVerified Price: $${(finalAmount / 100).toFixed(2)}\nWallet Balance: $${(balance / 100).toFixed(2)}\nShortfall: $${((finalAmount - balance) / 100).toFixed(2)}\n\nPlease top up your wallet at /topup before initializing this order.`,
              },
            ],
            isError: true,
          }
        }
      }

      const orderId = crypto.randomUUID()
      await db.insert(order).values({
        id: orderId,
        userId: user.id,
        platform: targetPlatform,
        productId: product_id,
        productName: priceVerification.matchedName || product_name,
        amount: finalAmount,
        status: 'pending',
        paymentMethod: pm,
      })

      const addressPayload = {
        recipientName: chosenAddress.recipientName,
        recipientPhone: chosenAddress.recipientPhone,
        line1: chosenAddress.line1,
        line2: chosenAddress.line2,
        landmark: chosenAddress.landmark,
        city: chosenAddress.city,
        state: chosenAddress.state,
        pincode: chosenAddress.pincode,
        latitude: chosenAddress.latitude,
        longitude: chosenAddress.longitude,
      }

      const card = { number: env.PLATFORM_CARD_NUMBER, expiry: env.PLATFORM_CARD_EXPIRY, cvv: env.PLATFORM_CARD_CVV }
      const result = targetPlatform === 'blinkit'
        ? await blinkitCheckout(product_id, card, pm, addressPayload)
        : await instamartCheckout(product_id, card, pm, addressPayload)

      if (!result.success) {
        await db.update(order).set({ status: 'failed', errorMessage: result.error }).where(eq(order.id, orderId))
        return { content: [{ type: 'text' as const, text: `Order failed: ${result.error}` }], isError: true }
      }

      if (pm === 'cod') {
        await db.update(order).set({ status: 'confirmed' }).where(eq(order.id, orderId))
        await db.insert(orderHistory).values({ id: orderId as any, userId: user.id, platform: targetPlatform, productId: product_id, productName: product_name, amount: finalAmount, status: 'confirmed', paymentMethod: pm })
        const deliveryInfo = chosenAddress ? `\nDelivering to: ${chosenAddress.label} (${chosenAddress.recipientName} - ${chosenAddress.recipientPhone})\nAddress: ${chosenAddress.line1}, ${chosenAddress.city}` : ''
        return { content: [{ type: 'text' as const, text: `✅ COD order placed!\n\nOrder ID: ${orderId}\nPlatform: ${targetPlatform}\nProduct: ${product_name} ($${(finalAmount / 100).toFixed(2)})${deliveryInfo}\nPayment: Cash on Delivery — pay when the delivery arrives.` }] }
      }

      // card — awaiting OTP
      await db.update(order).set({ status: 'awaiting_otp' }).where(eq(order.id, orderId))
      if (result.sbiFields) {
        await db.insert(orderPaymentSession).values({
          orderId,
          sbiTransactionId: result.sbiFields.transactionIdentifier,
          sbiNonce: result.sbiFields.nonce,
          sbiTimestamp: result.sbiFields.timestamp,
          sbiSignature: result.sbiFields.signature,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        })
        await db.insert(orderHistory).values({ id: orderId as any, userId: user.id, platform: targetPlatform, productId: product_id, productName: product_name, amount: finalAmount, status: 'awaiting_otp', paymentMethod: pm })
      }
      const deliveryInfo = chosenAddress ? `\nDelivering to: ${chosenAddress.label} (${chosenAddress.recipientName} - ${chosenAddress.recipientPhone})\nAddress: ${chosenAddress.line1}, ${chosenAddress.city}` : ''
      return { content: [{ type: 'text' as const, text: `Order initiated on ${targetPlatform} — OTP sent to your mobile number.\n\nOrder ID: ${orderId}\nProduct: ${product_name} ($${(finalAmount / 100).toFixed(2)})${deliveryInfo}\n\nTo complete the booking, please share the 6-digit OTP and I will confirm the order via confirm_order.` }] }
    },
  )

  server.registerTool(
    'list_orders',
    {
      title: 'List orders',
      description: 'List recent orders for the authenticated user. Use query to filter by product name for reorder (e.g. "coke", "peanut butter"). Returns productId/productName/amount needed for initiate_order.',
      inputSchema: {
        query: z.string().trim().optional().describe('Filter by product name (e.g. "coke" to find last coke order for reorder)'),
        limit: z.number().int().min(1).max(20).default(10).describe('Number of orders to return (default 10)'),
      },
    },
    async ({ query, limit }) => {
      if (!user) return unauthed
      const effectiveLimit = limit ?? 10
      // prefer orderHistory (clean history), fallback to order
      const rows = query
        ? await db.query.orderHistory.findMany({
          where: (o, { and, eq: e, ilike }) => and(e(o.userId, user.id), ilike(o.productName, `%${query}%`)),
          orderBy: desc(orderHistory.createdAt),
          limit: effectiveLimit,
        })
        : await db.query.orderHistory.findMany({ where: eq(orderHistory.userId, user.id), orderBy: desc(orderHistory.createdAt), limit: effectiveLimit })
      const compact = rows.map((r: any) => ({ id: r.id, productId: r.productId, productName: r.productName, amount: `$${(r.amount / 100).toFixed(2)}`, amountCents: r.amount, status: r.status, createdAt: r.createdAt }))
      return { content: [{ type: 'text' as const, text: JSON.stringify(compact, null, 2) }] }
    },
  )

  server.registerTool(
    'confirm_order',
    {
      title: 'Confirm order with OTP',
      description: 'Submit the 6-digit OTP received on your mobile to complete the payment. Debits wallet on success.',
      inputSchema: {
        order_id: z.string().trim().describe('order_id returned by initiate_order'),
        otp: z.string().trim().length(6).describe('6-digit OTP from your bank SMS'),
      },
    },
    async ({ order_id, otp }) => {
      if (!user) return unauthed

      const result = await processOrderOtpPayment({
        orderId: order_id,
        otp,
        userId: user.id,
      })

      if (!result.success) {
        return { content: [{ type: 'text' as const, text: `Payment failed: ${result.error}` }], isError: true }
      }

      const orderAmount = result.order?.amount ?? 0
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Order confirmed!\n\nOrder ID: ${order_id}\nAmount: $${(orderAmount / 100).toFixed(2)} debited from wallet.\nNew Wallet Balance: $${((result.newBalance ?? 0) / 100).toFixed(2)}`,
          },
        ],
      }
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
