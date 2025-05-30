// src/lib/category-mapping.ts

export const CATEGORY_CODES: Record<string, string> = {
  '01': 'Herramientas',
  '02': 'Fontanería',
  '03': 'Electricidad',
  '04': 'Pinturas y Accesorios',
  '05': 'Tornillería y Fijaciones',
  '06': 'Materiales de Construcción',
  '07': 'Jardinería',
  '08': 'Equipo de Seguridad',
  '09': 'Automotriz',
  '10': 'Limpieza',
  // Añade más categorías según sea necesario
};

export function getCategoryNameByCodePrefix(prefix: string): string | undefined {
  return CATEGORY_CODES[prefix];
}
