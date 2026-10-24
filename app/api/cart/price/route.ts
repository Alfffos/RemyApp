import { cartRequestSchema } from '@/lib/cart/cart'
import { MissingApiKeyError } from '@/lib/ai/generate-model-response'
import { priceCart } from '@/lib/scraper/scraper'

export const runtime = 'nodejs'
export const maxDuration = 300

// Leave headroom inside maxDuration to close the browser and respond.
const SCRAPE_BUDGET_MS = 240_000

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = cartRequestSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Solicitud inválida' }, { status: 400 })
  }

  try {
    const quote = await priceCart(parsed.data.items, { stores: parsed.data.stores, budgetMs: SCRAPE_BUDGET_MS })
    return Response.json(quote)
  } catch (error) {
    console.error('[scraper] priceCart failed:', error)
    if (error instanceof MissingApiKeyError) {
      return Response.json({ error: 'Falta configurar OPENROUTER_API_KEY.' }, { status: 500 })
    }
    return Response.json({ error: 'No se pudieron consultar los precios. Probá de nuevo en unos minutos.' }, { status: 502 })
  }
}
