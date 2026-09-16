import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db'
import { user, walletHistory } from '#/db/schema'
import { dodo } from '#/lib/dodo'
import { eq, sql } from 'drizzle-orm'

async function handle({ request }: { request: Request }) {
  try {
    const body = await request.text()
    const headersObj: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headersObj[key] = value
    })

    let event: any
    try {
      event = (dodo as any).webhooks.unwrap(body, { headers: headersObj })
    } catch (err) {
      console.error('[dodo webhook] signature verification failed:', err)
      return new Response('Invalid signature', { status: 401 })
    }

    console.log('[dodo webhook] event:', event.type)

    if (event.type === 'payment.succeeded') {
      const data = event.data
      const userId = data.metadata?.userId as string | undefined
      const amountStr = data.metadata?.amount as string | undefined
      // fallback: total_amount in smallest denomination (cents)
      const totalAmount = Number(data.total_amount ?? data.amount ?? amountStr ?? 0)

      if (!userId) {
        console.warn('[dodo webhook] payment.succeeded missing userId in metadata')
        return new Response('ok', { status: 200 })
      }

      // Idempotency: check if already credited for this payment_id
      const paymentId = data.payment_id as string | undefined
      if (paymentId) {
        const existing = await db.query.walletHistory.findFirst({ where: eq(walletHistory.referenceId, paymentId) })
        if (existing) {
          console.log('[dodo webhook] already processed', paymentId)
          return new Response('ok', { status: 200 })
        }
      }

      const amount = totalAmount > 0 ? totalAmount : Number(amountStr ?? 0)
      if (amount <= 0) {
        console.warn('[dodo webhook] invalid amount', data)
        return new Response('ok', { status: 200 })
      }

      // Credit user balance atomically
      await db.update(user).set({ balance: sql`${user.balance} + ${amount}` }).where(eq(user.id, userId))
      const updated = await db.query.user.findFirst({ where: eq(user.id, userId) })

      await db.insert(walletHistory).values({
        userId,
        amount,
        type: 'credit',
        description: 'Wallet topup via Dodo',
        balanceAfter: updated?.balance ?? null,
        referenceId: paymentId ?? null,
      })

      console.log(`[dodo webhook] credited ${amount} to ${userId}, new balance ${updated?.balance}`)
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[dodo webhook] error:', err)
    return new Response('Internal error', { status: 500 })
  }
}

export const Route = createFileRoute('/api/webhook/dodo')({
  server: {
    handlers: {
      POST: handle,
    },
  },
})
