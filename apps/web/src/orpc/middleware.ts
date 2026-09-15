import { os } from '@orpc/server'
import { ORPCError } from '@orpc/client'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { db } from '#/db'
import { apiKey } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import type { User } from '#/db/schema'

export interface ORPCContext {
  headers: Headers | Record<string, string>
}

export interface AuthedContext extends ORPCContext {
  user: User
}

export const base = os.$context<ORPCContext>()

export const authed = base.use(async ({ context, next }) => {
  const headers = getRequestHeaders()

  // Try session cookie first
  const session = await auth.api.getSession({ headers })
  if (session?.user) {
    return next({ context: { ...context, user: session.user as User } })
  }

  // Fall back to Bearer API key (for MCP clients)
  const rawHeader = headers instanceof Headers ? headers.get('authorization') : (headers as unknown as Record<string, string>)['authorization']
  const token = rawHeader?.replace('Bearer ', '').trim()
  if (token) {
    const hash = createHash('sha256').update(token).digest('hex')
    const [key] = await db.select({ userId: apiKey.userId }).from(apiKey).where(eq(apiKey.keyHash, hash)).limit(1)
    if (key) {
      const [foundUser] = await db.query.user.findMany({ where: (u, { eq }) => eq(u.id, key.userId), limit: 1 })
      if (foundUser) {
        // update last used async, don't block
        db.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.keyHash, hash)).catch(() => {})
        return next({ context: { ...context, user: foundUser } })
      }
    }
  }

  throw new ORPCError('UNAUTHORIZED')
})
