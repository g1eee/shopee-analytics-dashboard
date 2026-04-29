import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(n: number, opts?: { compact?: boolean }) {
  if (!isFinite(n)) return 'Rp 0'
  if (opts?.compact) {
    const abs = Math.abs(n)
    if (abs >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`
    if (abs >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `Rp ${(n / 1_000).toFixed(1)}K`
  }
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}

export function formatNumber(n: number, opts?: { compact?: boolean; digits?: number }) {
  if (!isFinite(n)) return '0'
  if (opts?.compact) {
    const abs = Math.abs(n)
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  }
  return n.toLocaleString('id-ID', {
    maximumFractionDigits: opts?.digits ?? 0,
  })
}

export function formatPercent(n: number, digits = 1) {
  if (!isFinite(n)) return '0%'
  return n.toFixed(digits) + '%'
}

export function safeDivide(a: number, b: number, fallback = 0): number {
  if (!b || !isFinite(a) || !isFinite(b)) return fallback
  return a / b
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
