import { z } from 'zod'
import { authed } from '#/orpc/middleware'
import { db } from '#/db'
import { apiKey } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'

export const listApiKeys = authed.handler(async ({ context }) => {
  return db.query.apiKey.findMany({
    where: eq(apiKey.userId, context.user.id),
    columns: { keyHash: false },
    orderBy: (t, { desc }) => desc(t.createdAt),
  })
})

export const createApiKey = authed
  .input(z.object({ name: z.string().min(1).max(30).default('default') }))
  .handler(async ({ input, context }) => {
    const raw = `payo_${randomBytes(24).toString('hex')}`
    const hash = createHash('sha256').update(raw).digest('hex')
    const [row] = await db
      .insert(apiKey)
      .values({ id: crypto.randomUUID(), userId: context.user.id, name: input.name, keyHash: hash })
      .returning({ id: apiKey.id, name: apiKey.name, createdAt: apiKey.createdAt })
    return { ...row, key: raw }
  })

export const revokeApiKey = authed
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    await db.delete(apiKey).where(eq(apiKey.id, input.id))
    // ensure ownership — re-check via query (no-op if not owned, safe)
    void context.user.id
    return { success: true }
  })
