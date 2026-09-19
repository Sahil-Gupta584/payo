import { launchBrowser, step } from './index.js'
import { env } from '../../env.js'

export type DeliveryAddressInfo = {
  recipientName: string
  recipientPhone: string
  line1: string
  line2?: string | null
  landmark?: string | null
  city: string
  state: string
  pincode: string
  latitude: string
  longitude: string
}

export type BlinkitCheckoutResult = {
  success: boolean
  sessionId: string
  cartId?: number | string
  orderHash?: string
  paymentAccessToken?: string
  checkoutUrl?: string
  sbiFields?: {
    transactionIdentifier: string
    nonce: string
    timestamp: string
    signature: string
  }
  error?: string
}

// ── Server-side helpers (no CORS, no browser needed) ─────────────────────────

async function serverTokenize(card: { number: string; cvv: string; expiry: string; name?: string }): Promise<string> {
  const [expMonth, rawYear] = card.expiry.includes('/') ? card.expiry.split('/') : [card.expiry.slice(0, 2), card.expiry.slice(2)]
  const expYear = rawYear.length === 2 ? `20${rawYear}` : rawYear
  const nameParts = (card.name || 'CARD HOLDER').trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName
  const res = await fetch('https://winecellar.zomato.com/v1/cards/tokenize', {
    method: 'POST',
    headers: { accept: '*/*', authorization: 'Basic Y2RlX2V4dGVybmFsOnVxOHZHTDk5d2Q0UmZQNEVSMzNHeG5VMw==', 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ first_name: firstName, last_name: lastName, pan: card.number, cvv: card.cvv, expiry_year: expYear.trim(), expiry_month: expMonth.trim() }).toString(),
  })
  const data = await res.json() as any
  if (data.status !== 'success') throw new Error(`tokenize failed: ${JSON.stringify(data)}`)
  return data.token as string
}

async function serverGetCardId(cardToken: string, paymentAccessToken: string, cartId: number, payableAmount: number, phone: string, cardNumber: string): Promise<{ cardId: number; cardToken: string }> {
  const addRes = await fetch('https://www.zomato.com/zpaykit/addCard', {
    method: 'POST',
    headers: { accept: '*/*', locale: 'en', 'content-type': 'application/x-www-form-urlencoded', 'x-client-pas-token': paymentAccessToken },
    body: new URLSearchParams({ vault: 'winecellar', country_id: '1', service_type: 'BLINKIT', card_name: cardNumber, card_token: cardToken }).toString(),
  })
  const added = await addRes.json() as any
  if (added?.response?.card_id) return { cardId: added.response.card_id, cardToken }

  // card already saved — fetch via getPaymentMethods
  const fd = new FormData()
  const fields: Record<string, string> = { country_id: '1', service_type: 'BLINKIT', phone, email: `${phone}@blinkit.com`, amount: String(payableAmount), order_type: 'null', order_id: String(cartId), host_redirect_url: `https://blinkit.com/zpay/${cartId}`, isNaked: 'false', isMobileView: 'false', online_payments_flag: '1' }
  for (const k in fields) fd.append(k, fields[k])
  const gmRes = await fetch('https://www.zomato.com/zpaykit/getPaymentMethods', { method: 'POST', headers: { accept: '*/*', 'x-client-pas-token': paymentAccessToken }, body: fd })
  const gm = await gmRes.json() as any
  const saved = gm?.response?.paymentMethods?.userSavedCard
  if (!Array.isArray(saved) || !saved.length) throw new Error(`getPaymentMethods returned no saved cards: ${JSON.stringify(gm).slice(0, 300)}`)
  const match = saved[0]
  return { cardId: match.card_id, cardToken: match.card_token }
}

