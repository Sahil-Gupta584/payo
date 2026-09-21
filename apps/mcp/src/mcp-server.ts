import './env.js' // must be first — loads dotenv before @repo/db initializes
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { db, apiKey, user as userTable, order, orderHistory, orderPaymentSession, walletHistory, userAddress, session as sessionTable, type User } from '@repo/db'
import { eq, desc, and, gte, sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { instamartCheckout } from './lib/solari/instamart.js'
import { blinkitCheckout } from './lib/solari/blinkit.js'
import { searchProducts, verifyProductPrice } from './lib/quickcommerce.js'
import { processOrderOtpPayment } from './lib/order-settlement.js'
import { env } from './env.js'

export async function resolveUserFromAuth(authHeader?: string | null, cookieHeader?: string | null): Promise<User | null> {
  let token = authHeader?.replace(/^Bearer\s+/i, '').trim()

  if (!token && cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => {
        const [k, ...v] = c.split('=')
        return [k, decodeURIComponent(v.join('='))]
      }),
    )
    token = cookies['better-auth.session_token'] || cookies['session_token']
  }

  if (!token) return null

  // 1. Try API key hash
  const hash = createHash('sha256').update(token).digest('hex')
  const [keyRow] = await db
    .select({ userId: apiKey.userId })
    .from(apiKey)
    .where(eq(apiKey.keyHash, hash))
    .limit(1)

  if (keyRow) {
    await db.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.keyHash, hash)).catch(() => { })
    const foundUser = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, keyRow.userId) })
    return foundUser ?? null
  }

  // 2. Try session token
  const sess = await db.query.session.findFirst({
    where: and(eq(sessionTable.token, token), gte(sessionTable.expiresAt, new Date())),
  })
  if (sess) {
    const foundUser = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, sess.userId) })
    return foundUser ?? null
  }

  return null
}

