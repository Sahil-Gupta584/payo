import { launchBrowser, step } from './index.js'
import { Solari } from '@solarisdk/browser'
import { env } from '#/env'

export type OtpResult = {
  success: boolean
  sessionId: string
  error?: string
}

// Legacy: opens fresh browser and navigates to OTP URL
export async function submitSbiOtp(
  otpPageUrl: string,
  otp: string,
  profileId: string,
): Promise<OtpResult> {
  const { browser, sessionId } = await launchBrowser(profileId)
  const page = await browser.newPage()
  await page.setViewportSize({ width: 390, height: 844 })
  page.setDefaultTimeout(30000)

  try {
    await step('load OTP page', page, async () => {
      await page.goto(otpPageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('.acs-otp-box', { timeout: 15000 })
    })

    await step('fill OTP', page, async () => {
      const digits = otp.replace(/\D/g, '').slice(0, 6)
      if (digits.length !== 6) throw new Error(`OTP must be 6 digits, got: ${otp}`)

      const boxes = await page.locator('.acs-otp-box').all()
      for (let i = 0; i < digits.length; i++) {
        await boxes[i]?.click()
        await boxes[i]?.type(digits[i]!)
      }

      // challengeInputValue gets populated by the page's JS, but also set it directly as fallback
      await page.evaluate((otp) => {
        const el = document.getElementById('challengeInputValue') as HTMLInputElement | null
        if (el) el.value = otp
      }, digits)
    })

    await step('click Make Payment', page, async () => {
      await page.click('#payment_btn')
      // wait for redirect away from OTP page (success) or error message
      await Promise.race([
        page.waitForFunction(() => !window.location.href.includes('cardinalcommerce') && !window.location.href.includes('sbi.bank'), { timeout: 20000 }),
        page.waitForSelector('.errorMessage:not(:empty)', { timeout: 20000 }),
      ])
    })

    const finalUrl = page.url()
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400))

    const failed = bodyText.toLowerCase().includes('incorrect') ||
      bodyText.toLowerCase().includes('invalid') ||
      bodyText.toLowerCase().includes('failed') ||
      page.url().includes('cardinalcommerce') ||
      page.url().includes('sbi.bank')

    if (failed) throw new Error(`OTP rejected. Page: ${bodyText.slice(0, 200)}`)

    console.log('[OK] payment confirmed — final URL:', finalUrl.slice(0, 100))
    await browser.close()
    return { success: true, sessionId }
  } catch (err: any) {
    await browser.close().catch(() => {})
    return { success: false, error: err.message, sessionId }
  }
}

// Direct server-side OTP submission — no browser needed
export async function submitOtpDirect(
  fields: { transactionIdentifier: string; nonce: string; timestamp: string; signature: string },
  otp: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('https://crqsbiacs.sbi.bank.in/acs/ajaxProcessChallenge', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      challengeInputValue: otp,
      transactionIdentifier: fields.transactionIdentifier,
      nonce: fields.nonce,
      timestamp: fields.timestamp,
      signature: fields.signature,
      charLimit: '6',
      registerPasskey: 'false',
    }).toString(),
  })

  const html = await res.text()

  if (!html || html.length < 100) return { success: false, error: 'Transaction expired' }
  if (html.toLowerCase().includes('invalid otp')) return { success: false, error: 'Invalid OTP' }

  // Success: response has no error and is different from the OTP form (shorter / no challengeForm)
  if (!html.includes('Invalid') && !html.includes('invalid')) return { success: true }
  return { success: false, error: `Bank error: ${html.slice(0, 200)}` }
}
export async function submitSbiOtpViaSession(
  sessionId: string,
  wsEndpoint: string,
  otp: string,
): Promise<OtpResult> {
  const client = new Solari({ apiKey: env.SOLARI_API_KEY, baseUrl: 'https://api.getsolari.com' })
  const { chromium } = await import('patchright-core')
  const browser = await chromium.connect(wsEndpoint)
  // Find the page that is on OTP url — usually single page
  const contexts = browser.contexts()
  const page = contexts[0]?.pages()[0] ?? (await browser.newPage())
  await page.setViewportSize({ width: 390, height: 844 })
  page.setDefaultTimeout(30000)

  try {
    await step('wait for OTP boxes (reconnected)', page, async () => {
      await page.waitForSelector('.acs-otp-box', { timeout: 15000 })
    })

    await step('fill OTP (reconnected)', page, async () => {
      const digits = otp.replace(/\D/g, '').slice(0, 6)
      if (digits.length !== 6) throw new Error(`OTP must be 6 digits, got: ${otp}`)
      const boxes = await page.locator('.acs-otp-box').all()
      for (let i = 0; i < digits.length; i++) {
        await boxes[i]?.click()
        await boxes[i]?.type(digits[i]!)
      }
      await page.evaluate((otp) => {
        const el = document.getElementById('challengeInputValue') as HTMLInputElement | null
        if (el) el.value = otp
      }, digits)
    })

    await step('click Make Payment (reconnected)', page, async () => {
      await page.click('#payment_btn')
      await Promise.race([
        page.waitForFunction(() => !window.location.href.includes('cardinalcommerce') && !window.location.href.includes('sbi.bank'), { timeout: 20000 }),
        page.waitForSelector('.errorMessage:not(:empty)', { timeout: 20000 }),
      ])
    })

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400))
    const failed =
      bodyText.toLowerCase().includes('incorrect') ||
      bodyText.toLowerCase().includes('invalid') ||
      bodyText.toLowerCase().includes('failed') ||
      page.url().includes('cardinalcommerce') ||
      page.url().includes('sbi.bank')

    if (failed) throw new Error(`OTP rejected. Page: ${bodyText.slice(0, 200)}`)

    console.log('[OK] payment confirmed via session — final URL:', page.url().slice(0, 100))
    await browser.close()
    await client.sessions.releaseAndWait(sessionId).catch(() => {})
    return { success: true, sessionId }
  } catch (err: any) {
    await browser.close().catch(() => {})
    // keep session alive on OTP failure so user can retry? For now release on failure too
    await client.sessions.releaseAndWait(sessionId).catch(() => {})
    return { success: false, error: err.message, sessionId }
  }
}
