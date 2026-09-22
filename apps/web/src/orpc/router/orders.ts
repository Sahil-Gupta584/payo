import { z } from 'zod'
import { authed } from '#/orpc/middleware'
import { db } from '#/db'
import { order, orderHistory } from '#/db/schema'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'

export const getSpent = authed.handler(async ({ context }) => {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${orderHistory.amount}), 0)` })
    .from(orderHistory)
    .where(and(eq(orderHistory.userId, context.user.id), eq(orderHistory.status, 'confirmed')))
  return { spent: Number(row?.total ?? 0) }
})

export const listOrders = authed.handler(async ({ context }) => {
  const live = await db.query.order.findMany({
    where: and(
      eq(order.userId, context.user.id),
      inArray(order.status, ['pending', 'awaiting_otp']),
    ),
    orderBy: desc(order.createdAt),
  })

  // Past orders from orderHistory (or fallback to order table if orderHistory is empty)
  const history = await db.query.orderHistory.findMany({
    where: eq(orderHistory.userId, context.user.id),
    orderBy: desc(orderHistory.createdAt),
    limit: 50,
  })

  const past = history.length > 0
    ? history
    : await db.query.order.findMany({
        where: and(
          eq(order.userId, context.user.id),
          inArray(order.status, ['confirmed', 'failed', 'cancelled']),
        ),
        orderBy: desc(order.createdAt),
        limit: 50,
      })

  return { live, past }
})

import { processOrderOtpPayment } from '#/lib/order-settlement'

export const submitOrderOtp = authed
  .input(
    z.object({
      orderId: z.string().trim(),
      otp: z.string().trim().length(6),
    }),
  )
  .handler(async ({ input, context }) => {
    const res = await processOrderOtpPayment({
      orderId: input.orderId,
      otp: input.otp,
      userId: context.user.id,
    })

    if (!res.success) {
      throw new Error(res.error || 'Payment failed')
    }

    return { success: true, newBalance: res.newBalance }
  })
