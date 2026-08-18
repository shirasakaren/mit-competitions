import { useMemo } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useTheme } from '@/app/providers/theme'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
]

// A little Easter egg for the settings footer — picked once per visit.
const FUN_ANIMATIONS = [
  ANIM.cat,
  ANIM.catFace,
  ANIM.cow,
  ANIM.duck,
  ANIM.cat2,
  ANIM.bunny,
  ANIM.koala,
  ANIM.mascot,
  ANIM.greenMascot,
  ANIM.walkingTaco,
  ANIM.wumpus,
]

export default function Settings() {
  const { preference, setPreference } = useTheme()
  const funAnim = useMemo(() => FUN_ANIMATIONS[Math.floor(Math.random() * FUN_ANIMATIONS.length)], [])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">Personalize how the console looks.</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Appearance</h3>
          <AppLottie src={ANIM.sparkle} size={18} />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">Choose a theme, or follow your system setting.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPreference(opt.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors',
                preference === opt.value
                  ? 'border-foreground/60 bg-accent'
                  : 'border-border hover:bg-accent/50',
              )}
            >
              <opt.icon className="size-5" strokeWidth={1.75} />
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col items-center gap-2 p-6 text-center">
        <AppLottie src={funAnim} size={110} />
        <p className="text-xs text-muted-foreground">You found a friend. Refresh for another.</p>
      </Card>
    </div>
  )
}
