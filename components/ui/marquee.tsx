import { cn } from '@/lib/utils'

// Minimal Magic UI–style marquee: children scroll in a seamless loop.
// --duration and --gap are set through className, e.g. [--duration:20s].
// Pauses on hover; stops for reduced-motion users.
export function Marquee({ children, reverse = false, className }: { children: React.ReactNode; reverse?: boolean; className?: string }) {
  return (
    <div className={cn('lx-marquee group flex overflow-hidden [--duration:40s] [--gap:1rem] [gap:var(--gap)]', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden={i > 0 ? true : undefined}
          className={cn('lx-marquee-track flex shrink-0 justify-around [gap:var(--gap)] group-hover:[animation-play-state:paused]', reverse && '[animation-direction:reverse]')}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
