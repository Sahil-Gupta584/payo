import { Solari } from '@solarisdk/browser'
import type { Page } from 'patchright-core'
import { env } from '#/env'

export async function launchBrowser(profileId: string) {
  const client = new Solari({ apiKey: env.SOLARI_API_KEY, baseUrl: 'https://api.getsolari.com' })
  const browser = await client.launch({ stealth: true, captcha: true, recording: true, profileId })
  return { client, browser, sessionId: browser.id }
}

export async function step(label: string, page: Page, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    console.log(`[OK] ${label} — ${page.url().slice(0, 80)}`)
  } catch (err: any) {
    const url = (() => { try { return page.url() } catch { return 'unknown' } })()
    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 400)).catch(() => '')
    console.error(`[FAIL] ${label} — ${err.message?.split('\n')[0]}`)
    console.error(`  url : ${url}`)
    console.error(`  body: ${text.slice(0, 200)}`)
    throw err
  }
}

export async function getReplayUrl(client: Solari, sessionId: string): Promise<string | null> {
  await new Promise(r => setTimeout(r, 15000))
  const { url } = await client.sessions.getReplayUrl(sessionId).catch(() => ({ url: null }))
  return url
}
