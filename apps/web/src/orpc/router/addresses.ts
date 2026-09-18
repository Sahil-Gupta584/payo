import { z } from 'zod'
import { authed } from '#/orpc/middleware'
import { db } from '#/db'
import { userAddress } from '#/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// Shared validators — also used by MCP save_address
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,13}$/, 'Enter a valid mobile number (10-13 digits, optional leading +)')
export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits')
const coordSchema = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (v) => {
        const n = Number(v)
        return Number.isFinite(n) && n >= min && n <= max
      },
      `${label} must be a number between ${min} and ${max}`,
    )
export const latitudeSchema = coordSchema('Latitude', -90, 90)
export const longitudeSchema = coordSchema('Longitude', -180, 180)

export const listAddresses = authed.handler(async ({ context }) => {
  return db.query.userAddress.findMany({
    where: eq(userAddress.userId, context.user.id),
    orderBy: [desc(userAddress.createdAt)],
  })
})

export const createAddress = authed
  .input(
    z.object({
      label: z.string().trim().default('Home'),
      recipientName: z.string().trim().min(1, 'Recipient name is required'),
      recipientPhone: phoneSchema,
      line1: z.string().trim().min(1, 'Address line 1 is required'),
      line2: z.string().trim().optional().nullable(),
      landmark: z.string().trim().optional().nullable(),
      city: z.string().trim().min(1, 'City is required'),
      state: z.string().trim().min(1, 'State is required'),
      pincode: pincodeSchema,
      latitude: latitudeSchema,
      longitude: longitudeSchema,
    }),
  )
  .handler(async ({ input, context }) => {
    const [created] = await db
      .insert(userAddress)
      .values({
        userId: context.user.id,
        label: input.label || 'Home',
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        line1: input.line1,
        line2: input.line2 ?? null,
        landmark: input.landmark ?? null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        latitude: input.latitude,
        longitude: input.longitude,
      })
      .returning()

    return created
  })

export const updateAddress = authed
  .input(
    z.object({
      id: z.string().trim().uuid(),
      label: z.string().trim().min(1, 'Label is required'),
      recipientName: z.string().trim().min(1, 'Recipient name is required'),
      recipientPhone: phoneSchema,
      line1: z.string().trim().min(1, 'Address line 1 is required'),
      line2: z.string().trim().optional().nullable(),
      landmark: z.string().trim().optional().nullable(),
      city: z.string().trim().min(1, 'City is required'),
      state: z.string().trim().min(1, 'State is required'),
      pincode: pincodeSchema,
      latitude: latitudeSchema,
      longitude: longitudeSchema,
    }),
  )
  .handler(async ({ input, context }) => {
    const [updated] = await db
      .update(userAddress)
      .set({
        label: input.label,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        line1: input.line1,
        line2: input.line2 ?? null,
        landmark: input.landmark ?? null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        latitude: input.latitude,
        longitude: input.longitude,
        updatedAt: new Date(),
      })
      .where(and(eq(userAddress.userId, context.user.id), eq(userAddress.id, input.id)))
      .returning()

    if (!updated) throw new Error('Address not found')
    return updated
  })

export const deleteAddress = authed
  .input(z.object({ id: z.string().trim().uuid() }))
  .handler(async ({ input, context }) => {
    const [deleted] = await db
      .delete(userAddress)
      .where(and(eq(userAddress.userId, context.user.id), eq(userAddress.id, input.id)))
      .returning()

    if (!deleted) throw new Error('Address not found')
    return { success: true }
  })
