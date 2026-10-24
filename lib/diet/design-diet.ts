import { generateText, Output } from 'ai'
import { getOpenRouterModel } from '@/lib/ai/openrouter'
import { listFoodNames } from '@/lib/foods/repository'
import {
  dietDayDraftSchema,
  type DietDayDraft,
  type DietDraft,
  type DietProfile,
} from '@/lib/diet/schemas'

const INSTRUCTIONS = `Eres un nutricionista que diseña un día de una dieta semanal.
Reglas:
- Usa EXCLUSIVAMENTE nombres de alimentos de la lista que se te entrega, escritos exactamente igual.
- Indica solo el nombre del alimento y los gramos de cada porción. No calcules calorías ni macros.
- Respeta las restricciones y alergias del usuario.
- Reparte las calorías objetivo de forma razonable entre las comidas del día.`

async function designDay(
  profile: DietProfile,
  foodNames: string[],
  dayNumber: number,
): Promise<DietDayDraft> {
  const { output } = await generateText({
    model: getOpenRouterModel(),
    instructions: INSTRUCTIONS,
    output: Output.object({ schema: dietDayDraftSchema }),
    prompt: `Diseña el día ${dayNumber} de ${profile.dias} de una dieta con estas necesidades:
- Calorías objetivo del día: ${profile.caloriasObjetivo} kcal
- Objetivo: ${profile.objetivo} peso
- Comidas del día: exactamente ${profile.comidasPorDia}
- Restricciones: ${profile.restricciones.length ? profile.restricciones.join(', ') : 'ninguna'}
- Como es el día ${dayNumber}, procura que los alimentos principales sean distintos de los de otros días.

Alimentos disponibles:
${foodNames.join('\n')}`,
  })

  return output
}

/** Paso 1: el modelo diseña cada día en paralelo, eligiendo alimentos reales de la base. */
export async function designDiet(profile: DietProfile): Promise<DietDraft> {
  const foodNames = await listFoodNames()

  const days = await Promise.all(
    Array.from({ length: profile.dias }, (_, index) =>
      designDay(profile, foodNames, index + 1),
    ),
  )

  return {
    dias: days.map((day, index) => ({ ...day, dia: `Día ${index + 1}` })),
  }
}
