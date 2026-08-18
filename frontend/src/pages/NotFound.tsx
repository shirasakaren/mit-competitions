import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <AppLottie src={ANIM.crowPeople} size={140} />
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