async function serverMakePayment(opts: {
  paymentAccessToken: string
  orderId: number
  finalAmount: number
  paymentsHash: string
  phone: string
  additionalParams: any
  paymentMode: 'wallet' | 'cod'
  cardId?: number
  cardToken?: string
}): Promise<{ checkoutUrl?: string; error?: string }> {
  const ap = typeof opts.additionalParams === 'string' ? opts.additionalParams : JSON.stringify(opts.additionalParams)
  const paymentFields: Record<string, string> = {
    service_type: 'BLINKIT', order_type: 'null', country_id: '1',
    order_id: String(opts.orderId), amount: String(opts.finalAmount),
    host_redirect_url: `https://blinkit.com/zpay/${opts.orderId}`,
    payments_hash: opts.paymentsHash, promo_code: '',
    phone: opts.phone, email: `${opts.phone}@blinkit.com`,
    gateway_info: 'null', additional_params: ap,
    payments_config_params: '[object Object]',
    ...(opts.paymentMode === 'cod'
      ? { payment_method_id: '1', payment_method_type: 'cash' }
      : { payment_method_id: String(opts.cardId), payment_method_type: 'card', card_token: opts.cardToken!, card_vault: 'winecellar' }),
  }
  const res = await fetch('https://www.zomato.com/zpaykit/makePayment', {
    method: 'POST',
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/x-www-form-urlencoded',
      locale: 'en',
      'x-apple-device': '1',
      'x-consumer': 'zomato_pas_web_sdk',
      'x-mobile-view': '1',
      'x-web-consumer': 'mweb_android',
      'x-client-pas-token': opts.paymentAccessToken,
    },
    body: new URLSearchParams(paymentFields).toString(),
  })
  const data = await res.json() as any
  console.log('[makePayment]', JSON.stringify({ status: res.status, response_status: data?.response?.status, gateway: data?.response?.gateway_type, message: data?.response?.message, track_id: data?.response?.transaction?.track_id }))
  if (opts.paymentMode === 'cod') {
    // COD success: status confirmed or pending with response_url
    if (data?.response?.status === 'confirmed' || data?.response?.transaction?.response_url) {
      return { checkoutUrl: data?.response?.transaction?.response_url }
    }
  } else {
    if (data?.response?.status === 'pending' && data?.response?.transaction?.checkout_url) {
      return { checkoutUrl: data.response.transaction.checkout_url }
    }
  }
  return { error: data?.response?.message || data?.response?.transaction?.message || JSON.stringify(data).slice(0, 200) }
}

// ── Main checkout function ────────────────────────────────────────────────────

