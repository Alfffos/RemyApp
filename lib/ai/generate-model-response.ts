import { generateText } from 'ai'

export const DEFAULT_MODEL = 'google/gemini-3.8-flash'

export interface GenerateModelResponseOptions {
  /** Instrucciones de comportamiento para el modelo (rol, tono, formato). */
  instructions?: string
  /** ID de modelo del AI Gateway con formato `proveedor/modelo`. */
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

export async function generateModelResponse(
  prompt: string,
  { instructions, model = DEFAULT_MODEL }: GenerateModelResponseOptions = {},
): Promise<ModelResponse> {
  const result = await generateText({
    model,
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
