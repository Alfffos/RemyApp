import { z } from 'zod'
import { MAX_STORES, stores as knownStores, type Store } from '../scraper/stores.ts'

export const meals = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Colación'] as const
export const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const
export const allergies = ['Leche', 'Huevo', 'Maní', 'Frutos secos', 'Soja', 'Trigo / gluten', 'Pescados', 'Mariscos', 'Otra'] as const

export interface ProfileDraft {
  age: string; height: string; weight: string; sex: string
  dailyActivity: string; exerciseDays: string; exerciseMinutes: string; exerciseIntensity: string
  goal: string; muscleGain: string; targetWeight: string
  diet: string; allergies: string[]; otherAllergy: string; excludedFoods: string
  meals: string[]; days: string[]; times: Record<string, string>; duration: string; cookingTime: string
  pregnancy: string; breastfeeding: string; medicalCondition: string
  supermarkets: Store[]; selectedSupermarkets: string[]
}

export function emptyProfile(): ProfileDraft {
  return {
    age: '', height: '', weight: '', sex: '',
    dailyActivity: '', exerciseDays: '', exerciseMinutes: '', exerciseIntensity: '',
    goal: '', muscleGain: '', targetWeight: '',
    diet: '', allergies: [], otherAllergy: '', excludedFoods: '',
    meals: ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'], days: [...weekdays],
    times: {}, duration: 'week', cookingTime: '',
    pregnancy: '', breastfeeding: '', medicalCondition: '',
    supermarkets: knownStores.map(store => ({ ...store })), selectedSupermarkets: [],
  }
}

function numeric(label: string, min: number, max: number, integer = false) {
  return z.string().trim().refine(
    value => value !== '' && Number.isFinite(Number(value)) && Number(value) >= min &&
      Number(value) <= max && (!integer || Number.isInteger(Number(value))),
    `${label}: ingresá ${integer ? 'un entero' : 'un valor'} entre ${min} y ${max}.`,
  )
}
const yesNo = z.enum(['no', 'yes'], { error: 'Elegí una opción.' })
const basics = z.object({
  age: numeric('Edad', 1, 120, true), height: numeric('Altura', 80, 250), weight: numeric('Peso', 20, 400),
  sex: z.enum(['female', 'male'], { error: 'Elegí el sexo utilizado para el cálculo.' }),
})
const activity = z.object({
  dailyActivity: z.enum(['seated', 'moving', 'physical'], { error: 'Seleccioná tu actividad cotidiana.' }),
  exerciseDays: numeric('Días de ejercicio', 0, 7, true), exerciseMinutes: z.string(), exerciseIntensity: z.string(),
}).superRefine((data, ctx) => {
  if (Number(data.exerciseDays) > 0) {
    if (!numeric('Duración', 5, 360, true).safeParse(data.exerciseMinutes).success)
      ctx.addIssue({ code: 'custom', path: ['exerciseMinutes'], message: 'Ingresá una duración entre 5 y 360 minutos.' })
    if (!['light', 'moderate', 'intense'].includes(data.exerciseIntensity))
      ctx.addIssue({ code: 'custom', path: ['exerciseIntensity'], message: 'Seleccioná la intensidad del ejercicio.' })
  }
})
const objective = z.object({
  goal: z.enum(['lose', 'maintain', 'gain'], { error: 'Elegí tu objetivo.' }), muscleGain: z.string(),
  targetWeight: z.string().refine(v => v === '' || numeric('Peso objetivo', 20, 400).safeParse(v).success, 'Ingresá un peso objetivo entre 20 y 400 kg.'),
}).superRefine((data, ctx) => {
  if (data.goal === 'gain' && !yesNo.safeParse(data.muscleGain).success)
    ctx.addIssue({ code: 'custom', path: ['muscleGain'], message: 'Indicá si buscás aumentar masa muscular.' })
})
const food = z.object({
  diet: z.enum(['omnivore', 'vegetarian', 'vegan'], { error: 'Elegí un tipo de alimentación.' }),
  allergies: z.array(z.enum(allergies)), otherAllergy: z.string().max(300, 'Usá hasta 300 caracteres.'),
  excludedFoods: z.string().max(1000, 'Usá hasta 1000 caracteres.'),
  meals: z.array(z.enum(meals)).min(1, 'Elegí al menos una comida.'),
  days: z.array(z.enum(weekdays)).min(1, 'Elegí al menos un día.'),
  times: z.record(z.string(), z.string().refine(v => v === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), 'Ingresá un horario válido.')),
  duration: z.enum(['week', 'month']), cookingTime: z.enum(['', '15', '30', '60']),
}).superRefine((data, ctx) => {
  if (data.allergies.includes('Otra') && !data.otherAllergy.trim())
    ctx.addIssue({ code: 'custom', path: ['otherAllergy'], message: 'Indicá la alergia o intolerancia adicional.' })
})
const supermarkets = z.object({
  selectedSupermarkets: z.array(z.string())
    .min(1, 'Elegí al menos un supermercado.')
    .max(MAX_STORES, `Podés elegir hasta ${MAX_STORES} supermercados.`),
})
export const stepSchemas = [basics, activity, objective, food, supermarkets] as const
export const SUMMARY_STEP = stepSchemas.length
export type FieldErrors = Record<string, string>

