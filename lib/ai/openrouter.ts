import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { DEFAULT_MODEL, MissingApiKeyError } from '@/lib/ai/generate-model-response'

export function getOpenRouterModel(model: string = DEFAULT_MODEL) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new MissingApiKeyError()

  return createOpenRouter({ apiKey })(model)
}
