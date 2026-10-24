import { z } from 'zod'
import { generateModelResponse } from '@/lib/ai/generate-model-response'

export const maxDuration = 60

const bodySchema = z.object({
  prompt: z.string().trim().min(1, 'El prompt no puede estar vacío').max(4000),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Solicitud inválida' },
      { status: 400 },
    )
  }

  try {
    const response = await generateModelResponse(parsed.data.prompt)
    return Response.json(response)
  } catch (error) {
    console.error('[v0] generateModelResponse failed:', error)

    const needsCreditCard =
      error instanceof Error && error.message.includes('valid credit card')
    if (needsCreditCard) {
      return Response.json(
        {
          error:
            'AI Gateway requiere una tarjeta registrada en tu cuenta de Vercel. Añádela en el dashboard (AI Gateway) para activar los créditos gratuitos.',
        },
        { status: 402 },
      )
    }

    return Response.json(
      { error: 'No se pudo generar la respuesta del modelo' },
      { status: 500 },
    )
  }
}
