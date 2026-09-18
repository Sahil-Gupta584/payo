import { db, order, orderHistory, orderPaymentSession, walletHistory, user as userTable } from '@repo/db'
import { eq, and, sql, gte } from 'drizzle-orm'
import { submitOtpDirect } from './solari/sbi-otp.js'
import { getServiceFeeCents } from './currency.js'

export type ProcessOtpResult = {
  success: boolean
  newBalance?: number
  serviceFeeCents?: number
  order?: typeof order.$inferSelect
  error?: string
}

/**
 * Centrally validates wallet balance, submits OTP to the bank,
 * and atomically debits the user's wallet upon bank success.
 */
export async function processOrderOtpPayment({
  orderId,
  otp,
  userId,
}: {
  orderId: string
  otp: string
  userId: string
}): Promise<ProcessOtpResult> {
  // 1. Verify order exists and belongs to user
  const existing = await db.query.order.findFirst({
    where: and(eq(order.id, orderId), eq(order.userId, userId)),
  })
  if (!existing) {
    return { success: false, error: 'Order not found' }
  }
  if (existing.status !== 'awaiting_otp') {
    return { success: false, error: `Order status is '${existing.status}', not awaiting_otp` }
  }

  // 2. Verify active OTP payment session
  const session = await db.query.orderPaymentSession.findFirst({
    where: eq(orderPaymentSession.orderId, orderId),
  })
  if (!session) {
    return { success: false, error: 'OTP session expired or not found' }
  }
  if (new Date(session.expiresAt) < new Date()) {
    await db.delete(orderPaymentSession).where(eq(orderPaymentSession.orderId, orderId))
    return { success: false, error: 'OTP session expired (10m). Please re-initiate order.' }
  }

  // 3. Immediate pre-flight wallet balance check BEFORE charging the bank
  const freshUser = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
  })
  const currentBalance = freshUser?.balance ?? 0
  const serviceFeeCents = getServiceFeeCents(existing.amount)
  const totalDue = existing.amount + serviceFeeCents
  if (currentBalance < totalDue) {
    return {
      success: false,
      error: `Insufficient wallet balance. Have $${(currentBalance / 100).toFixed(2)}, need $${(totalDue / 100).toFixed(2)} (order $${(existing.amount / 100).toFixed(2)} + $${(serviceFeeCents / 100).toFixed(2)} service fee). Please top up your wallet.`,
    }
  }

  // 4. Submit OTP to bank
  const bankResult = await submitOtpDirect(
    {
      transactionIdentifier: session.sbiTransactionId,
      nonce: session.sbiNonce,
      timestamp: session.sbiTimestamp,
      signature: session.sbiSignature,
    },
    otp,
  )

  if (!bankResult.success) {
    await db
      .update(order)
      .set({ status: 'failed', errorMessage: bankResult.error })
      .where(eq(order.id, orderId))
    return { success: false, error: bankResult.error || 'Bank payment failed' }
  }

  // 5. Bank succeeded -> Atomic wallet debit & order confirmation
  try {
    const updatedUser = await db.transaction(async (tx) => {
      // Atomic debit with gte guard to prevent race conditions & negative balances
      const [debited] = await tx
        .update(userTable)
        .set({ balance: sql`${userTable.balance} - ${totalDue}` })
        .where(and(eq(userTable.id, userId), gte(userTable.balance, totalDue)))
        .returning()

      if (!debited) {
        throw new Error('Insufficient wallet balance to complete transaction')
      }

      await tx.insert(walletHistory).values({
        userId,
        amount: existing.amount,
        type: 'debit',
        description: `Order ${existing.productName}`,
        balanceAfter: debited.balance! + serviceFeeCents,
        referenceId: orderId,
      })

      await tx.insert(walletHistory).values({
        userId,
        amount: serviceFeeCents,
        type: 'debit',
        description: `Service fee - ${existing.productName}`,
        balanceAfter: debited.balance,
        referenceId: orderId,
      })

      await tx.update(order).set({ status: 'confirmed' }).where(eq(order.id, orderId))
      await tx
        .update(orderHistory)
        .set({ status: 'confirmed' })
        .where(eq(orderHistory.id, orderId as any))
      await tx.delete(orderPaymentSession).where(eq(orderPaymentSession.orderId, orderId))

      return debited
    })

    return {
      success: true,
      newBalance: updatedUser.balance ?? 0,
      serviceFeeCents,
      order: existing,
    }
  } catch (err: any) {
    console.error('[processOrderOtpPayment] Settlement error:', err)
    return { success: false, error: err?.message || 'Failed to settle wallet debit' }
  }
}
