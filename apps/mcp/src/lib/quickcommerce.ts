import { env } from '../env.js'
import { inrToUsdCents } from './currency.js'

const BASE = 'https://api.quickcommerceapi.com/v1'

export async function searchProducts(
  query: string,
  platform: 'swiggy' | 'blinkit' | 'zepto' | 'all' = 'all',
  lat = 19.1851092,
  lon = 72.9949806,
) {
  const fetchForPlatform = async (platName: 'BlinkIt' | 'Swiggy' | 'Zepto') => {
    try {
      const res = await fetch(
        `${BASE}/search?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lon}&platform=${platName}`,
        {
          headers: { 'X-API-Key': env.QUICKCOMMERCE_API_KEY },
        },
      )
      const data = (await res.json()) as any
      if (data.status !== 'success' && !data.data?.products) {
        return { products: [], credits: 0 }
      }
      return {
        products: (data.data?.products as any[]) || [],
        credits: (data.credits_remaining as number) || 0,
      }
    } catch {
      return { products: [], credits: 0 }
    }
  }

  if (platform === 'blinkit') {
    const result = await fetchForPlatform('BlinkIt')
    return { products: result.products, creditsRemaining: result.credits }
  }
  if (platform === 'zepto') {
    const result = await fetchForPlatform('Zepto')
    return { products: result.products, creditsRemaining: result.credits }
  }
  if (platform === 'swiggy') {
    const result = await fetchForPlatform('Swiggy')
    return { products: result.products, creditsRemaining: result.credits }
  }

  // all — Blinkit + Zepto
  const [blinkitRes, zeptoRes] = await Promise.all([
    fetchForPlatform('BlinkIt'),
    fetchForPlatform('Zepto'),
  ])
  return {
    products: [...blinkitRes.products, ...zeptoRes.products],
    creditsRemaining: blinkitRes.credits || zeptoRes.credits,
  }
}

/**
 * Directly fetches real-time item details (price, stock, availability)
 * from QuickCommerce API /v1/item endpoint using the item_id.
 */
export async function getItemDetail(
  itemId: string,
  platform: 'blinkit' | 'instamart' | 'swiggy' | 'zepto',
  lat: number,
  lon: number,
  pincode?: string,
): Promise<{
  success: boolean
  item: {
    id: string
    name: string
    price: number
    mrp: number
    available: boolean
    inventory?: number
    storeId?: string
    sla?: string
  } | null
  creditsRemaining?: number
}> {
  try {
    const platParam = platform === 'blinkit' ? 'BlinkIt' : 'Swiggy'
    const pinQuery = pincode ? `&pincode=${encodeURIComponent(pincode)}` : ''
    const url = `${BASE}/item?item_id=${encodeURIComponent(itemId)}&lat=${lat}&lon=${lon}&platform=${platParam}${pinQuery}`

    const res = await fetch(url, {
      headers: { 'X-API-Key': env.QUICKCOMMERCE_API_KEY },
    })
    const data = (await res.json()) as any

    if (data.status === 'success' && Array.isArray(data.data?.items) && data.data.items[0]) {
      const it = data.data.items[0]
      return {
        success: true,
        item: {
          id: String(it.item_id || itemId),
          name: it.name || '',
          price: Number(it.price ?? it.mrp ?? 0),
          mrp: Number(it.mrp ?? it.price ?? 0),
          available: it.available !== false && (it.inventory === undefined || it.inventory > 0),
          inventory: it.inventory,
          storeId: it.store_id,
          sla: it.sla,
        },
        creditsRemaining: data.credits_remaining,
      }
    }

    console.warn(`[getItemDetail] API returned non-success for item ${itemId} on ${platform}:`, JSON.stringify(data).slice(0, 300))
    return { success: false, item: null }
  } catch (err: any) {
    console.warn(`[getItemDetail] Failed to fetch item ${itemId} from ${platform}:`, err.message)
    return { success: false, item: null }
  }
}

/**
 * Verifies the live price and stock availability of a product via QuickCommerce API
 * directly using the `/v1/item` endpoint with the product's item ID.
 * Converts the live INR price to USD cents ($1 = 100) using the real-time exchange rate.
 */
export async function verifyProductPrice(
  productId: string,
  productName: string,
  platform: 'blinkit' | 'instamart' | 'zepto',
  lat: number,
  lon: number,
  pincode?: string,
): Promise<{
  verified: boolean
  priceCents: number
  priceInr: number
  available: boolean
  matchedName: string
  storeId?: string
  mrpInr?: number
  sla?: string
}> {
  try {
    const detail = await getItemDetail(productId, platform, lat, lon, pincode)
    if (detail.success && detail.item && detail.item.price > 0) {
      const priceInr = detail.item.price
      const priceCents = await inrToUsdCents(priceInr)
      return {
        verified: true,
        priceCents,
        priceInr,
        available: detail.item.available,
        matchedName: detail.item.name || productName,
        storeId: detail.item.storeId,
        mrpInr: detail.item.mrp,
        sla: detail.item.sla,
      }
    }

    return {
      verified: false,
      priceCents: 0,
      priceInr: 0,
      available: false,
      matchedName: productName,
    }
  } catch (err: any) {
    console.warn(`[verifyProductPrice] Error verifying price for item ${productId} via /v1/item:`, err)
    return {
      verified: false,
      priceCents: 0,
      priceInr: 0,
      available: false,
      matchedName: productName,
    }
  }
}
