import { findFoodsByName } from '@/lib/foods/repository'
import type {
  DietDraft,
  EnrichedDay,
  EnrichedItem,
  EnrichedMeal,
  EnrichedPlan,
  Nutrients,
} from '@/lib/diet/schemas'

const EMPTY: Nutrients = { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function sum(items: Nutrients[]): Nutrients {
  const total = items.reduce(
    (acc, n) => ({
      calorias: acc.calorias + n.calorias,
      proteinas: acc.proteinas + n.proteinas,
      carbohidratos: acc.carbohidratos + n.carbohidratos,
      grasas: acc.grasas + n.grasas,
    }),
    EMPTY,
  )

  return {
    calorias: round(total.calorias),
    proteinas: round(total.proteinas),
    carbohidratos: round(total.carbohidratos),
    grasas: round(total.grasas),
  }
}

async function enrichItem(solicitado: string, gramos: number): Promise<EnrichedItem> {
  const [food] = await findFoodsByName(solicitado, 1)
  if (!food) return { solicitado, alimento: null, gramos, nutrientes: null }

  const factor = gramos / 100
  return {
    solicitado,
    alimento: food.alimentos,
    gramos,
    nutrientes: {
      calorias: round(food.calorias * factor),
      proteinas: round(food.proteinas * factor),
      carbohidratos: round(food.carbohidratos * factor),
      grasas: round(food.grasas * factor),
    },
  }
}

/** Pasos 2 y 3: busca cada alimento en la base y calcula los totales en código. */
export async function enrichPlan(draft: DietDraft): Promise<EnrichedPlan> {
  const noEncontrados = new Set<string>()

  const dias: EnrichedDay[] = await Promise.all(
    draft.dias.map(async (day) => {
      const comidas: EnrichedMeal[] = await Promise.all(
        day.comidas.map(async (meal) => {
          const alimentos = await Promise.all(
            meal.alimentos.map((item) => enrichItem(item.alimento, item.gramos)),
          )
          for (const item of alimentos) {
            if (!item.nutrientes) noEncontrados.add(item.solicitado)
          }
          const total = sum(alimentos.flatMap((i) => (i.nutrientes ? [i.nutrientes] : [])))
          return { nombre: meal.nombre, alimentos, total }
        }),
      )

      return { dia: day.dia, comidas, total: sum(comidas.map((c) => c.total)) }
    }),
  )

  const totalSemana = sum(dias.map((d) => d.total))
  const count = Math.max(dias.length, 1)

  return {
    dias,
    promedioDiario: {
      calorias: round(totalSemana.calorias / count),
      proteinas: round(totalSemana.proteinas / count),
      carbohidratos: round(totalSemana.carbohidratos / count),
      grasas: round(totalSemana.grasas / count),
    },
    noEncontrados: [...noEncontrados],
  }
}
