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

// Scrape SBI OTP form fields from page or iframe
export async function scrapeSbiOtpFields(page: any): Promise<{
  transactionIdentifier: string
  nonce: string
  timestamp: string
  signature: string
}> {
  const findSbiTarget = () => {
    if (page.url().includes('crqsbiacs.sbi.bank.in')) return page
    return page.frames().find((f: any) => f.url().includes('crqsbiacs.sbi.bank.in'))
  }

  let target = findSbiTarget()
  if (!target) {
    const start = Date.now()
    while (Date.now() - start < 30000) {
      await page.waitForTimeout(500)
      target = findSbiTarget()
      if (target) break
    }
  }

  if (!target) throw new Error('SBI OTP page / iframe not found')
  await target.waitForSelector('#transactionIdentifier', { timeout: 20000 })

  return {
    transactionIdentifier: await target.locator('#transactionIdentifier').inputValue(),
    nonce: await target.locator('#nonce').inputValue(),
    timestamp: await target.locator('#timestamp').inputValue(),
    signature: await target.locator('#signature').inputValue(),
  }
}
