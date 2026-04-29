import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '../lib/utils'

interface KpiCardProps {
  label: string
  value: string
  sublabel?: string
  icon: ReactNode
  accent?: 'violet' | 'emerald' | 'rose' | 'amber' | 'sky'
  delta?: { value: number; label?: string }
}

const ACCENT_MAP: Record<NonNullable<KpiCardProps['accent']>, string> = {
  violet: 'from-violet-500/15 to-violet-500/0 text-violet-300',
  emerald: 'from-emerald-500/15 to-emerald-500/0 text-emerald-300',
  rose: 'from-rose-500/15 to-rose-500/0 text-rose-300',
  amber: 'from-amber-500/15 to-amber-500/0 text-amber-300',
  sky: 'from-sky-500/15 to-sky-500/0 text-sky-300',
}

export function KpiCard({
  label,
  value,
  sublabel,
  icon,
  accent = 'violet',
  delta,
}: KpiCardProps) {
  const trendColor =
    delta == null
      ? 'text-muted'
      : delta.value > 0
        ? 'text-emerald-400 bg-emerald-400/10'
        : delta.value < 0
          ? 'text-rose-400 bg-rose-400/10'
          : 'text-muted bg-white/5'
  const TrendIcon =
    delta == null ? Minus : delta.value > 0 ? ArrowUpRight : delta.value < 0 ? ArrowDownRight : Minus

  return (
    <div
      className={cn(
        'card relative overflow-hidden p-4 min-h-[118px] flex flex-col justify-between',
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br pointer-events-none opacity-80',
          ACCENT_MAP[accent],
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <p className="label text-muted">{label}</p>
        <div className={cn('p-1.5 rounded-lg bg-white/5', ACCENT_MAP[accent].split(' ').slice(-1))}>
          {icon}
        </div>
      </div>
      <div className="relative">
        <div className="text-[26px] font-semibold tracking-tight text-white leading-none">
          {value}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-xs text-muted truncate">{sublabel ?? ''}</span>
          {delta != null && (
            <span
              className={cn(
                'pill shrink-0',
                trendColor,
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {Math.abs(delta.value).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
