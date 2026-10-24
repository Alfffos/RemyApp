import { PromptTester } from '@/components/prompt-tester'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-balance">RemyApp</h1>
        <p className="leading-relaxed text-muted-foreground text-pretty">
          Prueba de conexión con un modelo de IA usando{' '}
          <code className="font-mono text-sm text-foreground">generateModelResponse()</code> y el AI SDK de Vercel.
        </p>
      </header>
      <PromptTester />
    </main>
  )
}
