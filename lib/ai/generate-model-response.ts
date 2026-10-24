import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText, type ModelMessage } from 'ai'

/** Modelo predeterminado conservado de la configuración de dev. */
export const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'

export interface GenerateModelResponseOptions {
  /** Instrucciones de comportamiento para el modelo (rol, tono, formato). */
  instructions?: string
  /** ID de modelo de OpenRouter, por ejemplo `nvidia/nemotron-3.5-lightning:free`. */
  model?: string
}

export interface ModelResponse {
  text: string
  model: string
  usage: {
    inputTokens: number | undefined
    outputTokens: number | undefined
    totalTokens: number | undefined
  }
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('Falta la variable de entorno OPENROUTER_API_KEY')
    this.name = 'MissingApiKeyError'
  }
}

export class ModelJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelJsonError'
  }
}

/** Extracts the first JSON object from a model reply, tolerating code fences and prose. */
export function parseModelJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?|```$/gm, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new ModelJsonError(`El modelo no devolvió JSON: ${cleaned.slice(0, 200)}`)
  try {
    return JSON.parse(match[0])
  } catch (error) {
    throw new ModelJsonError(`JSON inválido del modelo: ${(error as Error).message}`)
  }
}

/** Multi-turn call that expects a JSON object back. Used by the price scraper. */
export async function generateModelJson(
  messages: ModelMessage[],
  { instructions, model = process.env.OPENROUTER_SCRAPER_MODEL || DEFAULT_MODEL }: GenerateModelResponseOptions = {},
): Promise<{ json: unknown; text: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new MissingApiKeyError()

  const openrouter = createOpenRouter({ apiKey })
  const result = await generateText({
    model: openrouter(model),
    instructions,
    messages,
    temperature: 0,
    maxRetries: 3,
  })
  return { json: parseModelJson(result.text), text: result.text }
}

export async function generateModelResponse(
  prompt: string,
  { instructions, model = DEFAULT_MODEL }: GenerateModelResponseOptions = {},
): Promise<ModelResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new MissingApiKeyError()

  const openrouter = createOpenRouter({ apiKey })

  const result = await generateText({
    model: openrouter(model),
    instructions,
    prompt,
  })

  return {
    text: result.text,
    model,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
    },
  }
}
