import { useEffect, useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'
import { cityMetaOf, cityOf } from '@/lib/geo'
import { formatNumber, formatPercent } from '@/lib/format'
import type { AnalyticsBucket } from '@/lib/api/types'

interface GeoFeature {
  type: 'Feature'
  properties: { Propinsi: string; [k: string]: unknown }
  geometry: unknown
  rsmKey?: string
}

interface GeoCollection {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

/** Computes a mercator center/scale pair that fits the whole geography
 * (including every small island) inside the SVG viewport, so the map is
 * always centered regardless of the dataset's bounds. */
function fitGeography(geo: GeoCollection, width: number, height: number) {
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  const walk = (c: unknown) => {
    if (!Array.isArray(c) || typeof c[0] !== 'number') {
      if (Array.isArray(c)) for (const x of c) walk(x)
      return
    }
    const lon = c[0] as number
    const lat = c[1] as number
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  for (const f of geo.features) walk((f.geometry as { coordinates: unknown }).coordinates)
  const pad = 36
  const w = width - pad * 2
  const h = height - pad * 2
  const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
  const dx = ((maxLon - minLon) * Math.PI) / 180
  const dy = mercY(maxLat) - mercY(minLat)
  const scale = Math.min(w / dx, h / dy)
  return {
    center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2] as [number, number],
    scale,
  }
}

interface PinnedCity {
  name: string
  count: number
  lon: number
  lat: number
  province: string
}

/**
 * Indonesia map (province polygons from the vendored GeoJSON, rendered by
 * react-simple-maps / d3-geo) with customer counts pinned per city. Fully
 * monochrome and theme adaptive: polygons and pins use `var(--foreground)`
 * and `var(--background)` so light and dark mode both just work. Hovering
 * a pin shows the details card below the map.
 */
export function LocationMap({ data }: { data: AnalyticsBucket[] }) {
  const [geo, setGeo] = useState<GeoCollection | null>(null)
  const [hover, setHover] = useState<PinnedCity | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/indonesia-provinces.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setGeo(d as GeoCollection)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const cities = useMemo(() => {
    const byName = new Map<string, PinnedCity>()
    for (const bucket of data) {
      const meta = cityMetaOf(bucket.label)
      if (!meta) continue
      const existing = byName.get(meta.name)
      if (existing) {
        existing.count += bucket.count
      } else {
        byName.set(meta.name, {
          name: meta.name,
          count: bucket.count,
          lon: meta.lon,
          lat: meta.lat,
          province: meta.province,
        })
      }
    }
    return [...byName.values()].sort((a, b) => b.count - a.count)
  }, [data])

  const maxCity = Math.max(1, ...cities.map((c) => c.count))

  const provinceTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of cities) {
      map.set(c.province, (map.get(c.province) ?? 0) + c.count)
    }
    return map
  }, [cities])
  const maxProvince = Math.max(1, ...provinceTotals.values())

  const listed = useMemo(() => {
    const total = cities.reduce((a, c) => a + c.count, 0)
    return cities.map((c) => ({ ...c, percent: total > 0 ? (c.count / total) * 100 : 0 }))
  }, [cities])

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <AppLottie src={ANIM.locations} size={22} />
        <div>
          <h3 className="text-sm font-medium">Top locations on the map</h3>
          <p className="text-xs text-muted-foreground">
            Customer counts pinned per city across the Indonesian provinces. Hover a pin for details.
          </p>
        </div>
      </div>

      {!geo ? (
        <div className="mt-3">
          <Skeleton className="h-[420px] w-full" />
        </div>
      ) : (
        <div className="mt-3 rounded-lg border bg-muted/20">
          <ComposableMap
            projection="geoMercator"
projectionConfig={fitGeography(geo, 800, 460)}
            width={800}
            height={460}
            style={{ width: '100%', height: 'auto' }}
          >
            <Geographies geography={geo as never}>
              {({ geographies }: { geographies: { rsmKey: string; properties: Record<string, unknown> }[] }) =>
                geographies.map((g) => {
                  const province = (g.properties as GeoFeature['properties']).Propinsi ?? ''
                  const total = provinceTotals.get(province) ?? 0
                  const intensity = total > 0 ? 0.14 + 0.55 * (total / maxProvince) : 0
                  return (
                    <Geography
                      key={(g as GeoFeature).rsmKey ?? province}
                      geography={g as never}
                      fill={total > 0 ? 'var(--foreground)' : 'var(--muted)'}
                      opacity={total > 0 ? intensity : 0.12}
                      stroke="var(--background)"
                      strokeWidth={0.8}
                      style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                    />
                  )
                })
              }
            </Geographies>
            {cities.map((c) => (
              <Marker
                key={c.name}
                coordinates={[c.lon, c.lat]}
                onMouseEnter={() => setHover(c)}
                onMouseLeave={() => setHover(null)}
              >
                <circle
                  r={3 + 7 * (c.count / maxCity)}
                  fill="var(--foreground)"
                  fillOpacity={0.8}
                  stroke="var(--background)"
                  strokeWidth={1.2}
                  style={{ cursor: 'pointer' }}
                />
                <title>{`${c.name}: ${formatNumber(c.count)} customers`}</title>
              </Marker>
            ))}
          </ComposableMap>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {listed.map((c) => (
            <button
              key={c.name}
              type="button"
              onMouseEnter={() => setHover(c)}
              onMouseLeave={() => setHover(null)}
              className="rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              {c.name} <span className="tabular-nums opacity-70">{formatNumber(c.count)}</span>
            </button>
          ))}
        </div>
        {hover && (
          <div className="shrink-0 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <div className="font-medium">{hover.name}</div>
            <div className="text-muted-foreground">
              {hover.province} · {formatNumber(hover.count)} customers ·{' '}
              {formatPercent((hover.count / Math.max(1, listed.reduce((a, c) => a + c.count, 0))) * 100)}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export { cityOf }
