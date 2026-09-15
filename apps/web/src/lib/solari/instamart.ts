import { launchBrowser, step } from './index.js'

const INSTAMART_PROFILE_ID = process.env.INSTAMART_PROFILE_ID!

export type InstamartCartResult = {
  success: boolean
  cartUrl?: string
  sessionId: string
  error?: string
}

export async function instamartAddToCart(productId: string): Promise<InstamartCartResult> {
  const { browser, sessionId } = await launchBrowser(INSTAMART_PROFILE_ID)
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  page.setDefaultTimeout(30000)

  try {
    await step('load product page', page, async () => {
      await page.goto(`https://instamart.in/item/${productId}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('[data-testid="add_buttons_center"]', { timeout: 20000 })
    })

    await step('click ADD', page, async () => {
      await page.click('[data-testid="add_buttons_center"]')
      await page.waitForSelector('[data-testid="bottom-cart-hud"]', { timeout: 15000 })
    })

    await step('go to cart', page, async () => {
      await page.click('[data-testid="bottom-cart-hud"]')
      await page.waitForLoadState('domcontentloaded')
    })

    const cartUrl = page.url()
    await browser.close()
    return { success: true, cartUrl, sessionId }
  } catch (err: any) {
    await browser.close().catch(() => {})
    return { success: false, error: err.message, sessionId }
  }
}

// checkout flow to be added after Instamart recon (down till 6am)
