// Pure helpers shared by the scraper and the cart summary. No browser or network
// dependencies so they can be unit tested with `node --test`.

export interface CartItem {
  name: string
  quantity: number
}

export interface ScrapedProduct {
  name: string
  price: number
  priceText: string
}

export type ItemStatus = 'found' | 'not_found' | 'error' | 'skipped'

export interface ItemQuote {
  item: string
  quantity: number
  status: ItemStatus
  product?: ScrapedProduct
  subtotal?: number
  message?: string
}

export interface StoreQuote {
  storeId: string
  storeName: string
  url: string
  items: ItemQuote[]
  total: number
  missing: number
  error?: string
}

export interface MixedItemQuote extends ItemQuote {
  storeId: string | null
}

export interface CartQuote {
  stores: StoreQuote[]
  cheapestStoreId: string | null
  mixed: { total: number; missing: number; items: MixedItemQuote[] }
  generatedAt: string
}

const PRICE_RE = /\d[\d.,]*/

/** Parses '$ 1.234,56' (AR format) and '1234.5' alike. */
export function parsePrice(text: string): number | null {
  const match = text.replace(/\u00a0/g, ' ').match(PRICE_RE)
  if (!match) return null
  let raw = match[0].replace(/[.,]+$/, '')
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.')
  else if ((raw.match(/\./g)?.length ?? 0) > 1 || /\.\d{3}$/.test(raw)) raw = raw.replace(/\./g, '')
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function tokens(text: string): string[] {
  return normalize(text).split(' ').filter(token => token.length >= 3)
}

/**
 * Picks the cheapest product among the ones whose name best matches the query.
 * Store search results often include loosely related products (e.g. "Leche"
 * returning chocolate milk), so the highest token overlap wins first.
 */
export function pickBestMatch(query: string, products: ScrapedProduct[]): ScrapedProduct | null {
  const wanted = tokens(query)
  if (!wanted.length) return null
  let best: ScrapedProduct | null = null
  let bestScore = 0
  for (const product of products) {
    if (!(product.price > 0)) continue
    const name = ` ${normalize(product.name)} `
    const score = wanted.filter(token => name.includes(` ${token}`)).length / wanted.length
    if (score > bestScore || (score === bestScore && best && product.price < best.price)) {
      best = product
      bestScore = score
    }
  }
  return bestScore > 0 ? best : null
}

export function quoteItem(item: CartItem, products: ScrapedProduct[]): ItemQuote {
  const product = pickBestMatch(item.name, products)
  if (!product) return { item: item.name, quantity: item.quantity, status: 'not_found' }
  return { item: item.name, quantity: item.quantity, status: 'found', product, subtotal: round(product.price * item.quantity) }
}

export function totalStore(items: ItemQuote[]): { total: number; missing: number } {
  return {
    total: round(items.reduce((sum, quote) => sum + (quote.subtotal ?? 0), 0)),
    missing: items.filter(quote => quote.status !== 'found').length,
  }
}

/** Builds the overall quote: per-store totals, cheapest single store and a mixed cart. */
export function summarizeCart(cart: CartItem[], stores: StoreQuote[]): CartQuote {
  const ranked = stores
    .filter(store => !store.error && store.missing < cart.length)
    .sort((a, b) => a.missing - b.missing || a.total - b.total)

  const mixedItems: MixedItemQuote[] = cart.map((item, index) => {
    let best: MixedItemQuote | null = null
    for (const store of stores) {
      const quote = store.items[index]
      if (quote?.status === 'found' && (!best || (quote.subtotal ?? 0) < (best.subtotal ?? 0))) best = { ...quote, storeId: store.storeId }
    }
    return best ?? { item: item.name, quantity: item.quantity, status: 'not_found', storeId: null }
  })

  return {
    stores,
    cheapestStoreId: ranked[0]?.storeId ?? null,
    mixed: { ...totalStore(mixedItems), items: mixedItems },
    generatedAt: new Date().toISOString(),
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
