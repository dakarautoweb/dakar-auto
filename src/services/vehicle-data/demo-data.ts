// Small local dataset powering manual vehicle selection. Not exhaustive by
// design — swap for a real API-backed lookup later without changing the
// shape (make -> models) that the UI depends on.

export const VEHICLE_MAKES = [
  'Toyota',
  'Honda',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Ford',
  'Nissan',
  'Hyundai',
  'Volkswagen',
  'Renault',
  'Peugeot',
  'Citroën',
] as const

export const VEHICLE_MODELS_BY_MAKE: Record<string, readonly string[]> = {
  Toyota: ['Corolla', 'Camry', 'RAV4', 'Hilux', 'Land Cruiser'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V'],
  BMW: ['3 Series', '5 Series', 'X3', 'X5'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE'],
  Audi: ['A3', 'A4', 'Q5', 'Q7'],
  Ford: ['Fiesta', 'Focus', 'Ranger', 'Explorer'],
  Nissan: ['Micra', 'Qashqai', 'X-Trail', 'Navara'],
  Hyundai: ['i10', 'i20', 'Tucson', 'Santa Fe'],
  Volkswagen: ['Polo', 'Golf', 'Tiguan', 'Passat'],
  Renault: ['Clio', 'Mégane', 'Duster', 'Kadjar'],
  Peugeot: ['208', '308', '3008', '5008'],
  Citroën: ['C3', 'C4', 'C5 Aircross', 'Berlingo'],
}

export const VEHICLE_ENGINES = [
  '1.2L 4-Cylinder',
  '1.6L 4-Cylinder',
  '2.0L 4-Cylinder',
  '2.0L Turbo',
  '2.5L 4-Cylinder',
  '3.0L V6',
  '3.5L V6',
  'Diesel 1.5L',
  'Diesel 2.0L',
  'Hybrid',
  'Electric',
] as const

export function getVehicleYears(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let year = currentYear + 1; year >= 1990; year--) {
    years.push(year)
  }
  return years
}

export function getModelsForMake(make: string): readonly string[] {
  return VEHICLE_MODELS_BY_MAKE[make] ?? []
}
