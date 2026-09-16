import { z } from 'zod'
import { base } from '#/orpc/middleware'
import { env } from '#/env'

export const joinWaitlist = base
  .input(z.object({ email: z.string().email() }))
  .handler(async ({ input }) => {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(env.RESEND_API_KEY)
      await Promise.all([
        resend.emails.send({
          from: 'Payo <noreply@payo.ai>',
          to: input.email,
          subject: "You're on the Payo waitlist",
          html: `<p>Hey,</p><p>You're on the waitlist for <strong>Payo</strong> — we'll reach out when your spot is ready.</p><p>— Payo team</p>`,
        }),
      ])
    } catch {
      // silently continue even if email fails
    }
    return { success: true }
  })
