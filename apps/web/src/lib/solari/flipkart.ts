import { launchBrowser, step } from './index.js'
import { env } from '#/env'

const FLIPKART_PROFILE_ID = env.FLIPKART_PROFILE_ID

export type FlipkartCheckoutResult = {
  success: boolean
  otpPageUrl?: string
  otpPageText?: string
  sessionId: string
  error?: string
}

export async function flipkartCheckout(
  productId: string,
  card: { number: string; expiry: string; cvv: string },
): Promise<FlipkartCheckoutResult> {
  const [expMonth, expYear] = card.expiry.replace(/\s/g, '').split('/')
  const { browser, sessionId } = await launchBrowser(FLIPKART_PROFILE_ID)
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  page.setDefaultTimeout(30000)

  try {
    await step('load product page', page, async () => {
      await page.goto(`https://www.flipkart.com/product/p/itm?pid=${productId}`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForFunction(
        () => [...document.querySelectorAll('div')].some(el => (el as HTMLElement).innerText.trim() === 'Buy now' && el.children.length === 0),
        { timeout: 20000 },
      )
    })

    await step('click Buy now', page, async () => {
      const found = await page.evaluate(() => {
        const t = [...document.querySelectorAll('div')].find(el => (el as HTMLElement).innerText.trim() === 'Buy now' && el.children.length === 0)
        if (!t) return false
        let el: any = t
        for (let i = 0; i < 5; i++) el = el.parentElement
        el.click()
        return true
      })
      if (!found) throw new Error('Buy now text node not found')
      await page.waitForURL('**/viewcheckout**', { timeout: 20000 })
      if (!page.url().includes('marketplace=FLIPKART')) {
        await page.goto('https://www.flipkart.com/viewcheckout?view=FLIPKART&marketplace=FLIPKART&tr_tenant=FLIPKART', { waitUntil: 'domcontentloaded', timeout: 20000 })
      }
    })

    await step('click Continue', page, async () => {
      await page.waitForFunction(
        () => [...document.querySelectorAll('div')].some(el => (el as HTMLElement).innerText.trim() === 'Continue' && el.children.length === 0),
        { timeout: 20000 },
      )
      await page.evaluate(() => {
        const t = [...document.querySelectorAll('div')].find(el => (el as HTMLElement).innerText.trim() === 'Continue' && el.children.length === 0)
        if (!t) throw new Error('Continue node not found')
        let el: any = t
        while (el?.parentElement) {
          el = el.parentElement
          if (el.style?.cursor === 'pointer') break
        }
        el.click()
      })
      await page.waitForURL('**/payments**', { timeout: 20000 })
      await page.waitForTimeout(2000)
    })

    await step('call payment API', page, async () => {
      const token = new URL(page.url()).searchParams.get('token')
      if (!token) throw new Error('token missing from payments URL')

      const result: any = await page.evaluate(async ([token, num, em, ey, cvv]: string[]) => {
        const res: any = await fetch('https://1.payments.flipkart.com/fkpay/api/v3/payments/paywithdetails?instrument=CREDIT', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
            token,
            'x-payment-revamp': 'm1',
            'x-device-source': 'web',
            'x-user-language': 'en',
            'device-details': JSON.stringify({ channel: 'web', platform: 'web', appVersion: 0, deviceOs: 'web' }),
            'x-device-details': JSON.stringify({ channel: 'web', platform: 'web', appVersion: 0, deviceOs: 'web' }),
            'x-user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop',
          },
          body: JSON.stringify({
            payment_instrument: 'CREDIT', token,
            biometric_auth_enabled: false, card_tokenisation_consent: false,
            card_number: num, expiry_month: em, expiry_year: ey, cvv,
            user_selected_adjustment_ids: [],
            device_information: { colorDepth: 24, javaEnabled: false, javaScriptEnabled: true, language: 'en-US', screenHeight: 1080, screenWidth: 1920, timeDifference: -330 },
            device_capabilities: { read_sms: false, phonepe_sdk: false, juspay_sdk: false, nda_enabled: false, upi_enabled: false },
            is_diff_shown_to_user: false,
          }),
        })
        return { status: res.status, body: await res.json() }
      }, [token, card.number, expMonth!, expYear!, card.cvv])

      if (result.body.response_status !== 'SUCCESS') throw new Error('payment API failed: ' + JSON.stringify(result.body).slice(0, 300))

      const action = result.body.primary_action
      await page.evaluate((action: any) => {
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = action.url
        Object.entries(action.parameters ?? {}).forEach(([k, v]) => {
          const input = document.createElement('input')
          input.type = 'hidden'; input.name = k; input.value = String(v)
          form.appendChild(input)
        })
        document.body.appendChild(form)
        ;(form as any).submit()
      }, action)
    })

    await step('wait for OTP page', page, async () => {
      await page.waitForFunction(() => !window.location.href.includes('/method'), { timeout: 30000 })
      await page.waitForFunction(
        () => window.location.href.includes('acs') || document.body.innerText.includes('OTP') || document.body.innerText.includes('One Time Password'),
        { timeout: 30000 },
      ).catch(() => {})
      await page.waitForTimeout(2000)
    })

    const otpPageUrl = page.url()
    const otpPageText = await page.evaluate(() => document.body.innerText.slice(0, 600))
    await browser.close()
    return { success: true, otpPageUrl, otpPageText, sessionId }
  } catch (err: any) {
    await browser.close().catch(() => {})
    return { success: false, error: err.message, sessionId }
  }
}
