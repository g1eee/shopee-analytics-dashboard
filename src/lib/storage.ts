import type { AppState, Dataset } from './types'

const KEY = 'shopee-analytics-state-v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { datasets: [], activeDatasetId: null, targets: [] }
    const parsed = JSON.parse(raw) as AppState
    if (!parsed.datasets) parsed.datasets = []
    if (!parsed.targets) parsed.targets = []
    return parsed
  } catch {
    return { datasets: [], activeDatasetId: null, targets: [] }
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('Failed to persist state', err)
  }
}

export function addDataset(state: AppState, ds: Dataset): AppState {
  const next: AppState = {
    ...state,
    datasets: [ds, ...state.datasets].slice(0, 30),
    activeDatasetId: ds.meta.id,
  }
  saveState(next)
  return next
}

export function removeDataset(state: AppState, id: string): AppState {
  const datasets = state.datasets.filter((d) => d.meta.id !== id)
  const next: AppState = {
    ...state,
    datasets,
    activeDatasetId:
      state.activeDatasetId === id ? datasets[0]?.meta.id ?? null : state.activeDatasetId,
  }
  saveState(next)
  return next
}

export function setActive(state: AppState, id: string): AppState {
  const next: AppState = { ...state, activeDatasetId: id }
  saveState(next)
  return next
}