export function createServer(user: User | null) {
  const server = new McpServer({ name: 'payo', version: '0.2.0',description:"Give user the final results in good/table format for better view." })
  const unauthed = { content: [{ type: 'text' as const, text: 'Error: unauthorized. Please provide a valid Authorization: Bearer <API_KEY>.' }], isError: true as const }

  server.registerTool(
    'search_products',
    {
      title: 'Search products',
      description: 'Search products on Blinkit and Zepto. Returns up to 30 results (default 15) with id, name, price, availability, platform.',
      inputSchema: {
        query: z.string().trim().describe('e.g. diet coke, peanut butter'),
        address_id: z.string().trim().describe('ID of saved delivery address from list_addresses. Required because quick-commerce catalog and stock depend on the exact local dark store serving this address.'),
        platform: z.enum(['all', 'blinkit', 'zepto']).default('all').describe('Platform to search on. Use "all" to compare across Blinkit and Zepto.'),
        limit: z.number().int().min(1).max(30).optional().describe('Number of results to return (1-30, default 15)'),
      },
    },
    async ({ query, address_id, platform, limit }) => {
      if (!user) return unauthed

      const effectiveLimit = limit ?? 15

      let userAddr: typeof userAddress.$inferSelect | undefined
      try {
        userAddr = await db.query.userAddress.findFirst({
          where: and(eq(userAddress.userId, user.id), eq(userAddress.id, address_id)),
        })
      } catch {
        // invalid UUID or DB error — treat as not found
      }

      if (!userAddr) {
        const anyAddr = await db.query.userAddress.findFirst({
          where: eq(userAddress.userId, user.id),
        })
        const msg = anyAddr
          ? `Address '${address_id}' not found. Call list_addresses to get valid address IDs.`
          : `No delivery addresses found. Ask the user to add a delivery address in the Payo dashboard (Settings → Delivery Addresses) before searching products.`
        return {
          content: [{ type: 'text' as const, text: msg }],
          isError: true as const,
        }
      }

      const parsedLat = parseFloat(userAddr.latitude)
      const parsedLon = parseFloat(userAddr.longitude)
      if (isNaN(parsedLat) || isNaN(parsedLon)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Address '${userAddr.label}' does not have valid coordinates. Please update the address in the Payo dashboard with valid coordinates.`,
            },
          ],
          isError: true as const,
        }
      }

      // map agent-facing platform to QuickCommerce platform param
      const qcPlatform = platform === 'blinkit' ? 'blinkit' : platform === 'zepto' ? 'zepto' : 'all'
      const { products } = await searchProducts(query, qcPlatform as any, parsedLat, parsedLon)
      const { inrToUsdCents } = await import('./lib/currency.js')
      const results = await Promise.all(
        products.slice(0, effectiveLimit).map(async (p: any) => {
          const platName: string = p.platform?.name?.toLowerCase() ?? ''
          const platForOrder = platName === 'zepto' ? 'zepto' : 'blinkit'
          return {
            id: p.id,
            name: p.name,
            brand: p.brand,
            platform: platForOrder,
            store_id: p.store_id,
            mrp_inr: p.mrp,
            price_inr: p.offer_price,
            quantity: p.quantity,
            available: p.available,
            sla: p.platform?.sla,
            store_open: p.platform?.open ?? true,
          }
        }),
      )
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
        return { content: [{ type: 'text' as const, text: 'No delivery addresses saved yet. Please add one in the Payo dashboard under Settings → Delivery Addresses, then try again.' }] }
      }
      const formatted = addresses.map((a) => ({
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
    'initiate_order',
    {
      title: 'Initiate order',
      description: 'Place an order on Instamart or Blinkit. For card payment: checks wallet balance, runs browser automation, returns OTP prompt. For cod: places order directly via browser, no wallet needed.',
      inputSchema: {
        product_id: z.string().trim().describe('id from search_products'),
        product_name: z.string().trim(),
        platform: z.enum(['blinkit', 'zepto']).describe('Must match the platform field from search_products result. Passing the wrong platform will cause price verification to fail.'),
        payment_method: z.enum(['wallet', 'cod']).default('wallet').describe('wallet = pay from wallet balance (OTP required), cod = cash on delivery (pay at door)'),
        address_id: z.string().trim().describe('ID of saved address from list_addresses to deliver to (required)'),
      },
    },
    async ({ product_id, product_name, platform, payment_method, address_id }) => {
      if (!user) return unauthed

      const targetPlatform = platform ?? 'instamart'
      const pm = payment_method ?? 'wallet'

      const chosenAddress = await db.query.userAddress.findFirst({
        where: and(eq(userAddress.userId, user.id), eq(userAddress.id, address_id)),
      })

      if (!chosenAddress) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Address with ID '${address_id}' not found. Please use list_addresses to find a valid address ID, or add one in the Payo dashboard under Settings → Delivery Addresses.`,
            },
          ],
          isError: true,
        }
      }

      // Live verification of price and stock
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

      if (!priceVerification.verified || priceVerification.priceCents <= 0) {
        return {
          content: [{ type: 'text' as const, text: `❌ Could not verify price for "${product_name}". Please try again.` }],
          isError: true,
        }
      }

      const finalAmount = priceVerification.priceCents

      if (pm === 'wallet') {
        const freshUser = await db.query.user.findFirst({ where: eq(userTable.id, user.id) })
        const balance = freshUser?.balance ?? 0
        if (balance < finalAmount) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ Insufficient wallet balance.\n\nVerified Price: $${(finalAmount / 100).toFixed(2)}\nWallet Balance: $${(balance / 100).toFixed(2)}\nShortfall: $${((finalAmount - balance) / 100).toFixed(2)}\n\nPlease top up your wallet before initializing this order.`,
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
      let result
      if (targetPlatform === 'blinkit') {
        result = await blinkitCheckout(product_id, card, pm, addressPayload)
      } else if (targetPlatform === 'zepto') {
        const { zeptoCheckout } = await import('./lib/solari/zepto.js')
        if (!priceVerification.storeId || !priceVerification.mrpInr) {
          return { content: [{ type: 'text' as const, text: `❌ Could not resolve Zepto store details for "${product_name}". Please try again.` }], isError: true }
        }
        // sla is unreliable for real-time store status (QC cache may say "Closed" while store is open)
        // fall back to 10 min if unparseable
        const etaMatch = (priceVerification.sla || '').match(/(\d+)/)
        const storeEta = etaMatch ? parseInt(etaMatch[1], 10) : 10
        result = await zeptoCheckout(
          product_id,
          priceVerification.mrpInr,
          priceVerification.storeId,
          storeEta,
          {
            latitude: String(isNaN(lat) ? 19.1851092 : lat),
            longitude: String(isNaN(lon) ? 72.9949806 : lon),
            zeptoAddressId: process.env.ZEPTO_ADDRESS_ID ?? '',
          },
        )
      } else {
        result = await instamartCheckout(product_id, card, pm, addressPayload)
      }

      if (!result.success) {
        await db.update(order).set({ status: 'failed', errorMessage: result.error }).where(eq(order.id, orderId))
        return { content: [{ type: 'text' as const, text: `Order failed: ${result.error}` }], isError: true }
      }

      if (pm === 'cod') {
        // COD = user pays cash at delivery. Platform card is never charged.
        // Only deduct the automation service fee from wallet — NOT the order amount.
        const { getServiceFeeCents } = await import('./lib/currency.js')
        const serviceFeeCents = getServiceFeeCents(finalAmount)

        const freshUser = await db.query.user.findFirst({ where: eq(userTable.id, user.id) })
        const balance = freshUser?.balance ?? 0
        if (balance < serviceFeeCents) {
          await db.update(order).set({ status: 'failed', errorMessage: 'Insufficient balance for service fee' }).where(eq(order.id, orderId))
          return { content: [{ type: 'text' as const, text: `❌ Insufficient wallet balance for service fee.\n\nService fee: $${(serviceFeeCents / 100).toFixed(2)}\nWallet: $${(balance / 100).toFixed(2)}\n\nPlease top up at least $${(serviceFeeCents / 100).toFixed(2)} to place this order.` }], isError: true }
        }

        await db.transaction(async (tx) => {
          const [debited] = await tx.update(userTable)
            .set({ balance: sql`${userTable.balance} - ${serviceFeeCents}` })
            .where(and(eq(userTable.id, user.id), gte(userTable.balance, serviceFeeCents)))
            .returning()
          if (!debited) throw new Error('Insufficient balance')

          await tx.insert(walletHistory).values({ userId: user.id, amount: serviceFeeCents, type: 'debit', description: `Service fee - ${product_name} (COD)`, balanceAfter: debited.balance, referenceId: orderId })
          await tx.update(order).set({ status: 'confirmed' }).where(eq(order.id, orderId))
          await tx.insert(orderHistory).values({ id: orderId as any, userId: user.id, platform: targetPlatform, productId: product_id, productName: product_name, amount: finalAmount, status: 'confirmed', paymentMethod: pm })
        })

        const deliveryInfo = `\nDelivering to: ${chosenAddress.label} (${chosenAddress.recipientName} - ${chosenAddress.recipientPhone})\nAddress: ${chosenAddress.line1}, ${chosenAddress.city}`
        return { content: [{ type: 'text' as const, text: `✅ COD order placed!\n\nOrder ID: ${orderId}\nPlatform: ${targetPlatform}\nProduct: ${product_name} (₹ paid at delivery)${deliveryInfo}\nService fee: $${(serviceFeeCents / 100).toFixed(2)} debited from wallet.\nNew Balance: $${((balance - serviceFeeCents) / 100).toFixed(2)}` }] }
      }

      // Card — awaiting OTP
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
      const deliveryInfo = `\nDelivering to: ${chosenAddress.label} (${chosenAddress.recipientName} - ${chosenAddress.recipientPhone})\nAddress: ${chosenAddress.line1}, ${chosenAddress.city}`
      return { content: [{ type: 'text' as const, text: `Order initiated on ${targetPlatform} — OTP sent to your mobile number.\n\nOrder ID: ${orderId}\nProduct: ${product_name} ($${(finalAmount / 100).toFixed(2)})${deliveryInfo}\n\nTo complete the booking, please share the 6-digit OTP and I will confirm the order via confirm_order. OTP expires in 10min You can share!` }] }
    },
  )

  server.registerTool(
    'list_orders',
    {
      title: 'List orders',
      description: 'List recent orders for the authenticated user. Use query to filter by product name for reorder (e.g. "coke", "peanut butter"). Returns productId/productName/amount needed for initiate_order.',
      inputSchema: {
        query: z.string().trim().optional().describe('Filter by product name (e.g. "coke" to find last coke order for reorder)'),
        limit: z.number().int().min(1).max(20).optional().describe('Number of orders to return (default 10)'),
      },
    },
    async ({ query, limit }) => {
      if (!user) return unauthed
      const effectiveLimit = limit ?? 10
      const rows = query
        ? await db.query.orderHistory.findMany({
          where: (o, { and: a, eq: e, ilike }) => a(e(o.userId, user.id), ilike(o.productName, `%${query}%`)),
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
      const svcFee = result.serviceFeeCents ?? 0
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Order confirmed!\n\nOrder ID: ${order_id}\nOrder: $${(orderAmount / 100).toFixed(2)}\nService fee: $${(svcFee / 100).toFixed(2)}\nTotal debited: $${((orderAmount + svcFee) / 100).toFixed(2)}\nNew Wallet Balance: $${((result.newBalance ?? 0) / 100).toFixed(2)}`,
          },
        ],
      }
    },
  )

  return server
}

