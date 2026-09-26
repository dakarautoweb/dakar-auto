// Every make we have a real logo for (public/brands/*.png) — kept in sync
// with brand-logos.ts's BRAND_LOGO_FILES set (that file resolves a
// *typed/decoded* make string to a logo path for admin display; this one is
// the reverse direction, a fixed list to populate the manual-entry
// dropdown). Display name is what gets stored as `ConfirmedVehicle.make`;
// `slug` is only ever used to build the /brands/<slug>.png path.
export type VehicleBrand = { name: string; slug: string }

// Sentinel stored as the make value while "Other" is selected but no
// manual brand name has been typed yet — never a real make, and never sent
// to onConfirm (ManualVehicleForm substitutes the free-text value first).
export const OTHER_BRAND_VALUE = '__other__'

const BRANDS: VehicleBrand[] = [
  { name: 'Acura', slug: 'acura' },
  { name: 'Alfa Romeo', slug: 'alfaromeo' },
  { name: 'Audi', slug: 'audi' },
  { name: 'Bentley', slug: 'bentley' },
  { name: 'BMW', slug: 'bmw' },
  { name: 'Buick', slug: 'buick' },
  { name: 'BYD', slug: 'byd' },
  { name: 'Cadillac', slug: 'cadillac' },
  { name: 'Chery', slug: 'chery' },
  { name: 'Chevrolet', slug: 'chevrolet' },
  { name: 'Chrysler', slug: 'chrysler' },
  { name: 'Citroën', slug: 'citroen' },
  { name: 'Dacia', slug: 'dacia' },
  { name: 'Daewoo', slug: 'daewoo' },
  { name: 'Dodge', slug: 'dodge' },
  { name: 'Ferrari', slug: 'ferrari' },
  { name: 'Fiat', slug: 'fiat' },
  { name: 'Ford', slug: 'ford' },
  { name: 'Geely', slug: 'geely' },
  { name: 'Genesis', slug: 'genesis' },
  { name: 'GMC', slug: 'gmc' },
  { name: 'Haval', slug: 'haval' },
  { name: 'Honda', slug: 'honda' },
  { name: 'Hyundai', slug: 'hyundai' },
  { name: 'Infiniti', slug: 'infiniti' },
  { name: 'Isuzu', slug: 'isuzu' },
  { name: 'Jaguar', slug: 'jaguar' },
  { name: 'Jeep', slug: 'jeep' },
  { name: 'Kia', slug: 'kia' },
  { name: 'Lamborghini', slug: 'lamborghini' },
  { name: 'Land Rover', slug: 'landrover' },
  { name: 'Lexus', slug: 'lexus' },
  { name: 'Lincoln', slug: 'lincoln' },
  { name: 'Maserati', slug: 'maserati' },
  { name: 'Mazda', slug: 'mazda' },
  { name: 'Mercedes-Benz', slug: 'mercedes-benz' },
  { name: 'MINI', slug: 'mini' },
  { name: 'Mitsubishi', slug: 'mitsubishi' },
  { name: 'Nissan', slug: 'nissan' },
  { name: 'Opel', slug: 'opel' },
  { name: 'Peugeot', slug: 'peugeot' },
  { name: 'Porsche', slug: 'porsche' },
  { name: 'RAM', slug: 'ram' },
  { name: 'Renault', slug: 'renault' },
  { name: 'Renault Samsung', slug: 'renault-samsung' },
  { name: 'Rolls-Royce', slug: 'rollsroyce' },
  { name: 'SEAT', slug: 'seat' },
  { name: 'Skoda', slug: 'skoda' },
  { name: 'SsangYong', slug: 'ssangyong' },
  { name: 'Subaru', slug: 'subaru' },
  { name: 'Suzuki', slug: 'suzuki' },
  { name: 'Tesla', slug: 'tesla' },
  { name: 'Toyota', slug: 'toyota' },
  { name: 'Volkswagen', slug: 'volkswagen' },
  { name: 'Volvo', slug: 'volvo' },
]

export const VEHICLE_BRANDS: readonly VehicleBrand[] = [...BRANDS].sort((a, b) => a.name.localeCompare(b.name))

export function brandLogoSrc(slug: string): string {
  return `/brands/${slug}.png`
}

// Maps a provider-decoded make (e.g. Auto.dev's "BMW", or an all-caps
// "MERCEDES-BENZ") onto our own display name, so a VIN-prefilled make
// selects the matching dropdown entry. Null when we have no such brand —
// the caller then falls back to the free-text "Other" make.
export function findBrandByName(name: string): VehicleBrand | null {
  const needle = name.trim().toLowerCase()
  if (!needle) return null
  return VEHICLE_BRANDS.find((brand) => brand.name.toLowerCase() === needle) ?? null
}
