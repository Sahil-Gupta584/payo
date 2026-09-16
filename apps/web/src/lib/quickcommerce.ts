import { env } from '#/env'

const BASE = 'https://api.quickcommerceapi.com/v1'
const PLATFORM = 'Swiggy'

export async function searchProducts(query: string, lat = 19.2183, lon = 72.9781) {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lon}&platform=${PLATFORM}`, {
    headers: { 'X-API-Key': env.QUICKCOMMERCE_API_KEY },
  })
  const data = await res.json() as any
  if (data.status !== 'success') throw new Error(`QuickCommerce error: ${JSON.stringify(data)}`)
  const products = (data.data.products as any[]).filter(
    (p) => p.platform?.name?.toLowerCase() === 'swiggy',
  )
  return { products, creditsRemaining: data.credits_remaining as number }
}
