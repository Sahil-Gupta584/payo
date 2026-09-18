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

export async function blinkitCheckout(
  productId: string,
  _card: { number: string; expiry: string; cvv: string; name?: string },
  paymentMethod: 'card' | 'cod' = 'card',
  deliveryAddress?: DeliveryAddressInfo,
): Promise<BlinkitCheckoutResult> {
  const { browser, sessionId } = await launchBrowser(env.SOLARI_PROFILE_ID)
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  page.setDefaultTimeout(30000)

  try {
    // 1. Navigate to Blinkit in stealth browser session to initialize session & Cloudflare clearance
    await step('open blinkit', page, async () => {
      await page.goto('https://blinkit.com', { waitUntil: 'domcontentloaded', timeout: 30000 })
    })

    // 2. Run checkout pipeline inside page context using verified storage & cookie tokens
    const checkoutData = await step('blinkit checkout pipeline', page, async () => {
      return page.evaluate(
        async ({
          prodId,
          pm,
          addr,
        }: {
          prodId: string
          pm: 'card' | 'cod'
          addr?: DeliveryAddressInfo
        }) => {
          const getCookie = (name: string) => {
            const match = document.cookie.split('; ').find(c => c.startsWith(`${name}=`))
            return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : ''
          }

          const authKey = localStorage.getItem('authKey') || ''
          const deviceId = localStorage.getItem('deviceId') || getCookie('gr_1_deviceId') || ''
          const sessionUuid = sessionStorage.getItem('sessionId') || ''
          const accessToken = getCookie('gr_1_accessToken')
          const lat = addr?.latitude || getCookie('gr_1_lat') || '19.1851092'
          const lon = addr?.longitude || getCookie('gr_1_lon') || '72.9949806'

          const headers: Record<string, string> = {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'access_token': accessToken,
            'app_client': 'consumer_web',
            'app_version': '52434333',
            'auth_key': authKey,
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            'device_id': deviceId,
            'lat': lat,
            'lon': lon,
            'platform': 'desktop_web',
            'pragma': 'no-cache',
            'priority': 'u=1, i',
            'rn_bundle_version': '1009003012',
            'session_uuid': sessionUuid,
            'web_app_version': '1008010016',
            'x-age-consent-granted': 'false',
          }

          // Step 0: Resolve delivery address & recipient details
          if (!addr) {
            throw new Error('Delivery address is required for Blinkit checkout.')
          }

          let addressId: number | string | null = null
          const addressObj: any = {
            address: addr.line1,
            contact_name: addr.recipientName,
            latitude: addr.latitude || lat,
            longitude: addr.longitude || lon,
            pincode: addr.pincode,
            state: addr.state,
            subzone_name: addr.line2 || addr.city,
          }

          try {
            const addrRes = await fetch(
              `https://blinkit.com/v4/address?cur_lat=${lat}&cur_lon=${lon}`,
              { headers, credentials: 'include' },
            )
            const addrData = (await addrRes.json()) as any
            if (Array.isArray(addrData?.addresses) && addrData.addresses.length > 0) {
              const targetLat = parseFloat(addr.latitude || lat)
              const targetLon = parseFloat(addr.longitude || lon)

              const matched = addrData.addresses.find((a: any) => {
                const aLat = parseFloat(a.lat || a.latitude)
                const aLon = parseFloat(a.lon || a.longitude)
                const aPin = String(a.pincode || a.address_details_info?.postal_code || '').trim()
                const aLine = String(
                  a.line1 ||
                    a.address_details_info?.address ||
                    a.address_details_info?.building_name ||
                    '',
                )
                  .toLowerCase()
                  .trim()
                const targetLine = addr.line1.toLowerCase().trim()

                // 1. Precise coordinate proximity match (within ~0.001 deg, ~100 meters)
                const hasCoords =
                  !isNaN(targetLat) && !isNaN(targetLon) && !isNaN(aLat) && !isNaN(aLon)
                const isLocationMatch =
                  hasCoords &&
                  Math.abs(aLat - targetLat) < 0.001 &&
                  Math.abs(aLon - targetLon) < 0.001

                // 2. Pincode + street address match
                const isPincodeMatch = aPin && aPin === addr.pincode.trim()
                const isStreetMatch =
                  aLine &&
                  (aLine === targetLine ||
                    aLine.includes(targetLine) ||
                    targetLine.includes(aLine))

                return isLocationMatch || (isPincodeMatch && isStreetMatch)
              })

              // Only reuse if it truly matches the physical location
              if (matched?.id) {
                addressId = matched.id
              }
            }

            // If not found in Blinkit account, create/add address on Blinkit
            if (!addressId) {
              const createAddrRes = await fetch('https://blinkit.com/v4/address', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                  address_details_info: {
                    address: addr.line1,
                    building_name: addr.line1,
                    landmark: addr.landmark || '',
                    name: addr.recipientName,
                    phone: addr.recipientPhone,
                    postal_code: addr.pincode,
                  },
                  latitude: parseFloat(addr.latitude || lat),
                  longitude: parseFloat(addr.longitude || lon),
                  tag: 'Home',
                }),
              })
              const createData = (await createAddrRes.json()) as any
              if (createData?.address?.id || createData?.id) {
                addressId = createData?.address?.id || createData?.id
              }
            }
          } catch (addrErr) {
            console.warn('Failed to resolve/create address in Blinkit:', addrErr)
          }

          if (!addressId) {
            throw new Error(`Failed to resolve delivery address on Blinkit for ${addr.recipientName}`)
          }

          // Recipient phone for delivery / notifications
          const phone = addr.recipientPhone
          let email = `${phone}@payo.so`
          try {
            const rawUser = localStorage.getItem('user')
            if (rawUser) {
              const u = JSON.parse(rawUser)
              if (u.email) email = u.email
            }
          } catch {}

          // Step A: Create / sync cart
          const cartRes = await fetch('https://blinkit.com/v5/carts', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              items: [{ product_id: prodId, quantity: 1 }],
              address_id: addressId,
              promo_codes: [''],
            }),
          })

          const cartData = (await cartRes.json()) as any
          const cartId = cartData?.cart_data?.id
          if (!cartId) {
            throw new Error(`Failed to create cart on Blinkit: ${JSON.stringify(cartData?.validations || cartData)}`)
          }

          const payableAmount =
            cartData?.cart_data?.payable_amount ??
            cartData?.cart_data?.bill_details?.payable_amount
          if (payableAmount == null) {
            throw new Error(`Failed to determine payable amount from Blinkit cart: ${JSON.stringify(cartData)}`)
          }

          // Step B: Validate cart
          const valRes = await fetch(`https://blinkit.com/v5/carts/${cartId}/validate`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              channel_address_id: addressId,
              items: [{ product_id: prodId, quantity: 1 }],
              promo_codes: [''],
            }),
          })

          const valData = (await valRes.json()) as any
          if (valData.cart_state !== 'checkout_ready') {
            throw new Error(`Cart validation failed: state is ${valData.cart_state}`)
          }

          // Step C: Create order session
          const orderRes = await fetch(`https://blinkit.com/createOrder/${cartId}`, {
            method: 'GET',
            headers,
            credentials: 'include',
          })

          const orderData = (await orderRes.json()) as any
          const orderHash = orderData?.orderHash as string | undefined
          const paymentAccessToken = orderData?.response?.access_token as string | undefined

          if (!orderHash || !paymentAccessToken) {
            throw new Error(`Failed to create order session: ${JSON.stringify(orderData)}`)
          }

          const additionalParams = {
            block_payment_methods: [],
            eligible_bank_codes: null,
            emi_details: null,
            hidden_payment_methods: [],
            service_type: 'BLINKIT',
            show_warning_banner: 1,
            user_details: {
              addressDetails: addressObj,
            },
          }

          let cardId: number | string | null = null
          let cardToken: string | null = null
          let cardVault: string | null = null

          if (pm === 'card') {
            // Step D: Get Payment Methods
            const pmFields: Record<string, string> = {
              country_id: '1',
              service_type: 'BLINKIT',
              phone,
              email,
              amount: String(payableAmount),
              order_type: 'null',
              order_id: String(cartId),
              host_redirect_url: `https://blinkit.com/zpay/${cartId}`,
              isNaked: 'false',
              isMobileView: 'false',
              online_payments_flag: '1',
              additional_params: JSON.stringify(additionalParams),
            }
            const pmFormData = new FormData()
            for (const [k, v] of Object.entries(pmFields)) {
              pmFormData.append(k, v)
            }

            const pmRes = await fetch('https://www.zomato.com/zpaykit/getPaymentMethods', {
              method: 'POST',
              headers: {
                accept: '*/*',
                'x-client-pas-token': paymentAccessToken,
              },
              body: pmFormData,
            })
            const pmData = (await pmRes.json()) as any
            const savedCards = pmData?.response?.paymentMethods?.userSavedCard
            const savedCard = Array.isArray(savedCards) && savedCards[0] ? savedCards[0] : null
            if (savedCard?.card_id && savedCard?.card_token) {
              cardId = savedCard.card_id
              cardToken = savedCard.card_token
              cardVault = savedCard.vault || 'winecellar'
            }

            if (!cardId || !cardToken) {
              throw new Error(
                'No saved payment card found on your Blinkit account. Please add a card to your Blinkit profile.',
              )
            }
          }

          // Step E: makePayment
          const payFields: Record<string, string> = {
            service_type: 'BLINKIT',
            order_type: 'null',
            country_id: '1',
            order_id: String(cartId),
            amount: String(payableAmount),
            host_redirect_url: `https://blinkit.com/zpay/${cartId}`,
            payments_hash: orderHash,
            promo_code: '',
            phone,
            email,
            gateway_info: 'null',
            additional_params: JSON.stringify(additionalParams),
            payments_config_params: '[object Object]',
            ...(pm === 'cod'
              ? { payment_method_id: '1', payment_method_type: 'cash' }
              : {
                  payment_method_id: String(cardId),
                  payment_method_type: 'card',
                  card_token: cardToken!,
                  card_vault: cardVault || 'winecellar',
                }),
          }

          const payParams = new URLSearchParams(payFields)

          const payRes = await fetch('https://www.zomato.com/zpaykit/makePayment', {
            method: 'POST',
            headers: {
              accept: '*/*',
              'content-type': 'application/x-www-form-urlencoded',
              'x-client-pas-token': paymentAccessToken,
            },
            body: payParams.toString(),
          })

          const payData = (await payRes.json()) as any
          if (payData?.statusCode && payData.statusCode !== 200) {
            throw new Error(`Payment failed: ${payData.statusMessage || payData.message || JSON.stringify(payData)}`)
          }
          if (payData?.response?.status === 'failed' || payData?.status === 'failed') {
            throw new Error(`Payment failed: ${payData?.response?.message || payData?.message || JSON.stringify(payData)}`)
          }
          const checkoutUrl = payData?.response?.transaction?.checkout_url as string | undefined

          return {
            cartId,
            orderHash,
            paymentAccessToken,
            checkoutUrl,
            resolvedAddressId: addressId,
            status: payData?.response?.status || payData?.status,
          }
        },
        {
          prodId: productId,
          pm: paymentMethod,
          addr: deliveryAddress,
        },
      )
    })

    // If card payment with 3DSecure checkout URL, navigate and extract SBI OTP fields
    let sbiFields: BlinkitCheckoutResult['sbiFields']
    if (paymentMethod === 'card' && checkoutData.checkoutUrl) {
      await step('navigate to 3DSecure / OTP page', page, async () => {
        await page.goto(checkoutData.checkoutUrl!, { waitUntil: 'domcontentloaded', timeout: 30000 })
      })

      const { scrapeSbiOtpFields } = await import('./sbi-otp.js')
      sbiFields = await step('scrape SBI OTP form fields', page, async () => {
        return scrapeSbiOtpFields(page)
      })
    }

    await browser.close()
    return {
      success: true,
      sessionId,
      cartId: checkoutData.cartId,
      orderHash: checkoutData.orderHash,
      paymentAccessToken: checkoutData.paymentAccessToken,
      checkoutUrl: checkoutData.checkoutUrl,
      sbiFields,
    }
  } catch (err: any) {
    await browser.close().catch(() => {})
    return { success: false, sessionId, error: err.message }
  }
}
