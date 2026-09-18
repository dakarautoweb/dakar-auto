// Centralized structural config for the parts category / subcategory
// selector. Localized labels (title/description) live in the i18n
// dictionaries (src/i18n/dictionaries/{en,fr}.json under `categories.items`)
// keyed by the same `key`/subcategory `key` used here — this file only
// carries the non-localized shape: ordering, image paths, and which icon
// renders for which subcategory. Keep category keys and subcategory keys in
// sync with both dictionary files (`npm run lint` / a build will surface a
// missing dictionary entry as a type error since Dictionary is inferred
// from the JSON shape).

export const PART_CATEGORY_KEYS = [
  'lighting',
  'braking',
  'engine',
  'suspension',
  'body',
  'electrical',
  'cooling',
  'interior',
  'transmission',
  'filters',
] as const

export type PartCategoryKey = (typeof PART_CATEGORY_KEYS)[number]

// Local image slot per top-level category. Files are expected but not
// required — CategoryImage (src/components/parts/category-image.tsx) falls
// back to a themed gradient + icon treatment when the file 404s, so the UI
// never shows a broken image while real photography/renders are added.
export const PART_CATEGORY_IMAGES: Record<PartCategoryKey, string> = {
  lighting: '/parts/categories/lighting.webp',
  braking: '/parts/categories/braking.webp',
  engine: '/parts/categories/engine.webp',
  suspension: '/parts/categories/suspension.webp',
  body: '/parts/categories/body.webp',
  electrical: '/parts/categories/electrical.webp',
  cooling: '/parts/categories/cooling.webp',
  interior: '/parts/categories/interior.webp',
  transmission: '/parts/categories/transmission.webp',
  filters: '/parts/categories/filters.webp',
}

// Ordered subcategory keys per category. Must match the `subcategories[].key`
// entries under the corresponding `categories.items[]` dictionary entry —
// this array controls display order and pairs each key with its icon via
// SubcategoryIcon (src/components/home/icons.tsx).
export const PART_SUBCATEGORY_KEYS: Record<PartCategoryKey, string[]> = {
  lighting: [
    'headlights',
    'taillights',
    'fog-lights',
    'turn-signals',
    'bulbs',
    'led-modules',
    'light-control-modules',
    'license-plate-lights',
  ],
  braking: [
    'brake-pads',
    'brake-rotors',
    'brake-calipers',
    'brake-hoses',
    'abs-sensors',
    'master-cylinder',
    'brake-booster',
    'parking-brake',
    'brake-fluid-hardware',
  ],
  engine: [
    'engine-assembly',
    'timing-parts',
    'belts-tensioners',
    'gaskets-seals',
    'engine-mounts',
    'fuel-system-parts',
    'ignition-parts',
    'engine-sensors',
    'oil-system-parts',
  ],
  suspension: [
    'shock-absorbers',
    'struts',
    'springs',
    'control-arms',
    'ball-joints',
    'bushings',
    'tie-rods',
    'stabilizer-links',
    'wheel-hubs-bearings',
  ],
  body: ['front-bumper', 'rear-bumper', 'fenders', 'hood', 'doors', 'mirrors', 'grilles', 'trunk-tailgate', 'body-trim'],
  electrical: [
    'battery',
    'alternator',
    'starter',
    'wiring-harnesses',
    'fuses-relays',
    'switches',
    'sensors',
    'control-modules',
    'horns',
  ],
  cooling: [
    'radiator',
    'cooling-fan',
    'water-pump',
    'thermostat',
    'coolant-hoses',
    'expansion-tank',
    'radiator-cap',
    'temperature-sensors',
    'oil-transmission-cooler',
  ],
  interior: [
    'seats',
    'seat-belts',
    'dashboard-parts',
    'center-console',
    'steering-wheel',
    'door-panels',
    'interior-trim',
    'window-switches',
    'floor-mats-carpets',
  ],
  transmission: [
    'gearbox-assembly',
    'clutch',
    'torque-converter',
    'transmission-mount',
    'transmission-filter',
    'shift-solenoids',
    'valve-body',
    'cv-axles',
    'driveshaft',
  ],
  filters: [
    'engine-air-filter',
    'cabin-air-filter',
    'oil-filter',
    'fuel-filter',
    'transmission-filter',
    'hydraulic-filter',
    'filter-housing',
    'filter-kits',
  ],
}

// Sentinel used for both the top-level "can't find your category" tile and
// each category's "Other" subcategory tile — never a real category/
// subcategory key, so it can't collide with one.
export const OTHER_KEY = 'other'
