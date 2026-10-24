export interface Store {
  id: string
  name: string
  url: string
}

export const stores: Store[] = [
  { id: 'arcoiris', name: 'Arcoiris en casa', url: 'https://arcoirisencasa.com.ar/Login.asp' },
  { id: 'coto', name: 'Coto', url: 'https://www.coto.com.ar/' },
]
