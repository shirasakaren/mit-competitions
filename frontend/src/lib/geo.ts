/**
 * City geometry for the Indonesia map view. The dataset's location field
 * carries Google-places style strings ("Bandung, Jawa Barat, Indonesia"),
 * so each bucket label is reduced to its city segment and matched against
 * this table (with a few aliases for spelling variants). Coordinates are
 * approximate city centers, good enough for pin placement on a
 * province-level map.
 */

export interface CityMeta {
  name: string
  lon: number
  lat: number
  /** Province name as spelled in the bundled GeoJSON
   * (public/indonesia-provinces.json, source: superpikar/indonesia-geojson). */
  province: string
}

const CITIES: CityMeta[] = [
  { name: 'Jakarta', lon: 106.8456, lat: -6.2088, province: 'DKI JAKARTA' },
  { name: 'Bandung', lon: 107.6191, lat: -6.9175, province: 'JAWA BARAT' },
  { name: 'Bekasi', lon: 106.9756, lat: -6.2383, province: 'JAWA BARAT' },
  { name: 'Depok', lon: 106.7942, lat: -6.4025, province: 'JAWA BARAT' },
  { name: 'Bogor', lon: 106.806, lat: -6.5971, province: 'JAWA BARAT' },
  { name: 'Cirebon', lon: 108.5523, lat: -6.732, province: 'JAWA BARAT' },
  { name: 'Tasikmalaya', lon: 108.2207, lat: -7.3274, province: 'JAWA BARAT' },
  { name: 'Tangerang', lon: 106.6319, lat: -6.1783, province: 'PROBANTEN' },
  { name: 'Surabaya', lon: 112.7521, lat: -7.2575, province: 'JAWA TIMUR' },
  { name: 'Malang', lon: 112.6304, lat: -7.9797, province: 'JAWA TIMUR' },
  { name: 'Surakarta', lon: 110.8243, lat: -7.5755, province: 'JAWA TENGAH' },
  { name: 'Semarang', lon: 110.4167, lat: -6.9667, province: 'JAWA TENGAH' },
  { name: 'Yogyakarta', lon: 110.3688, lat: -7.7971, province: 'DAERAH ISTIMEWA YOGYAKARTA' },
  { name: 'Medan', lon: 98.6722, lat: 3.5952, province: 'SUMATERA UTARA' },
  { name: 'Palembang', lon: 104.7754, lat: -2.9761, province: 'SUMATERA SELATAN' },
  { name: 'Padang', lon: 100.4172, lat: -0.9471, province: 'SUMATERA BARAT' },
  { name: 'Pekanbaru', lon: 101.4478, lat: 0.5071, province: 'RIAU' },
  { name: 'Batam', lon: 104.0305, lat: 1.0456, province: 'RIAU' },
  { name: 'Jambi', lon: 103.6131, lat: -1.6101, province: 'JAMBI' },
  { name: 'Bengkulu', lon: 102.2655, lat: -3.8006, province: 'BENGKULU' },
  { name: 'Bandar Lampung', lon: 105.2668, lat: -5.3971, province: 'LAMPUNG' },
  { name: 'Pangkalpinang', lon: 106.1147, lat: -2.129, province: 'BANGKA BELITUNG' },
  { name: 'Banda Aceh', lon: 95.316, lat: 5.5483, province: 'DI. ACEH' },
  { name: 'Makassar', lon: 119.4327, lat: -5.1477, province: 'SULAWESI SELATAN' },
  { name: 'Kendari', lon: 122.513, lat: -3.9985, province: 'SULAWESI TENGGARA' },
  { name: 'Palu', lon: 119.8598, lat: -0.9, province: 'SULAWESI TENGAH' },
  { name: 'Manado', lon: 124.8421, lat: 1.4748, province: 'SULAWESI UTARA' },
  { name: 'Gorontalo', lon: 123.0622, lat: 0.5435, province: 'GORONTALO' },
  { name: 'Balikpapan', lon: 116.8529, lat: -1.2379, province: 'KALIMANTAN TIMUR' },
  { name: 'Samarinda', lon: 117.1536, lat: -0.5022, province: 'KALIMANTAN TIMUR' },
  { name: 'Pontianak', lon: 109.3425, lat: -0.0263, province: 'KALIMANTAN BARAT' },
  { name: 'Banjarmasin', lon: 114.5944, lat: -3.3186, province: 'KALIMANTAN SELATAN' },
  { name: 'Denpasar', lon: 115.2126, lat: -8.6705, province: 'BALI' },
  { name: 'Mataram', lon: 116.1167, lat: -8.5833, province: 'NUSATENGGARA BARAT' },
  { name: 'Kupang', lon: 123.607, lat: -10.1772, province: 'NUSA TENGGARA TIMUR' },
  { name: 'Ambon', lon: 128.1821, lat: -3.6954, province: 'MALUKU' },
  { name: 'Jayapura', lon: 140.7181, lat: -2.5337, province: 'IRIAN JAYA TIMUR' },
]

const BY_KEY = new Map(CITIES.map((c) => [c.name.toLowerCase(), c]))

const ALIASES: Record<string, string> = {
  'surakarta / solo': 'surakarta',
  solo: 'surakarta',
  makasar: 'makassar',
  ujungpandang: 'makassar',
  jogja: 'yogyakarta',
  yogya: 'yogyakarta',
  sleman: 'yogyakarta',
  bantul: 'yogyakarta',
  'tangerang selatan': 'tangerang',
  tangsel: 'tangerang',
  'banda aceh': 'banda aceh',
}

/** Reduces a raw location label ("Bandung, Jawa Barat, Indonesia") to a
 * display city name ("Bandung"), or null if it is not a mapped city. */
export function cityOf(label: string): string | null {
  const first = label.split(',')[0]?.trim() ?? ''
  const lower = first.toLowerCase()
  if (lower.startsWith('jakarta')) return 'Jakarta'
  const key = ALIASES[lower] ?? lower
  return BY_KEY.get(key)?.name ?? null
}

/** Full metadata for a raw label, if it maps to a known city. */
export function cityMetaOf(label: string): CityMeta | null {
  const name = cityOf(label)
  if (!name) return null
  return BY_KEY.get(name.toLowerCase()) ?? null
}
