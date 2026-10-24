import chromium from '@sparticuz/chromium'
import puppeteer, { type Browser, type Page } from 'puppeteer-core'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

/**
 * Launches headless Chromium. On Vercel the serverless build from
 * @sparticuz/chromium is used; locally set CHROMIUM_EXECUTABLE_PATH to a
 * Chrome/Chromium binary.
 */
export async function launchBrowser(): Promise<Browser> {
  const localPath = process.env.CHROMIUM_EXECUTABLE_PATH
  return puppeteer.launch({
    executablePath: localPath || (await chromium.executablePath()),
    args: localPath ? ['--no-sandbox'] : chromium.args,
    headless: true,
    defaultViewport: { width: 1366, height: 900 },
  })
}

export async function preparePage(browser: Browser, timeoutMs: number): Promise<Page> {
  const page = await browser.newPage()
  await page.setUserAgent({ userAgent: USER_AGENT })
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-AR,es;q=0.9' })
  page.setDefaultTimeout(timeoutMs)
  page.setDefaultNavigationTimeout(timeoutMs)
  return page
}
