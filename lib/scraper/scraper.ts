import type { Browser, Page } from 'puppeteer-core'
import { MissingApiKeyError } from '@/lib/ai/generate-model-response'
import { parsePrice, quoteItem, summarizeCart, totalStore, type CartItem, type CartQuote, type ItemQuote, type ScrapedProduct, type StoreQuote } from '@/lib/cart/pricing'
import { launchBrowser, preparePage } from './browser'
import { pageScripts, type CardsReading, type ProductSpec } from './page-scripts'
import { resolveProducts, resolveSearchInput } from './selectors'
import { stores as allStores, type Store } from './stores'

const PAGE_TIMEOUT_MS = 20_000
const DELAY_BETWEEN_REQUESTS_MS = 1_500

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Returns once the DOM stops changing (replaces fixed sleeps). */
async function waitForStableDom(page: Page, timeoutMs = 15_000, settleMs = 1_500): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastSize = -1
  let stableSince = Date.now()
  while (Date.now() < deadline) {
    // Navigations destroy the execution context mid-poll; just retry.
    const size = (await page.evaluate(pageScripts.domSize()).catch(() => -2)) as number
    const now = Date.now()
    if (size !== lastSize) {
      lastSize = size
      stableSince = now
    } else if (now - stableSince >= settleMs) return
    await sleep(400)
  }
}

async function scrollToLoad(page: Page, steps = 4): Promise<void> {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(pageScripts.scrollToBottom()).catch(() => null)
    await sleep(800)
  }
  await page.evaluate(pageScripts.scrollToTop()).catch(() => null)
}

async function extract(page: Page, spec: ProductSpec): Promise<ScrapedProduct[]> {
  const result = (await page.evaluate(pageScripts.readCards(spec, 0))) as CardsReading
  const products: ScrapedProduct[] = []
  for (const row of result.rows ?? []) {
    // Cards without price (out of stock, ads) are skipped, not misaligned.
    if (!row.name || !row.priceText) continue
    const price = parsePrice(row.priceText)
    if (price !== null) products.push({ name: row.name, price, priceText: row.priceText })
  }
  return products
}

export async function searchStore(page: Page, store: Store, query: string): Promise<ScrapedProduct[]> {
  const host = new URL(store.url).host

  await page.goto(store.url, { waitUntil: 'domcontentloaded' })
  await waitForStableDom(page)
  await page.evaluate(pageScripts.dismissOverlays()).catch(() => null)

  const searchSpec = await resolveSearchInput(page, host)
  await page.$eval(searchSpec.selector, el => {
    ;(el as HTMLInputElement).value = ''
  })
  await page.type(searchSpec.selector, query, { delay: 30 })
  await page.keyboard.press('Enter')

  await page.waitForNetworkIdle({ idleTime: 800, timeout: 10_000 }).catch(() => null)
  await waitForStableDom(page)
  await scrollToLoad(page)
  await waitForStableDom(page, 5_000)

  const productSpec = await resolveProducts(page, host, query)
  return extract(page, productSpec)
}

async function quoteStore(browser: Browser, store: Store, cart: CartItem[], deadline: number): Promise<StoreQuote> {
  const items: ItemQuote[] = []
  let page: Page | null = null
  try {
    page = await preparePage(browser, PAGE_TIMEOUT_MS)
    for (const item of cart) {
      if (Date.now() > deadline) {
        items.push({ item: item.name, quantity: item.quantity, status: 'skipped', message: 'Se agotó el tiempo de búsqueda.' })
        continue
      }
      try {
        const products = await searchStore(page, store, item.name)
        items.push(quoteItem(item, products))
      } catch (error) {
        if (error instanceof MissingApiKeyError) throw error
        console.error(`[scraper] failed ${store.id} | ${item.name}:`, (error as Error).message)
        items.push({ item: item.name, quantity: item.quantity, status: 'error', message: 'No se pudo leer el resultado.' })
      }
      await sleep(DELAY_BETWEEN_REQUESTS_MS)
    }
    return { storeId: store.id, storeName: store.name, url: store.url, items, ...totalStore(items) }
  } catch (error) {
    if (error instanceof MissingApiKeyError) throw error
    console.error(`[scraper] store ${store.id} failed:`, (error as Error).message)
    const padded = cart.map((item, i) => items[i] ?? { item: item.name, quantity: item.quantity, status: 'error' as const })
    return { storeId: store.id, storeName: store.name, url: store.url, items: padded, ...totalStore(padded), error: 'No se pudo consultar la tienda.' }
  } finally {
    await page?.close().catch(() => null)
  }
}

/**
 * Searches every cart item in every store and returns per-store totals plus
 * the cheapest combination. Stores run in parallel; items run sequentially
 * per store to stay polite and avoid bans.
 */
export async function priceCart(cart: CartItem[], { storeIds, budgetMs }: { storeIds?: string[]; budgetMs: number }): Promise<CartQuote> {
  const selected = storeIds?.length ? allStores.filter(store => storeIds.includes(store.id)) : allStores
  const deadline = Date.now() + budgetMs
  const browser = await launchBrowser()
  try {
    const quotes = await Promise.all(selected.map(store => quoteStore(browser, store, cart, deadline)))
    return summarizeCart(cart, quotes)
  } finally {
    await browser.close().catch(() => null)
  }
}
