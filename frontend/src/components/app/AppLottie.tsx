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
 *
 * Sizing note (bug fix): the player library drops the `style` prop whenever
 * a `className` is present, so a bare <DotLottieReact style={{width,height}}>
 * is NOT actually constrained — on remount the canvas falls back to the
 * animation's intrinsic dimensions (e.g. Welcome.lottie is 428x123) and the
 * hero suddenly renders huge when navigating back to a page. The outer div
 * below is a hard, fixed-size box with overflow-hidden; inside it the
 * player's own 100%-sized wrapper/canvas can never escape it.
 */
export function AppLottie({ src, size = 96, loop = true, autoplay = true, className }: AppLottieProps) {
  if (!src) return null
  return (
    <div
      aria-hidden
      className={cn('shrink-0 overflow-hidden grayscale dark:invert', className)}
      style={{ width: size, height: size, lineHeight: 0 }}
    >
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
