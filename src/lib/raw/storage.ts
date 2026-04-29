import type { RawDataset } from './types'

const KEY = 'shopee-raw-state-v1'

export interface RawAppState {
  datasets: RawDataset[]
  activeId: string | null
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

export function saveRawState(state: RawAppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to persist raw state', e)
  }
}

export function addRawDataset(state: RawAppState, ds: RawDataset): RawAppState {
  const next: RawAppState = {
    datasets: [ds, ...state.datasets].slice(0, 30),
    activeId: ds.id,
  }
  saveRawState(next)
  return next
}

export function removeRawDataset(state: RawAppState, id: string): RawAppState {
  const datasets = state.datasets.filter((d) => d.id !== id)
  const next: RawAppState = {
    datasets,
    activeId: state.activeId === id ? datasets[0]?.id ?? null : state.activeId,
  }
  saveRawState(next)
  return next
}

export function setActiveRaw(state: RawAppState, id: string): RawAppState {
  const next: RawAppState = { ...state, activeId: id }
  saveRawState(next)
  return next
}
