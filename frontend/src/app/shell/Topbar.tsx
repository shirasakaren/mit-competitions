import { Menu, Moon, Sun, Monitor, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/app/providers/theme'
import { useApiHealth } from '@/lib/api/hooks'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'

function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  const icons = { light: Sun, dark: Moon, system: Monitor }
  const Icon = icons[preference]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Icon className="size-4" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setPreference('light')}>
          <Sun className="size-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPreference('dark')}>
          <Moon className="size-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPreference('system')}>
          <Monitor className="size-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StatusPill() {
  const { data, isError } = useApiHealth()
  const ok = !!data?.ok && !isError
  return (
    <div className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground sm:flex">
      {ok ? (
        <AppLottie src={ANIM.done} size={14} />
      ) : (
        <AppLottie src={ANIM.processing} size={14} />
      )}
      {ok ? 'API online' : 'Connecting…'}
    </div>
  )
}

export function Topbar({ onMenuClick, title }: { onMenuClick: () => void; title: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-13 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <StatusPill />
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-1.5 text-xs text-muted-foreground sm:flex"
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
          <Command className="size-3.5" />K
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
