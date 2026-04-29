import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface TabsProps {
  value: string
  onChange: (v: string) => void
  items: { value: string; label: string; icon?: ReactNode }[]
}

export function Tabs({ value, onChange, items }: TabsProps) {
  return (
    <div className="card p-1 grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'bg-bg-elev text-white shadow-card border border-border'
                : 'text-muted hover:text-white',
            )}
          >
            {it.icon}
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
