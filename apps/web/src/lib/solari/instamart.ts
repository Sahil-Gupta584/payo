import { launchBrowser, step } from './index.js'
import { env } from '#/env'

export type InstamartCheckoutResult = {
  success: boolean
  sessionId: string
  sbiFields?: {
    transactionIdentifier: string
    nonce: string
    timestamp: string
    signature: string
  }
  error?: string
}

export async function instamartCheckout(
  productId: string,
  card: { number: string; expiry: string; cvv: string; name?: string },
  amountInr: number,
): Promise<InstamartCheckoutResult> {
  const { browser, sessionId } = await launchBrowser(env.INSTAMART_PROFILE_ID)
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  page.setDefaultTimeout(30000)

  const cardNumber = card.number.replace(/\s/g, '')
  const cardBin = cardNumber.slice(0, 6)
  const [expMonth, expYearShort] = card.expiry.replace(/\s/g, '').split('/')
  const expYear = `20${expYearShort}`
  const cardName = card.name ?? 'PAYI USER'

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
      await page.waitForTimeout(2000)
    })

    await step('proceed to pay', page, async () => {
      await page.waitForSelector('[data-testid="CART_FOOTER_MAKE_PAYMENT"]', { timeout: 15000 })
      await page.click('[data-testid="CART_FOOTER_MAKE_PAYMENT"]')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)
    })

    // checkout/order via page.evaluate — needs profile cookies
    const checkoutResult = await step('checkout/order API', page, async () => {
      return page.evaluate(async ([cardBin, cardName, expiry, expMonth, expYear, amountInr]: string[]) => {
        const h = JSON.parse(localStorage.getItem('auth_headers') || '{}')
        const ctx = JSON.parse(localStorage.getItem('__payment_context__') || '{}')
        const locCookie = document.cookie.split('; ').find((c: string) => c.startsWith('userLocation='))
        const loc = locCookie ? JSON.parse(decodeURIComponent(locCookie.split('=').slice(1).join('='))) : {}

        const addressId = ctx.addressId || h.cartaddressid || loc.id
        const lat = h.lat || String(loc.lat)
        const lng = h.lng || String(loc.lng)

        const state = JSON.parse(localStorage.getItem('swgy_checkout_state_payload') || '{}')
        const txnAmount = state?.placeOrderData?.order?.orderTotal ||
                          state?.placeOrderData?.extraParams?.transaction_amount ||
                          Number(amountInr)

        const metaObj = {
          address_id: addressId, payment_cod_method: 'Juspay', order_comments: '',
          card_bin_number: cardBin, card_reference: '', tokenization_user_consent: false,
          token: {}, provider_category: '', provider: '', cvv_mandatory: true,
          force_validate_coupon: false, transaction_amount: txnAmount,
          selected_split_pay_amounts: {}, twid_rewards_meta: {},
          name: cardName, nickName: '', saveCard: false,
          month: expMonth, year: expYear, brand: 'VISA', cardBrand: 'VISA', cardBin,
          lat, lng, paymentAmount: String(txnAmount),
          payment_method_meta: { is_juspay_native: 'false', cvv_mandatory: true, juspay_redirect_url: 'https://instamart.in/payment/payment-received', token: {}, provider_category: '', provider: '' },
          order_meta: { ordered_from: 'instamart', transaction_type: 'PRE_PAYMENT' },
        }

        const res = await fetch('https://instamart.in/api/v3/instamart/checkout/order?cartType=INSTAMART', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'accept': '*/*', 'content-type': 'application/json',
            'analyticsplatform': 'dweb', 'platform': 'dweb',
            'client-id': 'dweb', 'x-client-id': 'web-payment',
            'x-origin-id': 'dweb', 'x-web-checkout-flow': 'payment',
            'x-checkout-webview': 'dweb', 'marketplaceid': '1',
            'marketplacecategory': 'instamart', 'marketplacebusinessline': 'dash',
            'm_id': 'DASH', 'referrer-app-platform': 'dweb',
            'referrer-app-version': '1200', 'version-code': '1200',
            'isfrombottombar': 'false', 'statusbarheight': '0',
            'accessibility-enabled': 'false', 'browser-user-agent': navigator.userAgent,
            'lat': lat, 'latitude': lat, 'lng': lng, 'longitude': lng,
            'cartid': h.cartid || ctx.cartId || '',
            'cartkey': h.cartkey || ctx.linkId || '',
            'cartaddressid': addressId,
            'userid': h.userid || '', 'sid': h.sid || '',
            'tid': h.tid || '', 'token': h.token || '',
            'deviceid': h.deviceid || '', 'swuid': h.swuid || '',
          },
          body: JSON.stringify({
            card_bin_number: cardBin, card_reference: '', tokenization_user_consent: false,
            token: {}, provider_category: '', provider: '', cvv_mandatory: true,
            force_validate_coupon: false, transaction_amount: txnAmount,
            selected_split_pay_amounts: {}, twid_rewards_meta: {},
            name: cardName, expiry, nickName: '', saveCard: false,
            month: expMonth, year: expYear, brand: 'VISA', cardBrand: 'VISA', cardBin,
            lat, lng, addressId, paymentMethod: 'Juspay', useJuspayNative: false,
            paymentReturnUrl: 'https://instamart.in/payment/payment-received',
            orderComments: '', paymentAmount: String(txnAmount),
            address_id: addressId, payment_cod_method: 'Juspay', order_comments: '',
            payment_method_meta: { is_juspay_native: 'false', cvv_mandatory: true, juspay_redirect_url: 'https://instamart.in/payment/payment-received' },
            payment_type: 'PRE_PAYMENT',
            payment_info: { payment_method: 'Juspay', order_context: 'ORDER_JOB', payment_type: 'PRE_PAYMENT', emi_info: {}, metadata: JSON.stringify(metaObj), transaction_amount: txnAmount },
            cartType: 'INSTAMART',
          }),
        })
        const data = await res.json() as any
        return {
          txnId: (data?.data?.orders?.[0]?.order_jobs?.[0]?.payment_info?.[0]?.transaction_id ?? null) as string | null,
          statusCode: data?.statusCode as number,
          statusMessage: data?.statusMessage as string,
        }
      }, [cardBin, cardName, card.expiry, expMonth, expYear, String(amountInr)])
    })

    if (!checkoutResult.txnId) throw new Error(`checkout/order failed: ${checkoutResult.statusCode} ${checkoutResult.statusMessage}`)
    console.log('[OK] transaction_id:', checkoutResult.txnId)

    // juspay/tokenize — server-side, no cookies needed
    const tokenRes = await fetch('https://api.juspay.in/card/tokenize', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-merchantid': 'instamart' },
      body: new URLSearchParams({ card_number: cardNumber, card_exp_year: expYear, card_exp_month: expMonth, card_security_code: card.cvv, merchant_id: 'instamart', name_on_card: cardName, card_nickname: '' }).toString(),
    })
    const tokenData = await tokenRes.json() as any
    const cardToken = tokenData.token as string
    if (!cardToken) throw new Error(`juspay tokenize failed: ${JSON.stringify(tokenData)}`)
    console.log('[OK] card_token:', cardToken)

    // juspay/txns — server-side
    const txnRes = await fetch('https://api.juspay.in/txns', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-merchantid': 'instamart' },
      body: new URLSearchParams({ order_id: checkoutResult.txnId, merchant_id: 'instamart', payment_method_type: 'CARD', card_token: cardToken, redirect_after_payment: 'true', format: 'json', card_security_code: card.cvv, save_to_locker: 'false', tokenize: 'false', card_nickname: '' }).toString(),
    })
    const txnData = await txnRes.json() as any
    const authUrl = txnData.payment?.authentication?.url as string
    if (!authUrl) throw new Error(`juspay txns failed: ${JSON.stringify(txnData)}`)
    console.log('[OK] authentication.url:', authUrl)

    // Navigate to authentication.url → Cardinal StepUp → SBI iframe loads → OTP sent
    await step('navigate to authentication.url', page, async () => {
      await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    })

    // Wait for SBI iframe to navigate to crqsbiacs.sbi.bank.in
    const sbiFrame = await step('wait for SBI OTP iframe', page, async () => {
      await page.waitForEvent('framenavigated',
        (f: any) => f.url().includes('crqsbiacs.sbi.bank.in'),
      )
      const frame = page.frames().find((f: any) => f.url().includes('crqsbiacs.sbi.bank.in'))
      if (!frame) throw new Error('SBI iframe not found')
      await frame.waitForSelector('#transactionIdentifier', { timeout: 20000 })
      return frame
    })

    const sbiFields = await step('scrape SBI form fields', page, async () => ({
      transactionIdentifier: await sbiFrame.locator('#transactionIdentifier').inputValue(),
      nonce: await sbiFrame.locator('#nonce').inputValue(),
      timestamp: await sbiFrame.locator('#timestamp').inputValue(),
      signature: await sbiFrame.locator('#signature').inputValue(),
    }))

    console.log('[OK] SBI fields scraped, transactionIdentifier:', sbiFields.transactionIdentifier)
    await browser.close()
    return { success: true, sessionId, sbiFields }
  } catch (err: any) {
    const errMsg = err.message?.split('\n')[0] ?? String(err)
    console.error('[FAIL] instamart checkout:', errMsg)
    await browser.close().catch(() => {})
    return { success: false, error: errMsg, sessionId }
  }
}
