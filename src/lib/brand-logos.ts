// Admin-only visual asset lookup — resolves a vehicle's `make` string (as
// typed/decoded on a parts_request or vehicle_request) to a logo file under
// public/brands/*.png, purely for the admin requests tables' VÉHICULE
// column.
//
// This is intentionally NOT wired to the public "Marques prises en charge"
// section (src/components/home/brands.tsx) — that component has its own
// hardcoded 12-brand list and never scans this directory. Adding a new file
// here only makes it available to this lookup; it never appears on the
// public site on its own.
//
// The file set is a static snapshot of public/brands (checked at review
// time), not a filesystem scan — this module has to stay usable from client
// components (the resizable/sortable admin table), where fs access isn't an
// option anyway.
const BRAND_LOGO_FILES = new Set([
  'acura', 'alfaromeo', 'audi', 'bentley', 'bmw', 'buick', 'byd', 'cadillac', 'chery', 'chevrolet',
  'chrysler', 'citroen', 'dacia', 'daewoo', 'dodge', 'ferrari', 'fiat', 'ford', 'geely', 'genesis',
  'gmc', 'haval', 'honda', 'hyundai', 'infiniti', 'isuzu', 'jaguar', 'jeep', 'kia', 'lamborghini',
  'landrover', 'lexus', 'lincoln', 'maserati', 'mazda', 'mercedes-benz', 'mini', 'mitsubishi', 'nissan',
  'opel', 'peugeot', 'porsche', 'ram', 'renault', 'renault-samsung', 'rollsroyce', 'seat', 'skoda',
  'ssangyong', 'subaru', 'suzuki', 'tesla', 'toyota', 'volkswagen', 'volvo',
])

// A few common spellings that don't collapse to their filename by simple
// lowercasing (kept separate from the "strip separators" fallback below so
// e.g. "Mercedes" alone still resolves without accidentally matching
// something else).
const BRAND_ALIASES: Record<string, string> = {
  mercedes: 'mercedes-benz',
  'mercedes benz': 'mercedes-benz',
  'land rover': 'landrover',
  'rolls royce': 'rollsroyce',
  'rolls-royce': 'rollsroyce',
  'alfa romeo': 'alfaromeo',
  vw: 'volkswagen',
  chevy: 'chevrolet',
  'renault samsung': 'renault-samsung',
}

export function getBrandLogoPath(make: string | null | undefined): string | null {
  if (!make) return null
  const norm = make.trim().toLowerCase()
  if (!norm) return null

  if (BRAND_LOGO_FILES.has(norm)) return `/brands/${norm}.png`

  const aliased = BRAND_ALIASES[norm]
  if (aliased) return `/brands/${aliased}.png`

  const collapsed = norm.replace(/[\s_-]+/g, '')
  if (BRAND_LOGO_FILES.has(collapsed)) return `/brands/${collapsed}.png`

  return null
}
