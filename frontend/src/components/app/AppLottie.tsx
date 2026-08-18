import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { cn } from '@/lib/utils'

interface AppLottieProps {
  src: string | undefined
  size?: number
  loop?: boolean
  autoplay?: boolean
  className?: string
}

/**
 * Renders a .lottie animation forced to monochrome, theme-adaptive color:
 * grayscale removes any source color (most assets are already black-only),
 * dark:invert flips black<->white so it stays visible against the
 * dark-mode background without needing per-asset recoloring.
 */
export function AppLottie({ src, size = 96, loop = true, autoplay = true, className }: AppLottieProps) {
  if (!src) return null
  return (
    <DotLottieReact
      src={src}
      loop={loop}
      autoplay={autoplay}
      style={{ width: size, height: size }}
      className={cn('grayscale dark:invert', className)}
    />
  )
}
