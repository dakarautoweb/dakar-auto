// Captured/modelled Auto.dev v2 VIN decode bodies — tests never call the
// real API. Only decode-relevant fields are kept (the live payload also
// carries links/examples/account info, which the provider ignores).

// Real response shape for WBAKV210500V39117 (a European-market BMW):
// HTTP 200, VIN valid, manufacturer recognized from the WMI, but no model
// record and no year anywhere. This is the regression case for the
// "partial" status — it used to surface as "Service Temporarily Unavailable".
export const PARTIAL_BMW_VIN = 'WBAKV210500V39117'
export const PARTIAL_BMW_BODY = {
  vin: PARTIAL_BMW_VIN,
  vinValid: true,
  wmi: 'WBA',
  origin: 'Germany',
  squishVin: 'WBAKV210500V3',
  checkDigit: '5',
  checksum: true,
  type: 'Passenger Car',
  ambiguous: false,
  make: 'BMW',
  vehicle: {
    vin: PARTIAL_BMW_VIN,
    wmi: 'WBA',
    make: 'BMW',
    model: '',
    type: 'PASSENGER CAR',
    manufacturer: 'Bayerische Motoren Werke AG',
  },
}

export const FULL_VIN = '1HGCM82633A004352'
export const FULL_BODY = {
  vin: FULL_VIN,
  vinValid: true,
  ambiguous: false,
  make: 'Honda',
  model: 'Accord',
  trim: 'EX',
  body: 'Sedan',
  engine: '3.0L V6',
  drive: 'FWD',
  transmission: 'Automatic',
  fuel: 'Gasoline',
  vehicle: { vin: FULL_VIN, year: 2003, make: 'Honda', model: 'Accord' },
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
