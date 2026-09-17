import { z } from 'zod'
import { authed } from '#/orpc/middleware'
import { db } from '#/db'
import { user } from '#/db/schema'
import { eq } from 'drizzle-orm'

export const updateName = authed
  .input(
    z.object({
      name: z.string().trim().min(1, 'Name cannot be empty').max(100),
    }),
  )
  .handler(async ({ input, context }) => {
    const [updated] = await db
      .update(user)
      .set({ name: input.name })
      .where(eq(user.id, context.user.id))
      .returning()

    return { success: true, name: updated?.name }
  })
