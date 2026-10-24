import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

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
