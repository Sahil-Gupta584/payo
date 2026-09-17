import { z } from 'zod'
import { base } from '#/orpc/middleware'
import { db } from '#/db'
import { invite } from '#/db/schema'
import { eq } from 'drizzle-orm'

export const checkInvite = base
  .input(z.object({ email: z.string().trim().email() }))
  .handler(async ({ input }) => {
    const row = await db.query.invite.findFirst({
      where: eq(invite.email, input.email.toLowerCase().trim()),
    })
    return { allowed: !!row }
  })
