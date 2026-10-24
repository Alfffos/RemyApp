import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const _geistSans = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RemyApp',
  description: 'Conexión con modelos de IA mediante el AI SDK de Vercel',
}

export const viewport: Viewport = {
  themeColor: '#0f1115',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="bg-background">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
