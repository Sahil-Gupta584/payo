import { z } from 'zod'
import { base } from '#/orpc/middleware'
import { db } from '#/db'
import { invite, user } from '#/db/schema'
import { eq } from 'drizzle-orm'

export const checkInvite = base
  .input(
    z.object({
      email: z.string().trim().email(),
      name: z.string().trim().optional(),
    }),
  )
  .handler(async ({ input }) => {
    const cleanEmail = input.email.toLowerCase().trim()
    const row = await db.query.invite.findFirst({
      where: eq(invite.email, cleanEmail),
    })

    if (row && input.name) {
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, cleanEmail),
      })
      if (existingUser && (!existingUser.name || existingUser.name.includes('@') || existingUser.name.trim() !== input.name)) {
        await db.update(user).set({ name: input.name }).where(eq(user.id, existingUser.id))
      }
    }

    return { allowed: !!row }
  })
