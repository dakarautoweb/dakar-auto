import type { PartCategoryKey } from './parts-catalog'

// Maps each top-level category to one representative icon from the real
// Dakar Auto SVG library (public/parts/svg/<NN-category>/...) — used for
// the sidebar + breadcrumb category glyph (see icons.tsx CategoryIcon).
export const PART_CATEGORY_SVG: Record<PartCategoryKey, string> = {
  lighting: '/parts/svg/01-eclairage/01-phares-avant.svg',
  braking: '/parts/svg/02-freinage/01-plaquettes-de-frein.svg',
  engine: '/parts/svg/03-moteur/04-culasse-et-soupapes.svg',
  suspension: '/parts/svg/04-suspension-direction/01-amortisseurs.svg',
  body: '/parts/svg/05-carrosserie/01-pare-chocs.svg',
  electrical: '/parts/svg/06-electricite/01-batteries.svg',
  cooling: '/parts/svg/07-refroidissement-clim/01-radiateurs-moteur.svg',
  interior: '/parts/svg/08-interieur/01-sieges-et-mecanismes.svg',
  transmission: '/parts/svg/09-transmission/06-boites-de-vitesses.svg',
  filters: '/parts/svg/10-filtres/01-filtres-a-huile.svg',
}

// Maps every subcategory key (src/i18n/dictionaries/*.json ->
// categories.items[].subcategories[].key, mirrored in
// parts-catalog.ts's PART_SUBCATEGORY_KEYS) to its closest match in the
// Dakar Auto SVG library (see icons.tsx SubcategoryIcon). This app's
// subcategory taxonomy doesn't line up 1:1 with the library's per-folder
// file list, so a few entries intentionally borrow from a different
// category folder than their own key's category (e.g. "ignition-parts" is
// filed under Engine here, but its real icon lives at
// 06-electricite/04-bougies-d-allumage.svg in the library), or reuse a
// closely related neighboring icon where the library has no exact 1:1
// subcategory (e.g. "struts" reuses the shock-absorber icon; "shift-
// solenoids" reuses the gearbox icon) — always the closest available
// visual match, never an unrelated one. "transmission-filter" appears
// under both the Filters and Transmission categories in this app and
// shares one entry here since it's the same real-world part either way.
export const PART_SUBCATEGORY_SVG: Record<string, string> = {
  // Lighting
  headlights: '/parts/svg/01-eclairage/01-phares-avant.svg',
  taillights: '/parts/svg/01-eclairage/02-feux-arriere.svg',
  'fog-lights': '/parts/svg/01-eclairage/03-antibrouillards.svg',
  'turn-signals': '/parts/svg/01-eclairage/04-clignotants.svg',
  bulbs: '/parts/svg/01-eclairage/06-ampoules.svg',
  'led-modules': '/parts/svg/01-eclairage/07-ballasts-et-modules.svg',
  'light-control-modules': '/parts/svg/01-eclairage/12-connecteurs-et-supports.svg',
  'license-plate-lights': '/parts/svg/01-eclairage/08-eclairage-de-plaque.svg',

  // Braking
  'brake-pads': '/parts/svg/02-freinage/01-plaquettes-de-frein.svg',
  'brake-rotors': '/parts/svg/02-freinage/02-disques-de-frein.svg',
  'brake-calipers': '/parts/svg/02-freinage/03-etriers-de-frein.svg',
  'brake-hoses': '/parts/svg/02-freinage/04-flexibles-durites-de-frein.svg',
  'abs-sensors': '/parts/svg/02-freinage/05-capteurs-abs.svg',
  'master-cylinder': '/parts/svg/02-freinage/06-maitre-cylindre.svg',
  'brake-booster': '/parts/svg/02-freinage/07-servofrein.svg',
  'parking-brake': '/parts/svg/02-freinage/08-pieces-de-frein-a-main.svg',
  'brake-fluid-hardware': '/parts/svg/02-freinage/09-liquide-de-frein-accessoires.svg',

  // Engine (two entries borrow from the Electrical folder — see note above)
  'engine-assembly': '/parts/svg/03-moteur/04-culasse-et-soupapes.svg',
  'timing-parts': '/parts/svg/03-moteur/01-distribution.svg',
  'belts-tensioners': '/parts/svg/03-moteur/02-courroies-et-galets.svg',
  'gaskets-seals': '/parts/svg/03-moteur/03-joints-moteur.svg',
  'engine-mounts': '/parts/svg/03-moteur/09-supports-moteur.svg',
  'fuel-system-parts': '/parts/svg/03-moteur/12-pompes-a-carburant.svg',
  'ignition-parts': '/parts/svg/06-electricite/04-bougies-d-allumage.svg',
  'engine-sensors': '/parts/svg/06-electricite/09-capteurs-moteur.svg',
  'oil-system-parts': '/parts/svg/03-moteur/07-pompes-a-huile.svg',

  // Suspension / steering
  'shock-absorbers': '/parts/svg/04-suspension-direction/01-amortisseurs.svg',
  struts: '/parts/svg/04-suspension-direction/01-amortisseurs.svg',
  springs: '/parts/svg/04-suspension-direction/02-ressorts.svg',
  'control-arms': '/parts/svg/04-suspension-direction/04-bras-de-suspension.svg',
  'ball-joints': '/parts/svg/04-suspension-direction/05-rotules-de-suspension.svg',
  bushings: '/parts/svg/04-suspension-direction/07-silentblocs.svg',
  'tie-rods': '/parts/svg/04-suspension-direction/10-biellettes-de-direction.svg',
  'stabilizer-links': '/parts/svg/04-suspension-direction/06-biellettes-stabilisatrices.svg',
  'wheel-hubs-bearings': '/parts/svg/04-suspension-direction/08-moyeux-et-roulements.svg',

  // Body
  'front-bumper': '/parts/svg/05-carrosserie/01-pare-chocs.svg',
  'rear-bumper': '/parts/svg/05-carrosserie/01-pare-chocs.svg',
  fenders: '/parts/svg/05-carrosserie/02-ailes.svg',
  hood: '/parts/svg/05-carrosserie/03-capots.svg',
  doors: '/parts/svg/05-carrosserie/04-portes.svg',
  mirrors: '/parts/svg/05-carrosserie/07-retroviseurs.svg',
  grilles: '/parts/svg/05-carrosserie/06-calandres.svg',
  'trunk-tailgate': '/parts/svg/05-carrosserie/05-hayons-et-coffres.svg',
  'body-trim': '/parts/svg/05-carrosserie/13-joints-et-baguettes.svg',

  // Electrical
  battery: '/parts/svg/06-electricite/01-batteries.svg',
  alternator: '/parts/svg/06-electricite/02-alternateurs.svg',
  starter: '/parts/svg/06-electricite/03-demarreurs.svg',
  'wiring-harnesses': '/parts/svg/06-electricite/08-faisceaux-et-connecteurs.svg',
  'fuses-relays': '/parts/svg/06-electricite/07-relais-et-fusibles.svg',
  switches: '/parts/svg/06-electricite/11-interrupteurs-et-commodos.svg',
  sensors: '/parts/svg/06-electricite/09-capteurs-moteur.svg',
  'control-modules': '/parts/svg/06-electricite/10-calculateurs.svg',
  horns: '/parts/svg/06-electricite/12-avertisseurs-sonores.svg',

  // Cooling
  radiator: '/parts/svg/07-refroidissement-clim/01-radiateurs-moteur.svg',
  'cooling-fan': '/parts/svg/07-refroidissement-clim/04-ventilateurs.svg',
  'water-pump': '/parts/svg/07-refroidissement-clim/02-pompes-a-eau.svg',
  thermostat: '/parts/svg/07-refroidissement-clim/03-thermostats.svg',
  'coolant-hoses': '/parts/svg/07-refroidissement-clim/05-durites-et-raccords.svg',
  'expansion-tank': '/parts/svg/07-refroidissement-clim/06-vases-d-expansion.svg',
  'radiator-cap': '/parts/svg/07-refroidissement-clim/06-vases-d-expansion.svg',
  'temperature-sensors': '/parts/svg/07-refroidissement-clim/07-sondes-de-temperature.svg',
  'oil-transmission-cooler': '/parts/svg/07-refroidissement-clim/01-radiateurs-moteur.svg',

  // Interior
  seats: '/parts/svg/08-interieur/01-sieges-et-mecanismes.svg',
  'seat-belts': '/parts/svg/08-interieur/02-ceintures-de-securite.svg',
  'dashboard-parts': '/parts/svg/08-interieur/04-tableaux-de-bord.svg',
  'center-console': '/parts/svg/08-interieur/05-consoles-centrales.svg',
  'steering-wheel': '/parts/svg/08-interieur/06-volants-et-garnitures.svg',
  'door-panels': '/parts/svg/08-interieur/03-garnitures-de-portes.svg',
  'interior-trim': '/parts/svg/08-interieur/07-pommeaux-et-soufflets.svg',
  'window-switches': '/parts/svg/08-interieur/09-leve-vitres.svg',
  'floor-mats-carpets': '/parts/svg/08-interieur/12-tapis-et-protections.svg',

  // Transmission (one entry borrows from the Filters folder — see note above)
  'gearbox-assembly': '/parts/svg/09-transmission/06-boites-de-vitesses.svg',
  clutch: '/parts/svg/09-transmission/01-kits-d-embrayage.svg',
  'torque-converter': '/parts/svg/09-transmission/07-convertisseurs-de-couple.svg',
  'transmission-mount': '/parts/svg/09-transmission/14-supports-de-boite.svg',
  'transmission-filter': '/parts/svg/10-filtres/05-filtres-de-boite-automatique.svg',
  'shift-solenoids': '/parts/svg/09-transmission/06-boites-de-vitesses.svg',
  'valve-body': '/parts/svg/09-transmission/15-joints-et-roulements.svg',
  'cv-axles': '/parts/svg/09-transmission/09-joints-homocinetiques.svg',
  driveshaft: '/parts/svg/09-transmission/11-arbres-de-transmission.svg',

  // Filters ("transmission-filter" already listed above)
  'engine-air-filter': '/parts/svg/10-filtres/02-filtres-a-air-moteur.svg',
  'cabin-air-filter': '/parts/svg/10-filtres/04-filtres-d-habitacle.svg',
  'oil-filter': '/parts/svg/10-filtres/01-filtres-a-huile.svg',
  'fuel-filter': '/parts/svg/10-filtres/03-filtres-a-carburant.svg',
  'hydraulic-filter': '/parts/svg/10-filtres/06-filtres-hydrauliques.svg',
  'filter-housing': '/parts/svg/10-filtres/07-boitiers-de-filtre.svg',
  'filter-kits': '/parts/svg/10-filtres/08-joints-et-accessoires.svg',
}
