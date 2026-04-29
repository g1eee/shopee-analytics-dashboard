import type { RawDataset } from './types'

const KEY = 'shopee-raw-state-v1'
const MAX_DATASETS = 12

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
    const parsed = JSON.parse(raw) as RawAppState
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
      localStorage.setItem(KEY, JSON.stringify(attempt))
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

export function addRawDataset(
  state: RawAppState,
  ds: RawDataset,
): { state: RawAppState; result: SaveResult } {
  // Newest first, capped, deduped by id (replace if same id re-uploaded)
  const filtered = state.datasets.filter((d) => d.id !== ds.id)
  const datasets = [ds, ...filtered].slice(0, MAX_DATASETS)
  const next: RawAppState = { datasets, activeId: ds.id }
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
