import { compressToUTF16, decompressFromUTF16 } from 'lz-string'
import type { RawDataset } from './types'
import { periodKeyOf, samePeriod } from './period'

const KEY = 'shopee-raw-state-v1'
const MAX_DATASETS = 36

/**
 * Storage encoding:
 *  - New entries are stored as `lzu:` + compressToUTF16(JSON). UTF-16 encoding is the
 *    most space-efficient for localStorage (which is itself UTF-16), giving roughly
 *    4-6x compression for our highly-repetitive product/ad payloads.
 *  - Legacy entries (plain JSON, written by older builds) are detected by the leading
 *    `{` and read with JSON.parse. They are rewritten compressed on next save.
 */
const COMPRESSED_PREFIX = 'lzu:'

function decode(raw: string): RawAppState | null {
  try {
    if (raw.startsWith('{')) {
      return JSON.parse(raw) as RawAppState
    }
    if (raw.startsWith(COMPRESSED_PREFIX)) {
      const decompressed = decompressFromUTF16(raw.slice(COMPRESSED_PREFIX.length))
      if (!decompressed) return null
      return JSON.parse(decompressed) as RawAppState
    }
    // Unknown format — last resort try decompress
    const decompressed = decompressFromUTF16(raw)
    if (decompressed) return JSON.parse(decompressed) as RawAppState
  } catch {
    return null
  }
  return null
}

function encode(state: RawAppState): string {
  return COMPRESSED_PREFIX + compressToUTF16(JSON.stringify(state))
}

export interface RawAppState {
  datasets: RawDataset[]
  activeId: string | null
}

export interface SaveResult {
  ok: boolean
  /** Set when save partially succeeded by dropping older datasets to fit quota. */
  trimmed?: number
  /** Set when save failed entirely (quota exceeded even after dropping all but the newest). */
  error?: 'quota' | 'unknown'
}

export function loadRawState(): RawAppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { datasets: [], activeId: null }
    const parsed = decode(raw)
    if (!parsed) return { datasets: [], activeId: null }
    if (!parsed.datasets) parsed.datasets = []
    return parsed
  } catch {
    return { datasets: [], activeId: null }
  }
}

function isQuotaErr(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const name = (e as { name?: string }).name
  const code = (e as { code?: number }).code
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  )
}

/**
 * Save state to localStorage. If quota is exceeded, retry by progressively dropping
 * the oldest datasets until it fits, prioritizing keeping the most recent uploads.
 */
export function saveRawStateSafe(state: RawAppState): { state: RawAppState; result: SaveResult } {
  let attempt = state
  let trimmed = 0
  while (true) {
    try {
      localStorage.setItem(KEY, encode(attempt))
      const result: SaveResult = trimmed > 0 ? { ok: true, trimmed } : { ok: true }
      return { state: attempt, result }
    } catch (e) {
      if (!isQuotaErr(e)) {
        console.warn('Failed to persist raw state', e)
        return { state, result: { ok: false, error: 'unknown' } }
      }
      // Quota exceeded — drop the oldest dataset and retry
      if (attempt.datasets.length <= 1) {
        // Can't drop further; even a single dataset doesn't fit.
        return { state, result: { ok: false, error: 'quota' } }
      }
      const next: RawAppState = {
        datasets: attempt.datasets.slice(0, attempt.datasets.length - 1),
        activeId: attempt.activeId,
      }
      // If we just dropped the active one, point active to the latest remaining
      if (!next.datasets.some((d) => d.id === next.activeId)) {
        next.activeId = next.datasets[0]?.id ?? null
      }
      attempt = next
      trimmed += 1
    }
  }
}

/** Backward-compatible signature used in older call sites. */
export function saveRawState(state: RawAppState) {
  saveRawStateSafe(state)
}

/**
 * Adds (or merges) a dataset into state.
 *
 * Behavior:
 *  - If an existing dataset matches the same (brand, period), the new payload is
 *    merged INTO the existing record. Only file-slices that the new upload
 *    actually contains (produk / ads / stock) overwrite the old ones; the rest
 *    are preserved. This lets users top-up a partial dataset by uploading just
 *    the missing file (e.g. only mass_update_sales_info.xlsx for stock) without
 *    losing the previously-uploaded Performa Produk / Iklan files.
 *  - Otherwise the dataset is added as a new entry (newest first, capped at
 *    MAX_DATASETS, deduped by id).
 */
export function addRawDataset(
  state: RawAppState,
  ds: RawDataset,
): { state: RawAppState; result: SaveResult } {
  const incomingPeriod = periodKeyOf(ds)
  const existingIdx = state.datasets.findIndex(
    (d) => (d.brand || 'Tanpa Brand') === (ds.brand || 'Tanpa Brand') && samePeriod(periodKeyOf(d), incomingPeriod),
  )

  let datasets: RawDataset[]
  let activeId: string

  if (existingIdx >= 0 && state.datasets[existingIdx].id !== ds.id) {
    const existing = state.datasets[existingIdx]
    // Treat empty arrays the same as missing — don't wipe out existing data when
    // a parser returns an empty slice (e.g. user dropped a wrong-format file or
    // a parser warning silently produced an empty array).
    const pickArr = <T,>(incoming: T[] | undefined, current: T[] | undefined): T[] | undefined =>
      incoming && incoming.length > 0 ? incoming : current
    const merged: RawDataset = {
      ...existing,
      // Refresh display fields with whatever the new upload provided (fall back to old)
      name: ds.name || existing.name,
      storeName: ds.storeName ?? existing.storeName,
      uploadedAt: ds.uploadedAt,
      period: ds.period,
      cabangNames: ds.cabangNames ?? existing.cabangNames,
      // Merge file-slices: new takes precedence only when it actually contains rows.
      produk: pickArr(ds.produk, existing.produk),
      ads: pickArr(ds.ads, existing.ads),
      stock: pickArr(ds.stock, existing.stock),
    }
    const others = state.datasets.filter((_, i) => i !== existingIdx)
    datasets = [merged, ...others].slice(0, MAX_DATASETS)
    activeId = merged.id
  } else {
    // Newest first, capped, deduped by id (replace if same id re-uploaded)
    const filtered = state.datasets.filter((d) => d.id !== ds.id)
    datasets = [ds, ...filtered].slice(0, MAX_DATASETS)
    activeId = ds.id
  }

  const next: RawAppState = { datasets, activeId }
  return saveRawStateSafe(next)
}

export function removeRawDataset(state: RawAppState, id: string): RawAppState {
  const datasets = state.datasets.filter((d) => d.id !== id)
  const next: RawAppState = {
    datasets,
    activeId: state.activeId === id ? datasets[0]?.id ?? null : state.activeId,
  }
  saveRawStateSafe(next)
  return next
}

export function setActiveRaw(state: RawAppState, id: string): RawAppState {
  const next: RawAppState = { ...state, activeId: id }
  saveRawStateSafe(next)
  return next
}

export function removeRawByBrand(state: RawAppState, brand: string): RawAppState {
  const datasets = state.datasets.filter((d) => (d.brand || 'Tanpa Brand') !== brand)
  const stillActive = datasets.some((d) => d.id === state.activeId)
  const next: RawAppState = {
    datasets,
    activeId: stillActive ? state.activeId : datasets[0]?.id ?? null,
  }
  saveRawStateSafe(next)
  return next
}

export function clearAllRaw(): RawAppState {
  const next: RawAppState = { datasets: [], activeId: null }
  saveRawStateSafe(next)
  return next
}
