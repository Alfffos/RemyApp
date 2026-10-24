import { z } from 'zod'

/** Perfil que envía el frontend. Es el contrato de entrada de `POST /api/diet`. */
export const dietProfileSchema = z.object({
  caloriasObjetivo: z.number().int().min(1000).max(6000),
  objetivo: z.enum(['bajar', 'mantener', 'subir']),
  restricciones: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  dias: z.number().int().min(1).max(7).default(7),
  comidasPorDia: z.number().int().min(2).max(6).default(4),
})

export type DietProfile = z.infer<typeof dietProfileSchema>

/** Plan que diseña el modelo: solo nombres de alimentos y gramos, sin valores nutricionales. */
export const dietDayDraftSchema = z.object({
  comidas: z
    .array(
      z.object({
        nombre: z.string().describe('Por ejemplo "Desayuno", "Almuerzo" o "Cena"'),
        alimentos: z.array(
          z.object({
            alimento: z.string().describe('Nombre exacto de la lista de alimentos disponibles'),
            gramos: z.number().positive(),
          }),
        ),
      }),
    )
    .describe('Las comidas de ese día'),
})

export type DietDayDraft = z.infer<typeof dietDayDraftSchema>

export interface DietDraft {
  dias: Array<DietDayDraft & { dia: string }>
}

export interface Nutrients {
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
}

export interface EnrichedItem {
  /** Nombre que propuso el modelo. */
  solicitado: string
  /** Nombre real encontrado en la base de datos, o `null` si no hubo coincidencia. */
  alimento: string | null
  gramos: number
  nutrientes: Nutrients | null
}

export interface EnrichedMeal {
  nombre: string
  alimentos: EnrichedItem[]
  total: Nutrients
}

export interface EnrichedDay {
  dia: string
  comidas: EnrichedMeal[]
  total: Nutrients
}

export interface EnrichedPlan {
  dias: EnrichedDay[]
  promedioDiario: Nutrients
  noEncontrados: string[]
}
