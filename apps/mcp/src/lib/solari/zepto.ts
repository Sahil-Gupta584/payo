import { launchBrowser, step } from './index.js'
import { env } from '../../env.js'

export type ZeptoCheckoutResult = {
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

export type ZeptoDeliveryAddress = {
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

const COMPATIBLE_COMPONENTS = [
  'EXTERNAL_COUPONS','BUNDLE','MULTI_SELLER_ENABLED','COUPON_WIDGET_CART_REVAMP',
  'DELIVERY_UPSELLING_WIDGET','OOS_RECOMMENDATIONS','GIFT_CARD','PROMO_CASH:0',
  'PHARMACY_ENABLED','SUPER_SAVER:1','OFSE','PC_REVAMP_1','ENABLE_FLOATING_CART_BUTTON',
  'SAMPLING_V3','HYBRID_CAMPAIGN','DISCOUNTED_ADDONS_ENABLED','CART_LMS:2','CART_LMS:1',
  'CUSTOMIZATION_ENABLED','NEW_BILL_INFO','RE_PROMISE_ETA_ORDER_SCREEN_ENABLED',
  'SUPERSTORE_V1','MANUALLY_APPLIED_DELIVERY_FEE_RECEIVABLE','MARKETPLACE_REPLACEMENT',
  'ZEPTO_PASS:5','CART_REDESIGN_ENABLED','SHIPMENT_WIDGETIZATION_ENABLED',
  'TABBED_CAROUSEL_V2','24X7_ENABLED_V1','HOMEPAGE_V2','NO_PLATFORM_CHECK_ENABLED_V2',
  'HP_V4_FEED','SCLP_ADD_MONEY','GIFTING_ENABLED','WIDGET_BASED_ETA','NEW_ETA_BANNER',
  'NO_COST_EMI_V1','ITEMISATION_ENABLED','SWAP_AND_SAVE_ON_CART','WIDGET_RESTRUCTURE',
  'PRICING_CAMPAIGN_ID','BACHAT_FOR_ALL','TABBED_CAROUSEL_V3','MULTITAB_V2',
  'VERTICAL_FEED_PRODUCT_GRID','SAMPLING_UPSELL_CAMPAIGN','UPSELL_COUPON_SS:0',
  'SIZE_EXCHANGE_ENABLED',
].join(',')

export async function zeptoCheckout(
  productVariantId: string,
  mrpRupees: number,
  storeId: string,
  storeEtaMinutes: number,
  addr: ZeptoDeliveryAddress,
): Promise<ZeptoCheckoutResult> {
  const { browser, sessionId } = await launchBrowser(env.SOLARI_PROFILE_ID, 'residential')
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  page.setDefaultTimeout(30000)

  const mrpPaise = mrpRupees * 100
  const storeEtas = JSON.stringify({ [storeId]: storeEtaMinutes })
  const storeServiceability = JSON.stringify({
    data: { [storeId]: { cost: 0, eta: storeEtaMinutes, type: 'PRIMARY_STORE' } },
    version: 'v1',
  })

  try {
    // 1. Navigate to product page, intercept RSC response to get storeProductId
    let storeProductId: string | undefined

    const rscCapture = page.waitForResponse(
      res => res.url().includes(`/pvid/${productVariantId}`) && res.url().includes('_rsc'),
      { timeout: 15000 },
    ).then(async res => {
      const text = await res.text()
      storeProductId = text.match(/"storeProductId":"([^"]+)"/)?.[1]
    }).catch(() => {})

    await step('load product page', page, async () => {
      await page.goto(`https://www.zepto.com/pn/x/pvid/${productVariantId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      await rscCapture
    })

    if (!storeProductId) throw new Error('storeProductId not found in RSC response')
    console.log(`[OK] storeProductId: ${storeProductId}`)

    // 2. add-address with user's delivery details → returns address id
    type AddressResult = { id: string; status: number }
    const addressResult = await step('add-address', page, () =>
      page.evaluate(async (a: { name: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string; lat: string; lng: string; storeId: string; storeEtas: string; storeSvc: string; cc: string }): Promise<AddressResult> => {
        const gc = (n: string) => decodeURIComponent(document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]*)`))?.[1] ?? '')
        const reqId = crypto.randomUUID()
        const hdrs = {
          accept: 'application/json, text/plain, */*',
          app_sub_platform: 'WEB', app_version: '16.31.6', appversion: '16.31.6',
          auth_from_cookie: 'true', auth_revamp_flow: 'v2',
          'content-type': 'application/json',
          compatible_components: a.cc,
          device_id: gc('device_id'), deviceid: gc('device_id'),
          marketplace_type: 'SUPER_SAVER', platform: 'WEB', tenant: 'ZEPTO',
          'request-signature': 'gringotts-signature',
          request_id: reqId, requestid: reqId,
          session_id: gc('session_id'), sessionid: gc('session_id'),
          source: 'DIRECT',
          store_etas: a.storeEtas,
          store_id: a.storeId, store_ids: a.storeId, storeid: a.storeId,
          store_serviceability: a.storeSvc,
          'x-csrf-secret': gc('csrfSecret'),
          'x-xsrf-token': gc('XSRF-TOKEN'),
          'x-widget-id': '019f0925-0b55-719a-ac48-75849d7890e4',
        }
        const formattedAddress = `${a.line1}${a.line2 ? ', ' + a.line2 : ''}, ${a.city}, ${a.state} ${a.pincode}, India`
        const res = await fetch('https://bff-gateway.zepto.com/api/v1/user/customer/add-address/', {
          method: 'POST', credentials: 'include', headers: hdrs,
          body: JSON.stringify({
            type: 'OTHER', name: a.name,
            flatDetails: a.line1, buildingName: a.line2 || a.line1,
            landmark: a.landmark,
            latitude: Number(a.lat), longitude: Number(a.lng),
            googleMapsLocationData: JSON.stringify({
              formattedAddress,
              shortAddress: `${a.city}, ${a.state}`,
              result: {
                formatted_address: formattedAddress,
                geometry: { location: { lat: Number(a.lat), lng: Number(a.lng) } },
                address_components: [
                  { long_name: a.city, short_name: a.city, types: ['locality', 'political'] },
                  { long_name: a.state, short_name: a.state, types: ['administrative_area_level_1', 'political'] },
                  { long_name: 'India', short_name: 'IN', types: ['country', 'political'] },
                  { long_name: a.pincode, short_name: a.pincode, types: ['postal_code'] },
                ],
              },
            }),
            contactName: a.name, contactNumber: a.phone,
            floor: null, buildingType: 'BUILDING_TYPE_SOCIETY', isNewAddressFormat: true,
          }),
        })
        const d = await res.json() as any
        return { id: d.id, status: res.status }
      }, {
        name: addr.recipientName, phone: addr.recipientPhone,
        line1: addr.line1, line2: addr.line2 || '', landmark: addr.landmark || '',
        city: addr.city, state: addr.state, pincode: addr.pincode,
        lat: addr.latitude, lng: addr.longitude,
        storeId, storeEtas, storeSvc: storeServiceability, cc: COMPATIBLE_COMPONENTS,
      })
    )

    if (!addressResult.id) throw new Error(`add-address failed (${addressResult.status}): ${JSON.stringify(addressResult)}`)
    console.log(`[OK] zeptoAddressId: ${addressResult.id}`)

    // 3. cart/create — runs inside browser (needs Zepto cookies)
    type CartResult = { cartId: string; grandTotalAmount: number; status: number }
    const cartResult = await step('cart/create', page, () =>
      page.evaluate(async (a: { storeId: string; spid: string | undefined; pvid: string; mrp: string; lat: string; lng: string; addressId: string; storeEtas: string; storeSvc: string; cc: string }): Promise<CartResult> => {
        const gc = (n: string) => decodeURIComponent(document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]*)`))?.[1] ?? '')
        const reqId = crypto.randomUUID()
        const hdrs = {
          accept: 'application/json, text/plain, */*',
          app_sub_platform: 'WEB', app_version: '16.31.6', appversion: '16.31.6',
          auth_from_cookie: 'true', auth_revamp_flow: 'v2',
          'content-type': 'application/json',
          compatible_components: a.cc,
          device_id: gc('device_id'), deviceid: gc('device_id'),
          ispass: 'true',
          marketplace_type: 'SUPER_SAVER', platform: 'WEB', tenant: 'ZEPTO',
          'request-signature': 'gringotts-signature',
          request_id: reqId, requestid: reqId,
          session_id: gc('session_id'), sessionid: gc('session_id'),
          source: 'DIRECT',
          store_etas: a.storeEtas,
          store_id: a.storeId, store_ids: a.storeId, storeid: a.storeId,
          store_serviceability: a.storeSvc,
          'x-csrf-secret': gc('csrfSecret'),
          'x-xsrf-token': gc('XSRF-TOKEN'),
          'x-widget-id': '019f0925-0b55-719a-ac48-75849d7890e4',
        }
        const res = await fetch('https://bff-gateway.zepto.com/cfs/api/v1/cart/create', {
          method: 'POST', credentials: 'include', headers: hdrs,
          body: JSON.stringify({
            storeId: a.storeId, cartId: '',
            cartProducts: [{
              storeProductId: a.spid, productVariantId: a.pvid,
              mrp: Number(a.mrp), quantity: 1, isDiscountApplicable: true, isAddedToGiftBag: false,
            }],
            cartProductsV2: [{
              storeProductId: a.spid, productVariantId: a.pvid,
              mrp: Number(a.mrp), quantity: 1, isDiscountApplicable: true, isAddedToGiftBag: false,
              cartProductId: a.pvid, addOns: [],
            }],
            swappedPvIds: {}, removedCampaignProducts: [], availedCampaignProducts: [],
            availedCampaignProductIds: [],
            deliveryInstructions: {
              leaveAtGate: false, doNotRingBell: false, bewareOfPets: false,
              returnPaperBag: false, returnCokePetBottle: false,
            },
            oosProductMeta: [], riderTip: 0,
            latitude: Number(a.lat), longitude: Number(a.lng),
            useZeptoCash: true, userPreferences: {}, isLayoutRequired: true,
            locationToAddressDistance: 1,
            sessionMeta: { clearUnserviceableProductsWidget: false },
            userAddressId: a.addressId,
            isPtpLayoutMigrationEnabled: true,
            seenElementsInSession: { ptpBottomSheet: false },
          }),
        })
        const d = await res.json() as any
        return { cartId: d.cartId, grandTotalAmount: d.grandTotalAmount, status: res.status }
      }, {
        storeId, spid: storeProductId, pvid: productVariantId,
        mrp: String(mrpPaise), lat: addr.latitude, lng: addr.longitude,
        addressId: addressResult.id, storeEtas, storeSvc: storeServiceability,
        cc: COMPATIBLE_COMPONENTS,
      })
    )

    if (!cartResult.cartId) throw new Error(`cart/create failed (${cartResult.status}): ${JSON.stringify(cartResult)}`)
    console.log(`[OK] cartId: ${cartResult.cartId} | toPay: ₹${cartResult.grandTotalAmount / 100}`)

    // 3. create order — runs inside browser
    type OrderResult = { orderId: string; clientAuthToken: string; juspayOrderId: string; status: number }
    const orderResult = await step('create order', page, () =>
      page.evaluate(async (a: { storeId: string; cartId: string; grandTotal: string; lat: string; lng: string; cardCode: string; storeEtas: string; storeSvc: string; cc: string }): Promise<OrderResult> => {
        const gc = (n: string) => decodeURIComponent(document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]*)`))?.[1] ?? '')
        const reqId = crypto.randomUUID()
        const hdrs = {
          accept: 'application/json, text/plain, */*',
          app_sub_platform: 'WEB', app_version: '16.31.6', appversion: '16.31.6',
          auth_from_cookie: 'true', auth_revamp_flow: 'v2',
          'content-type': 'application/json',
          compatible_components: a.cc,
          device_id: gc('device_id'), deviceid: gc('device_id'),
          marketplace_type: 'SUPER_SAVER', platform: 'WEB', tenant: 'ZEPTO',
          'request-signature': 'gringotts-signature',
          request_id: reqId, requestid: reqId,
          session_id: gc('session_id'), sessionid: gc('session_id'),
          source: 'DIRECT',
          store_etas: a.storeEtas,
          store_id: a.storeId, store_ids: a.storeId, storeid: a.storeId,
          store_serviceability: a.storeSvc,
          'x-csrf-secret': gc('csrfSecret'),
          'x-xsrf-token': gc('XSRF-TOKEN'),
        }
        const res = await fetch('https://bff-gateway.zepto.com/api/v3/order/', {
          method: 'POST', credentials: 'include', headers: hdrs,
          body: JSON.stringify({
            latitude: Number(a.lat), longitude: Number(a.lng),
            useZeptoCash: true, noBagDelivery: false,
            storeId: a.storeId,
            previousCartDetails: { toPay: Number(a.grandTotal) },
            paymentMetadata: {
              paymentInstrumentGroup: 'CARD',
              paymentInstrumentCode: a.cardCode,
              data: { flow: 'NEW_CARD', tokenizationConsent: false },
              returnUrlOrigin: 'https://www.zepto.com/ProcessOrder',
              returnUrlEnabled: true, ad: false, isProductBasketRequired: true,
            },
            appPlatform: 'MWEB', returnUrlEnabled: true,
            removeCampaignProductsList: [],
            cartId: a.cartId,
            checkoutMeta: { id: crypto.randomUUID(), count: 1 },
          }),
        })
        const d = await res.json() as any
        return {
          orderId: d.orderId,
          clientAuthToken: d.paymentInfo?.data?.cardTxnPayload?.clientAuthToken,
          juspayOrderId: d.paymentInfo?.data?.cardTxnPayload?.orderId,
          status: res.status,
        }
      }, {
        storeId, cartId: cartResult.cartId,
        grandTotal: String(cartResult.grandTotalAmount),
        lat: addr.latitude, lng: addr.longitude,
        cardCode: env.ZEPTO_CARD_INSTRUMENT_CODE,
        storeEtas, storeSvc: storeServiceability, cc: COMPATIBLE_COMPONENTS,
      })
    )

    if (!orderResult.clientAuthToken) throw new Error(`order failed (${orderResult.status}): ${JSON.stringify(orderResult)}`)
    console.log(`[OK] orderId: ${orderResult.orderId} | juspayOrderId: ${orderResult.juspayOrderId}`)

    // 4. Juspay tokenize (server-side, no cookies needed)
    const card = { number: env.PLATFORM_CARD_NUMBER, expiry: env.PLATFORM_CARD_EXPIRY, cvv: env.PLATFORM_CARD_CVV }
    const cardNumber = card.number.replace(/\s/g, '')
    const [expMonth, expYearShort] = card.expiry.replace(/\s/g, '').split('/')
    const expYear = `20${expYearShort}`

    const tokenRes = await fetch('https://api.juspay.in/card/tokenize', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-merchantid': 'zeptomarketplace' },
      body: new URLSearchParams({
        card_number: cardNumber, card_exp_year: expYear, card_exp_month: expMonth,
        card_security_code: card.cvv, merchant_id: 'zeptomarketplace',
        name_on_card: 'PAYO USER', card_nickname: '',
      }).toString(),
    })
    const tokenData = await tokenRes.json() as any
    const cardToken = tokenData.token as string
    if (!cardToken) throw new Error(`juspay tokenize failed: ${JSON.stringify(tokenData)}`)
    console.log(`[OK] card_token: ${cardToken.slice(0, 8)}…`)

    // 5. Juspay txns → get authentication.url
    const txnRes = await fetch('https://api.juspay.in/txns', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-merchantid': 'zeptomarketplace' },
      body: new URLSearchParams({
        order_id: orderResult.juspayOrderId,
        merchant_id: 'zeptomarketplace',
        payment_method_type: 'CARD',
        card_token: cardToken,
        redirect_after_payment: 'true',
        format: 'json',
        card_security_code: card.cvv,
        save_to_locker: 'false',
        tokenize: 'false',
        card_nickname: '',
      }).toString(),
    })
    const txnData = await txnRes.json() as any
    const authUrl = txnData.payment?.authentication?.url as string
    if (!authUrl) throw new Error(`juspay txns failed: ${JSON.stringify(txnData)}`)
    console.log(`[OK] authentication.url: ${authUrl}`)

    // 6. Navigate to Juspay → Razorpay → SBI OTP
    await step('navigate to juspay', page, async () => {
      await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    })

    const { scrapeSbiOtpFields } = await import('./sbi-otp.js')
    const sbiFields = await step('scrape SBI OTP fields', page, async () => {
      return scrapeSbiOtpFields(page)
    })

    await browser.close()
    return { success: true, sessionId, sbiFields }
  } catch (err: any) {
    console.error(`[FAIL] zepto checkout: ${err.message}`)
    try { await browser.close() } catch {}
    return { success: false, sessionId, error: err.message }
  }
}
