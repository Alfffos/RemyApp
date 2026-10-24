import { z } from 'zod'

export interface Store {
  id: string
  name: string
  url: string
}

export const stores: Store[] = [
  { id: 'arcoiris', name: 'Supermercados Arcoiris', url: 'https://arcoirisencasa.com.ar/Login.asp' },
  { id: 'coto', name: 'Coto', url: 'https://www.coto.com.ar/' },
  { id: 'carrefour', name: 'Carrefour', url: 'https://www.carrefour.com.ar/' },
  { id: 'jumbo', name: 'Jumbo', url: 'https://www.jumbo.com.ar/' },
  { id: 'disco', name: 'Disco', url: 'https://www.disco.com.ar/' },
  { id: 'vea', name: 'Vea', url: 'https://www.vea.com.ar/' },
  { id: 'dia', name: 'Día', url: 'https://diaonline.supermercadosdia.com.ar/' },
  { id: 'changomas', name: 'ChangoMás', url: 'https://www.masonline.com.ar/' },
  { id: 'la-anonima', name: 'La Anónima', url: 'https://www.laanonima.com.ar/' },
  { id: 'cooperativa-obrera', name: 'Cooperativa Obrera', url: 'https://www.lacoopeencasa.coop/' },
  { id: 'libertad', name: 'Hipermercado Libertad', url: 'https://www.hiperlibertad.com.ar/' },
  { id: 'toledo', name: 'Supermercados Toledo', url: 'https://www.toledodigital.com.ar/' },
  { id: 'maxiconsumo', name: 'Maxiconsumo', url: 'https://maxiconsumo.com/' },
]

export const MAX_STORES = 6

const privateHost = /^(localhost|.*\.local|.*\.internal|.*\.localhost|\[.*\]|\d{1,3}(\.\d{1,3}){3})$/i

/** Public http(s) URL check. The scraper visits these from the server, so IPs and internal hosts are rejected. */
export function isPublicStoreUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.') && !privateHost.test(url.hostname)
  } catch {
    return false
  }
}

export const storeSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2, 'Ingresá el nombre del supermercado.').max(60, 'Usá hasta 60 caracteres.'),
  url: z.string().trim().max(300).refine(isPublicStoreUrl, 'Ingresá una URL pública válida, por ejemplo https://www.supermercado.com.ar'),
})

export function normalizeStoreUrl(value: string): string {
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed
}
