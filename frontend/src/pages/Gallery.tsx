import { Card } from '@/components/ui/card'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIMATIONS } from '@/lib/animations'

/**
 * The full animation catalog: every .lottie asset the app ships, rendered
 * live in a grid. Doubles as a guaranteed-usage surface — any animation
 * dropped into src/assets/animations appears here with zero code changes.
 */
export default function Gallery() {
  const entries = Object.entries(ANIMATIONS).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Animation Gallery</h2>
        <p className="text-sm text-muted-foreground">
          Every animation in the catalog, forced monochrome and theme-adaptive.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map(([name, src]) => (
          <Card
            key={name}
            className="flex flex-col items-center gap-2 p-4 text-center"
          >
            <AppLottie src={src} size={84} />
            <span className="w-full truncate text-xs text-muted-foreground">{name}</span>
          </Card>
        ))}
      </div>
    </div>
  )
}
