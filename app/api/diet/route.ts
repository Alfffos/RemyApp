import { MissingApiKeyError } from '@/lib/ai/generate-model-response'
import { designDiet } from '@/lib/diet/design-diet'
import { enrichPlan } from '@/lib/diet/enrich-plan'
import { dietProfileSchema } from '@/lib/diet/schemas'

export const maxDuration = 120

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = dietProfileSchema.safeParse(json)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Solicitud inválida' },
      { status: 400 },
    )
  }

  try {
    const draft = await designDiet(parsed.data)
    const plan = await enrichPlan(draft)
    return Response.json(plan)
  } catch (error) {
    console.error('[v0] diet generation failed:', error)

    if (error instanceof MissingApiKeyError) {
      return Response.json(
        { error: 'Falta configurar OPENROUTER_API_KEY en las variables de entorno.' },
        { status: 500 },
      )
    }

    return Response.json({ error: 'No se pudo generar la dieta' }, { status: 500 })
  }
}
