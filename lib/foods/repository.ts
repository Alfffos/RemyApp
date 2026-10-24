import foodsData from '@/data/foods.json'

/** Valores nutricionales por cada 100 g. */
export interface Food {
  alimentos: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
}

const foods: Food[] = foodsData

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Nombres reales de la tabla, para pasárselos al modelo y que no invente alimentos. */
export async function listFoodNames(): Promise<string[]> {
  return foods.map((food) => food.alimentos)
}

/**
 * Equivale a `WHERE Alimentos LIKE '%termino%'` con collation insensible a mayúsculas y acentos.
 * Prioriza la coincidencia exacta y luego los nombres más cortos (los más genéricos).
 *
 * Cuando SQL Server sea accesible, basta con reemplazar esta función por una consulta
 * parametrizada con `mssql`; el resto del flujo no cambia.
 */
export async function findFoodsByName(term: string, limit = 3): Promise<Food[]> {
  const needle = normalize(term)
  if (!needle) return []

  return foods
    .filter((food) => normalize(food.alimentos).includes(needle))
    .sort((a, b) => {
      const aExact = normalize(a.alimentos) === needle ? 0 : 1
      const bExact = normalize(b.alimentos) === needle ? 0 : 1
      return aExact - bExact || a.alimentos.length - b.alimentos.length
    })
    .slice(0, limit)
}
