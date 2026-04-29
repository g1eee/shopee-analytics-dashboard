// Indonesian-locale-aware number parser.
// Examples:
//   "273.757.665" -> 273757665
//   "4,42%" -> 4.42
//   "Rp 1.500.000" -> 1500000
//   "0,18%" -> 0.18
//   "-" / "" / null -> 0
// Returns 0 when value cannot be parsed.

export function parseIdNum(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number') return isFinite(v) ? v : 0
  let s = String(v).trim()
  if (!s || s === '-' || s.toLowerCase() === 'nan') return 0
  s = s.replace(/[Rr][Pp]\s?/g, '').replace(/\s/g, '').replace(/%$/, '')
  // Strategy: thousand separator is `.`, decimal is `,`
  // If string contains `,`, treat last `,` as decimal point.
  // If it only contains `.` and they look like thousand grouping (3-digit groups), strip them.
  // If it only contains `.` but not thousand-grouped (e.g. "1.5"), treat as decimal.
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes('.')) {
    const parts = s.split('.')
    const allGroups = parts.slice(1).every((p) => p.length === 3)
    if (parts.length > 1 && allGroups) {
      s = parts.join('')
    }
  }
  const n = parseFloat(s)
  return isFinite(n) ? n : 0
}

// Parse a percentage string and return the value as a decimal fraction (e.g. "4,42%" -> 0.0442).
export function parseIdPct(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const s = String(v).trim()
  const hasPct = /%\s*$/.test(s)
  const n = parseIdNum(s)
  return hasPct ? n / 100 : n
}
