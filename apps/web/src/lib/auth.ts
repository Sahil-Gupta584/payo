import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '#/db'
import * as schema from '#/db/schema'
import { env } from '#/env'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const allowed = await db.query.invite.findFirst({
            where: (inv, { eq }) => eq(inv.email, user.email),
          })
          if (!allowed) {
            throw new Error('This email is not on the invite list.')
          }
          return { data: user }
        },
      },
    },
  },
  plugins: [
    tanstackStartCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { Resend } = await import('resend')
        const resend = new Resend(env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'auth@chatcash.live',
          to: email,
          subject: 'Your Payi login link',
          html: `<p>Click below to sign in to Payi:</p><a href="${url}">${url}</a>`,
        })
      },
    }),
  ],
})
