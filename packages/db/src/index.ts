import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

export * from './schema'
export { schema }

export function createDb(databaseUrl: string = process.env.DATABASE_URL!) {
  return drizzle(databaseUrl, { schema })
}

export const db = drizzle(process.env.DATABASE_URL!, { schema })
