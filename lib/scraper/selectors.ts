import type { ModelMessage } from 'ai'
import type { Page } from 'puppeteer-core'
import { z } from 'zod'
import { generateModelJson, ModelJsonError } from '@/lib/ai/generate-model-response'
import { parsePrice } from '@/lib/cart/pricing'
import { pageScripts, type CardsReading, type InputInspection, type ProductSpec, type SearchSpec } from './page-scripts'

const MAX_HTML_CHARS = 60_000
const MAX_LLM_ATTEMPTS = 3

export class SelectorError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SelectorError'
  }
}

type Kind = 'search_input' | 'products'

// Learned selectors per domain. In-memory: survives while the serverless
// instance stays warm. Move to a database to share across instances.
const globalCache = globalThis as unknown as { __remySelectorCache?: Map<string, unknown> }
const cache = (globalCache.__remySelectorCache ??= new Map<string, unknown>())
const cacheKey = (host: string, kind: Kind) => `${host}::${kind}`

const SYSTEM_PROMPT =
  'You are an expert in CSS selectors for web scraping. You receive a simplified HTML ' +
  "snapshot of a supermarket website (repeated siblings are collapsed, marked with 'N more siblings omitted'). " +
  'Reply ONLY with a JSON object, no prose. Rules for selectors: prefer #id, [name=...], [type=search], ' +
  '[placeholder*=...] and stable semantic classes. Avoid nth-child/nth-of-type, and avoid auto-generated or ' +
  "hashed class names (e.g. 'css-1a2b3c', 'sc-xxxx')."

const searchPrompt = (html: string) =>
  'Find the main product search text input of this store.\n' +
  `Return: {"selector": "<css selector>"}\n\nHTML:\n${html}`

const productsPrompt = (query: string, html: string) =>
  `The page shows search results for "${query}". Identify the product list.\n` +
  'Return JSON with:\n' +
  '- "card": CSS selector matching EVERY product card in the results (one element per product).\n' +
  '- "name": CSS selector for the product name, RELATIVE to the card (matches a descendant of the card).\n' +
  '- "price": CSS selector for the final price, RELATIVE to the card. Pick the current/sale price, ' +
  'not crossed-out or per-unit prices.\n' +
  'Ignore navigation, filters, sidebars, carousels of unrelated products.\n' +
  `Format: {"card": "...", "name": "...", "price": "..."}\n\nHTML:\n${html}`

const searchSpecSchema = z.object({ selector: z.string().min(1) })
const productSpecSchema = z.object({ card: z.string().min(1), name: z.string().min(1), price: z.string().min(1) })

export async function validateSearchInput(page: Page, spec: SearchSpec): Promise<void> {
  const result = (await page.evaluate(pageScripts.inspectInput(spec.selector))) as InputInspection
  if (result.error) throw new SelectorError(`Selector ${JSON.stringify(spec.selector)}: ${result.error}.`)
  if (!result.isText) throw new SelectorError('Element is not a text input.')
  if (!result.visible || !result.enabled) throw new SelectorError('Element exists but is not visible/enabled. Pick a visible text input.')
}

export async function validateProducts(page: Page, spec: ProductSpec, sample = 6): Promise<void> {
  const result = (await page.evaluate(pageScripts.readCards(spec, sample))) as CardsReading
  if (result.error) throw new SelectorError(result.error)
  const count = result.count ?? 0
  if (count < 2) throw new SelectorError(`'card' matched ${count} elements; it must match every product card (>= 2).`)
  const rows = result.rows ?? []
  const good = rows.filter(row => row.name && row.priceText && parsePrice(row.priceText) !== null).length
  if (good / rows.length < 0.6) {
    throw new SelectorError(
      `Only ${good}/${rows.length} sampled cards had a non-empty name AND a numeric price. ` +
        "'name'/'price' must be relative to the card and contain the visible text.",
    )
  }
}

async function resolve<T>(
  page: Page,
  host: string,
  kind: Kind,
  buildPrompt: (html: string) => string,
  schema: z.ZodType<T>,
  validate: (page: Page, spec: T) => Promise<void>,
): Promise<T> {
  const key = cacheKey(host, kind)
  const cached = cache.get(key) as T | undefined
  if (cached) {
    try {
      await validate(page, cached)
      return cached
    } catch (error) {
      console.warn(`[scraper] [${host}] cached ${kind} selector broke:`, (error as Error).message)
      cache.delete(key)
    }
  }

  console.info(`[scraper] [${host}] asking model for ${kind} selector`)
  const html = (await page.evaluate(pageScripts.slimHtml(60, MAX_HTML_CHARS))) as string
  const messages: ModelMessage[] = [{ role: 'user', content: buildPrompt(html) }]
  let lastError = 'unknown'

  for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt++) {
    let reply = ''
    try {
      const { json, text } = await generateModelJson(messages, { instructions: SYSTEM_PROMPT })
      reply = text
      const spec = schema.parse(json)
      await validate(page, spec)
      cache.set(key, spec)
      return spec
    } catch (error) {
      if (!(error instanceof SelectorError || error instanceof ModelJsonError || error instanceof z.ZodError)) throw error
      lastError = error instanceof z.ZodError ? 'JSON did not have the requested keys.' : error.message
      console.warn(`[scraper] [${host}] attempt ${attempt} rejected:`, lastError)
      if (reply) messages.push({ role: 'assistant', content: reply })
      messages.push({ role: 'user', content: `Rejected: ${lastError} Try a different selector.` })
    }
  }
  throw new SelectorError(`Could not resolve ${kind} for ${host}: ${lastError}`)
}

export function resolveSearchInput(page: Page, host: string): Promise<SearchSpec> {
  return resolve(page, host, 'search_input', searchPrompt, searchSpecSchema, validateSearchInput)
}

export function resolveProducts(page: Page, host: string, query: string): Promise<ProductSpec> {
  return resolve(page, host, 'products', html => productsPrompt(query, html), productSpecSchema, validateProducts)
}
