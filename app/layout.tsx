import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Remy · Tu alimentación, a tu ritmo',
  description: 'Configurá tu perfil, tus objetivos y tus preferencias para preparar tu plan alimentario.',
}
export const viewport: Viewport = { themeColor: '#f6f7f2' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es-AR"><body>{children}</body></html>
}
