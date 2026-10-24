import { z } from 'zod'
import type { toDietProfile } from '@/lib/profile/profile'
import { MAX_STORES, storeSchema } from '@/lib/scraper/stores'
import type { CartItem } from './pricing'

export const MAX_CART_ITEMS = 25

export const cartItemSchema = z.object({
  name: z.string().trim().min(2, 'Cada producto necesita un nombre.').max(80, 'Usá nombres de hasta 80 caracteres.'),
  quantity: z.number().int().min(1).max(50),
})

export const cartRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Agregá al menos un producto.').max(MAX_CART_ITEMS, `El carrito admite hasta ${MAX_CART_ITEMS} productos.`),
  stores: z.array(storeSchema).min(1, 'Elegí al menos un supermercado.').max(MAX_STORES, `Podés comparar hasta ${MAX_STORES} supermercados.`),
})

export type CartRequest = z.infer<typeof cartRequestSchema>
export type DietProfile = ReturnType<typeof toDietProfile>

const staples: { name: string; quantity: number; excludeFor?: string[]; allergens?: string[] }[] = [
  { name: 'Leche', quantity: 3, excludeFor: ['vegan'], allergens: ['Leche'] },
  { name: 'Yogur natural', quantity: 4, excludeFor: ['vegan'], allergens: ['Leche'] },
  { name: 'Huevos', quantity: 1, excludeFor: ['vegan'], allergens: ['Huevo'] },
  { name: 'Pechuga de pollo', quantity: 2, excludeFor: ['vegan', 'vegetarian'] },
  { name: 'Tofu', quantity: 2, allergens: ['Soja'] },
  { name: 'Lentejas', quantity: 1 },
  { name: 'Arroz integral', quantity: 1 },
  { name: 'Fideos', quantity: 1, allergens: ['Trigo / gluten'] },
  { name: 'Avena', quantity: 1, allergens: ['Trigo / gluten'] },
  { name: 'Banana', quantity: 6 },
  { name: 'Manzana', quantity: 6 },
  { name: 'Tomate', quantity: 4 },
]

/**
 * Temporary cart derived from the profile until the diet model generates the
 * real shopping list. Respects diet type, allergies and shopping frequency.
 */
export function starterCart(profile: DietProfile): CartItem[] {
  const excluded = profile.food.excludedFoods.toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
  const multiplier = profile.schedule.duration === 'month' ? 4 : 1
  return staples
    .filter(item => !item.excludeFor?.includes(profile.food.diet))
    .filter(item => !item.allergens?.some(a => profile.food.allergies.includes(a)))
    .filter(item => !excluded.some(food => item.name.toLowerCase().includes(food)))
    .filter(item => item.name !== 'Tofu' || profile.food.diet !== 'omnivore')
    .map(item => ({ name: item.name, quantity: Math.min(50, item.quantity * multiplier) }))
}
