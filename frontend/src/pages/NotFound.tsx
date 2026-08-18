import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'

// A different 404 scene on every visit — the "lost" crew takes turns.
const LOST_SCENES = [ANIM.error404, ANIM.error404Alt, ANIM.astronaut, ANIM.wumpus, ANIM.crowPeople]

export default function NotFound() {
  const scene = useMemo(() => LOST_SCENES[Math.floor(Math.random() * LOST_SCENES.length)], [])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <AppLottie src={scene} size={180} />
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This section doesn't exist. Head back to the overview dashboard.
      </p>
      <Button asChild size="sm">
        <Link to="/">Back to Overview</Link>
      </Button>
    </div>
  )
}
