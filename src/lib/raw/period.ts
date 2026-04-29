import type { RawDataset } from './types'

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export const MONTH_NAMES_ID_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

export interface PeriodKey {
  year: number
  month: number // 1-12
}

/** Extract (year, month) from a YYYY-MM-DD or DD-MM-YYYY-ish string. */
function parseDateLoose(s?: string): { year: number; month: number } | null {
  if (!s) return null
  // ISO YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) }
  // DD-MM-YYYY or DD/MM/YYYY
  const eu = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (eu) return { year: Number(eu[3]), month: Number(eu[2]) }
  return null
}

export function periodKeyOf(d: RawDataset): PeriodKey {
  const p = d.period
  if (p?.year && p?.month) return { year: p.year, month: p.month }
  const fromStart = parseDateLoose(p?.start)
  if (fromStart) return fromStart
  const fromEnd = parseDateLoose(p?.end)
  if (fromEnd) return fromEnd
  const u = new Date(d.uploadedAt)
  return { year: u.getFullYear(), month: u.getMonth() + 1 }
}

export function periodLabel(k: PeriodKey): string {
  const m = MONTH_NAMES_ID[(k.month - 1 + 12) % 12]
  return `${m} ${k.year}`
}

export function periodLabelShort(k: PeriodKey): string {
  const m = MONTH_NAMES_ID_SHORT[(k.month - 1 + 12) % 12]
  return `${m} ${k.year}`
}

export function samePeriod(a: PeriodKey, b: PeriodKey): boolean {
  return a.year === b.year && a.month === b.month
}

export function comparePeriod(a: PeriodKey, b: PeriodKey): number {
  if (a.year !== b.year) return a.year - b.year
  return a.month - b.month
}

/** Format period as YYYY-MM-DD start and end dates for the entire month. */
export function periodToRange(k: PeriodKey): { start: string; end: string } {
  const start = `${k.year}-${String(k.month).padStart(2, '0')}-01`
  const lastDay = new Date(k.year, k.month, 0).getDate()
  const end = `${k.year}-${String(k.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}