export async function blinkitCheckout(
  productId: string,
  card: { number: string; expiry: string; cvv: string; name?: string },
  paymentMethod: 'wallet' | 'cod' = 'wallet',
  deliveryAddress?: DeliveryAddressInfo,
): Promise<BlinkitCheckoutResult> {
  const { browser, sessionId } = await launchBrowser(env.SOLARI_PROFILE_ID)
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  page.setDefaultTimeout(30000)

  try {
    // 1. Open Blinkit — establishes session, cookies, Cloudflare clearance
    await step('open blinkit', page, async () => {
      await page.goto('https://blinkit.com', { waitUntil: 'domcontentloaded', timeout: 30000 })
    })

    if (!deliveryAddress) throw new Error('Delivery address is required for Blinkit checkout.')

    const addr = deliveryAddress

    // 2. address + cart + validate + createOrder (blinkit.com context, credentials: include)
    const s2 = await step('cart + createOrder', page, async () => {
      return page.evaluate(async ({ prodId, addr, pm }: any) => {
        const cookies = {
          get(name: string) {
            const m = document.cookie.split('; ').find((c: string) => c.startsWith(name + '='))
            return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : ''
          },
        }
        const authKey = localStorage.getItem('authKey') || ''
        const deviceId = localStorage.getItem('deviceId') || cookies.get('gr_1_deviceId') || ''
        const sessionUuid = sessionStorage.getItem('sessionId') || ''
        const accessToken = cookies.get('gr_1_accessToken')
        const lat = addr.latitude, lon = addr.longitude
        const accountPhone = (() => { try { return JSON.parse(localStorage.getItem('auth') || '{}').phoneNumber || '' } catch { return '' } })()
        if (!accountPhone) throw new Error('accountPhone not found in localStorage.auth — Blinkit profile may not be logged in')
        const headers: Record<string, string> = {
          accept: '*/*', 'accept-language': 'en-US,en;q=0.9',
          access_token: accessToken, app_client: 'consumer_web', app_version: '52434333',
          auth_key: authKey, 'cache-control': 'no-cache', 'content-type': 'application/json',
          device_id: deviceId, lat, lon, platform: 'desktop_web', pragma: 'no-cache',
          rn_bundle_version: '1009003012', session_uuid: sessionUuid,
          web_app_version: '1008010016', 'x-age-consent-granted': 'false',
        }

        // resolve or create address
        let addressId: any = null
        const addrListRes = await fetch(`https://blinkit.com/v4/address?cur_lat=${lat}&cur_lon=${lon}`, { headers, credentials: 'include' })
        const addrList = await addrListRes.json() as any
        if (Array.isArray(addrList?.addresses)) {
          const m = addrList.addresses.find((a: any) => {
            const aLat = parseFloat(a.lat || a.latitude), aLon = parseFloat(a.lon || a.longitude)
            return Math.abs(aLat - parseFloat(lat)) < 0.001 && Math.abs(aLon - parseFloat(lon)) < 0.001
          })
          if (m?.id) addressId = m.id
        }
        if (!addressId) {
          const cr = await fetch('https://blinkit.com/v4/address', { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ address_details_info: { address: addr.line1, building_name: addr.line1, landmark: addr.landmark || '', name: addr.recipientName, phone: addr.recipientPhone, postal_code: addr.pincode }, latitude: parseFloat(lat), longitude: parseFloat(lon), tag: 'Home' }) })
          const cd = await cr.json() as any
          addressId = cd?.address?.id || cd?.id
          if (!addressId) throw new Error(`address create failed: ${JSON.stringify(cd).slice(0, 200)}`)
        }

        // create cart
        const cartRes = await fetch('https://blinkit.com/v5/carts', { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ items: [{ product_id: prodId, quantity: 1 }], address_id: addressId, promo_codes: [''] }) })
        const cartData = await cartRes.json() as any
        const cartId = cartData?.cart_data?.id
        const payableAmount = cartData?.cart_data?.payable_amount ?? cartData?.cart_data?.bill_details?.payable_amount
        if (!cartId) throw new Error(`cart create failed: ${JSON.stringify(cartData).slice(0, 200)}`)
        if (payableAmount == null) throw new Error(`could not determine payable amount from cart: ${JSON.stringify(cartData).slice(0, 200)}`)

        // validate cart
        const valRes = await fetch(`https://blinkit.com/v5/carts/${cartId}/validate`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ channel_address_id: addressId, items: [{ product_id: prodId, quantity: 1 }], promo_codes: [''] }) })
        const valData = await valRes.json() as any
        if (valData.cart_state !== 'checkout_ready') throw new Error(`cart validate failed: state=${valData.cart_state}`)

        // createOrder — needed for both wallet and COD (provides orderHash + paymentAccessToken)
        const orderRes = await fetch(`https://blinkit.com/createOrder/${cartId}`, { method: 'GET', headers, credentials: 'include' })
        const orderData = await orderRes.json() as any
        const orderHash = orderData?.orderHash as string
        const paymentAccessToken = orderData?.response?.access_token as string
        if (!orderHash || !paymentAccessToken) throw new Error(`createOrder failed: ${JSON.stringify(orderData).slice(0, 200)}`)

        const additionalParams = { block_payment_methods: [], eligible_bank_codes: null, emi_details: null, hidden_payment_methods: [], service_type: 'BLINKIT', show_warning_banner: 1, user_details: { addressDetails: { address: addr.line1, contact_name: addr.recipientName, latitude: lat, longitude: lon, pincode: addr.pincode, state: addr.state, subzone_name: addr.line2 || addr.city } } }

        return { cartId, payableAmount, orderHash, paymentAccessToken, additionalParams, headers, addressId, accountPhone }
      }, { prodId: productId, addr, pm: paymentMethod })
    })

    // COD path — makePayment with cash, no card tokenization needed
    if (paymentMethod === 'cod') {
      const s4cod = await step('zomato_payment_hash (cod)', page, async () => {
        return page.evaluate(async ({ cartId, cardId, headers }: any) => {
          const hRes = await fetch('https://blinkit.com/zomato_payment_hash', {
            method: 'POST', headers, credentials: 'include',
            body: JSON.stringify({ cart_id: String(cartId), payment_info_data: { payment_method_id: cardId, payment_method_type: 'cash' } }),
          })
          const h = await hRes.json() as any
          const meta = h?.zomato_payment_hash_meta
          if (!meta?.payment_hash) throw new Error(`payment_hash failed: ${JSON.stringify(h).slice(0, 300)}`)
          return { paymentsHash: meta.payment_hash, orderId: meta.order_id, finalAmount: meta.payable_amount }
        }, { cartId: s2.cartId, cardId: 1, headers: s2.headers })
      })
      const codResult = await serverMakePayment({
        paymentAccessToken: s2.paymentAccessToken,
        orderId: s4cod.orderId,
        finalAmount: s4cod.finalAmount,
        paymentsHash: s4cod.paymentsHash,
        phone: s2.accountPhone,
        additionalParams: s2.additionalParams,
        paymentMode: 'cod',
      })
      if (codResult.error) throw new Error(`COD makePayment failed: ${codResult.error}`)
      await browser.close()
      return { success: true, sessionId, cartId: s2.cartId, orderHash: s2.orderHash }
    }

    // 3. Server-side: tokenize + addCard → get cardId
    const cardToken = await serverTokenize(card)
    const { cardId, cardToken: finalCardToken } = await serverGetCardId(cardToken, s2.paymentAccessToken, s2.cartId, s2.payableAmount, s2.accountPhone, card.number)
    console.log(`[OK] card tokenized — cardId: ${cardId}`)

    // recache CVV so payment processor can complete 3DS auth
    const recacheRes = await fetch(`https://winecellar.zomato.com/v1/cards/recache/${finalCardToken}`, {
      method: 'POST',
      headers: { accept: '*/*', authorization: 'Basic Y2RlX2V4dGVybmFsOnVxOHZHTDk5d2Q0UmZQNEVSMzNHeG5VMw==', 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ cvv: card.cvv }).toString(),
    })
    const recache = await recacheRes.json() as any
    if (recache.status !== 'success') throw new Error(`CVV recache failed: ${JSON.stringify(recache)}`)
    console.log(`[OK] CVV recached`)

    // 4. zomato_payment_hash in browser (Cloudflare-protected blinkit.com endpoint)
    const s4 = await step('zomato_payment_hash', page, async () => {
      return page.evaluate(async ({ cartId, cardId, headers }: any) => {
        const hRes = await fetch('https://blinkit.com/zomato_payment_hash', {
          method: 'POST', headers, credentials: 'include',
          body: JSON.stringify({ cart_id: String(cartId), payment_info_data: { payment_method_id: cardId, payment_method_type: 'card' } }),
        })
        const h = await hRes.json() as any
        const meta = h?.zomato_payment_hash_meta
        if (!meta?.payment_hash) throw new Error(`payment_hash failed: ${JSON.stringify(h).slice(0, 300)}`)
        return { paymentsHash: meta.payment_hash, orderId: meta.order_id, finalAmount: meta.payable_amount }
      }, { cartId: s2.cartId, cardId, headers: s2.headers })
    })

    // 5. Server-side: makePayment → checkout_url
    const payResult = await serverMakePayment({
      paymentAccessToken: s2.paymentAccessToken,
      orderId: s4.orderId,
      finalAmount: s4.finalAmount,
      paymentsHash: s4.paymentsHash,
      cardId,
      cardToken: finalCardToken,
      phone: s2.accountPhone,
      additionalParams: s2.additionalParams,
      paymentMode: 'wallet',
    })

    if (!payResult.checkoutUrl) {
      throw new Error(`makePayment failed: ${payResult.error}`)
    }

    console.log(`[OK] makePayment — checkout_url: ${payResult.checkoutUrl}`)

    // 6. Navigate to checkout_url → Cardinal StepUp → SBI iframe → scrape OTP fields
    await step('navigate to 3DSecure / OTP page', page, async () => {
      await page.goto(payResult.checkoutUrl!, { waitUntil: 'domcontentloaded', timeout: 30000 })
    })

    const { scrapeSbiOtpFields } = await import('./sbi-otp.js')
    const sbiFields = await step('scrape SBI OTP form fields', page, async () => {
      return scrapeSbiOtpFields(page)
    })

    await browser.close()
    return {
      success: true,
      sessionId,
      cartId: s2.cartId,
      orderHash: s2.orderHash,
      paymentAccessToken: s2.paymentAccessToken,
      checkoutUrl: payResult.checkoutUrl,
      sbiFields,
    }

  } catch (err: any) {
    await browser.close().catch(() => {})
    return { success: false, sessionId, error: err.message }
  }
}