export function validateStep(step: number, draft: ProfileDraft): FieldErrors {
  const errors: FieldErrors = {}
  const result = stepSchemas[step].safeParse(draft)
  if (!result.success) for (const issue of result.error.issues) errors[String(issue.path[0])] ??= issue.message
  if (step === 2 && draft.targetWeight && draft.goal !== 'maintain') {
    const target = Number(draft.targetWeight), current = Number(draft.weight)
    if ((draft.goal === 'lose' && target >= current) || (draft.goal === 'gain' && target <= current))
      errors.targetWeight = draft.goal === 'lose' ? 'El peso objetivo debe ser menor al actual.' : 'El peso objetivo debe ser mayor al actual.'
  }
  return errors
}

export function reviewReasons(draft: ProfileDraft): string[] {
  return [
    Number(draft.age) < 18 ? 'El plan automático está previsto para personas de 18 años o más.' : '',
    draft.pregnancy === 'yes' ? 'El embarazo requiere una planificación nutricional específica.' : '',
    draft.breastfeeding === 'yes' ? 'La lactancia requiere una planificación nutricional específica.' : '',
    draft.medicalCondition === 'yes' ? 'Las condiciones médicas o indicaciones profesionales deben evaluarse antes de preparar el plan.' : '',
  ].filter(Boolean)
}

export function selectedStores(draft: ProfileDraft): Store[] {
  return draft.supermarkets.filter(store => draft.selectedSupermarkets.includes(store.id))
}

// Contract for the future planner. Inactive conditional answers are omitted.
export function toDietProfile(draft: ProfileDraft) {
  return {
    age: Number(draft.age), heightCm: Number(draft.height), weightKg: Number(draft.weight), sex: draft.sex,
    activity: {
      daily: draft.dailyActivity, exerciseDaysPerWeek: Number(draft.exerciseDays),
      exerciseMinutes: Number(draft.exerciseDays) > 0 ? Number(draft.exerciseMinutes) : 0,
      exerciseIntensity: Number(draft.exerciseDays) > 0 ? draft.exerciseIntensity : null,
    },
    objective: {
      type: draft.goal, muscleGain: draft.goal === 'gain' && draft.muscleGain === 'yes',
      targetWeightKg: draft.goal !== 'maintain' && draft.targetWeight ? Number(draft.targetWeight) : null,
    },
    food: {
      diet: draft.diet, allergies: draft.allergies.filter(a => a !== 'Otra'),
      otherAllergy: draft.allergies.includes('Otra') ? draft.otherAllergy.trim() : '', excludedFoods: draft.excludedFoods.trim(),
    },
    schedule: {
      days: draft.days, meals: draft.meals.map(name => ({ name, time: draft.times[name] || null })),
      duration: draft.duration, maxCookingMinutes: draft.cookingTime ? Number(draft.cookingTime) : null,
    },
    supermarkets: selectedStores(draft),
    health: { pregnancy: draft.pregnancy === 'yes', breastfeeding: draft.breastfeeding === 'yes', medicalCondition: draft.medicalCondition === 'yes' },
  }
}
