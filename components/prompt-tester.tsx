'use client'

import { useState } from 'react'
import type { ModelResponse } from '@/lib/ai/generate-model-response'

export function PromptTester() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState<ModelResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido')
      setResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="prompt" className="text-sm text-muted-foreground">
          Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Escribe algo para el modelo..."
          className="w-full resize-none rounded-lg border border-border bg-muted p-3 text-base leading-relaxed text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isLoading || prompt.trim().length === 0}
          className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {isLoading ? 'Generando...' : 'Generar respuesta'}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground">
          {error}
        </p>
      )}

      {response && (
        <section aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4">
          <p className="whitespace-pre-wrap leading-relaxed text-pretty">{response.text}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {response.model} · {response.usage.totalTokens ?? '?'} tokens
          </p>
        </section>
      )}
    </div>
  )
}
