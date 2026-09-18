let cachedRate: { rate: number; expiresAt: number } | null = null

const FALLBACK_USD_TO_INR = 87.0
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour in-memory cache

/**
 * Fetches the live USD to INR exchange rate from open.er-api.com
 * Cached for 1 hour to prevent latency on checkout.
 */
export async function getUsdToInrRate(): Promise<number> {
  const now = Date.now()
  if (cachedRate && cachedRate.expiresAt > now) {
    return cachedRate.rate
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (res.ok) {
      const data = (await res.json()) as any
      const inr = Number(data?.rates?.INR)
      if (inr && inr > 50 && inr < 150) {
        cachedRate = { rate: inr, expiresAt: now + CACHE_TTL_MS }
        return inr
      }
    }
  } catch (err: any) {
    console.warn('[currency] Failed to fetch live USD/INR exchange rate, using fallback:', err?.message)
  }

  return cachedRate?.rate ?? FALLBACK_USD_TO_INR
}

/**
 * Returns the Payo service fee in USD cents for a given order amount.
 * Tiered to recover Dodo payment processing costs over multiple orders.
 *   < $5.00  → $0.20
 *   $5–$15   → $0.35
 *   > $15.00 → $0.50
 */
export function getServiceFeeCents(orderAmountCents: number): number {
  if (orderAmountCents < 500) return 20
  if (orderAmountCents <= 1500) return 35
  return 50
}

/**
 * Converts Indian Rupees (INR) to USD Cents ($1 = 100 cents).
 * Example: ₹87 INR with rate 87.0 => 100 USD cents ($1.00)
 */
export async function inrToUsdCents(inr: number): Promise<number> {
  const rate = await getUsdToInrRate()
  return Math.max(1, Math.round((inr / rate) * 100))
}
