import { useMemo, useState } from 'react'
import { Calendar, ChevronDown, Clock, Sparkles, Upload } from 'lucide-react'
import { EmptyState } from './components/EmptyState'
import { SummaryView } from './components/SummaryView'
import { UploadRawDialog } from './components/UploadRawDialog'
import { HistoryDialog } from './components/HistoryDialog'
import { generateRawSample } from './lib/raw/sample'
import {
  addRawDataset,
  loadRawState,
  removeRawDataset,
  setActiveRaw,
} from './lib/raw/storage'
import type { RawDataset } from './lib/raw/types'
import type { DatasetMeta } from './lib/types'
import { cn } from './lib/utils'

export default function App() {
  const [state, setState] = useState(() => loadRawState())
  const [showUpload, setShowUpload] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const active = state.datasets.find((d) => d.id === state.activeId) ?? state.datasets[0]

  // Group datasets by brand for selector + period selector
  const brandList = useMemo(() => {
    const map = new Map<string, RawDataset[]>()
    for (const d of state.datasets) {
      const b = d.brand || 'Tanpa Brand'
      if (!map.has(b)) map.set(b, [])
      map.get(b)!.push(d)
    }
    return [...map.entries()].map(([brand, list]) => ({ brand, list }))
  }, [state.datasets])

  // Find immediate previous dataset for the same brand (for delta comparison)
  const prevDs = useMemo(() => {
    if (!active) return null
    const same = state.datasets.filter((d) => d.brand === active.brand && d.id !== active.id)
    // sort by period.end if available, else by uploadedAt — pick most recent BEFORE active
    same.sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
    const activeKey = sortKey(active)
    return same.find((d) => sortKey(d).localeCompare(activeKey) < 0) ?? null
  }, [state.datasets, active])

  function handleLoaded(ds: RawDataset) {
    setState((s) => addRawDataset(s, ds))
  }
  function handleSample() {
    const ds = generateRawSample()
    setState((s) => addRawDataset(s, ds))
    setShowUpload(false)
  }
  function handleSelectHistory(id: string) {
    setState((s) => setActiveRaw(s, id))
    setShowHistory(false)
  }
  function handleDeleteHistory(id: string) {
    setState((s) => removeRawDataset(s, id))
  }

  const historyMeta: DatasetMeta[] = state.datasets.map((d) => ({
    id: d.id,
    name: d.name,
    uploadedAt: d.uploadedAt,
    rowCount:
      (d.produk?.length ?? 0) + (d.ads?.length ?? 0) + (d.stock?.length ?? 0),
    range: { start: d.period?.start ?? '', end: d.period?.end ?? '' },
  }))

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        onUpload={() => setShowUpload(true)}
        onSample={handleSample}
        onHistory={() => setShowHistory(true)}
        canHistory={state.datasets.length > 0}
        active={active ?? null}
        brandList={brandList}
        onSelectDataset={(id) => setState((s) => setActiveRaw(s, id))}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 pb-10 mt-4">
        {!active ? (
          <EmptyState onUpload={() => setShowUpload(true)} onLoadSample={handleSample} />
        ) : (
          <SummaryView ds={active} prevDs={prevDs} />
        )}
      </main>

      <footer className="text-center text-xs text-muted py-4">
        Data tersimpan di browser. Diolah lokal — tidak ada upload server.
      </footer>

      <UploadRawDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onLoaded={handleLoaded}
        onLoadSample={handleSample}
        previousBrands={brandList.map((b) => b.brand)}
      />

      <HistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={historyMeta}
        activeId={state.activeId}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
      />
    </div>
  )
}

function sortKey(d: RawDataset): string {
  return d.period?.end ?? d.period?.start ?? d.uploadedAt
}

interface TopBarProps {
  onUpload: () => void
  onSample: () => void
  onHistory: () => void
  canHistory: boolean
  active: RawDataset | null
  brandList: { brand: string; list: RawDataset[] }[]
  onSelectDataset: (id: string) => void
}

function TopBar({
  onUpload,
  onSample,
  onHistory,
  canHistory,
  active,
  brandList,
  onSelectDataset,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-bg/80 border-b border-border">
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3">
        <div className="h-8 w-8 rounded-xl bg-accent/15 border border-accent/40 grid place-items-center shrink-0">
          <span className="text-accent font-bold text-sm">S</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-semibold text-white leading-tight">Shopee Analytics</h1>
          <p className="text-[11px] text-muted leading-tight">
            Summary dashboard untuk pengambilan keputusan cepat
          </p>
        </div>

        {active && (
          <div className="flex items-center gap-2 ml-2 sm:ml-4">
            <BrandSelector
              activeId={active.id}
              brandList={brandList}
              onSelect={onSelectDataset}
            />
            <PeriodSelector
              activeBrand={active.brand}
              activeId={active.id}
              brandList={brandList}
              onSelect={onSelectDataset}
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button className="btn-ghost" onClick={onSample}>
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="hidden sm:inline">Sample</span>
          </button>
          <button
            className="btn-ghost disabled:opacity-50"
            onClick={onHistory}
            disabled={!canHistory}
          >
            <Clock className="h-4 w-4 text-muted" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button className="btn-primary" onClick={onUpload}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function BrandSelector({
  activeId,
  brandList,
  onSelect,
}: {
  activeId: string
  brandList: { brand: string; list: RawDataset[] }[]
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const active = brandList.flatMap((b) => b.list).find((d) => d.id === activeId)
  if (!active) return null
  return (
    <div className="relative">
      <button
        className="btn-ghost"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="font-medium text-white">{active.brand}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 card p-1 z-30 max-h-80 overflow-y-auto">
          {brandList.map((b) => {
            // pick latest dataset by sortKey for that brand
            const latest = [...b.list].sort((a, c) => sortKey(c).localeCompare(sortKey(a)))[0]
            const activeBrand = b.brand === active.brand
            return (
              <button
                key={b.brand}
                className={cn(
                  'w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition',
                  activeBrand ? 'bg-accent/10 text-white' : 'text-muted hover:bg-bg-elev hover:text-white',
                )}
                onClick={() => {
                  onSelect(latest.id)
                  setOpen(false)
                }}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    activeBrand ? 'bg-accent' : 'bg-muted',
                  )}
                />
                <span className="flex-1">{b.brand}</span>
                <span className="text-[11px] text-muted">{b.list.length}×</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PeriodSelector({
  activeBrand,
  activeId,
  brandList,
  onSelect,
}: {
  activeBrand: string
  activeId: string
  brandList: { brand: string; list: RawDataset[] }[]
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const list = useMemo(
    () =>
      [...(brandList.find((b) => b.brand === activeBrand)?.list ?? [])].sort(
        (a, b) => sortKey(b).localeCompare(sortKey(a)),
      ),
    [brandList, activeBrand],
  )
  const active = list.find((d) => d.id === activeId)
  if (!active) return null
  const label = formatPeriodShort(active)
  return (
    <div className="relative">
      <button
        className="btn-ghost"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <Calendar className="h-3.5 w-3.5 text-muted" />
        <span className="text-white">{label}</span>
        {list.length > 1 && (
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition', open && 'rotate-180')} />
        )}
      </button>
      {open && list.length > 1 && (
        <div className="absolute left-0 top-full mt-1 w-72 card p-1 z-30 max-h-80 overflow-y-auto">
          {list.map((d) => (
            <button
              key={d.id}
              className={cn(
                'w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition',
                d.id === activeId
                  ? 'bg-accent/10 text-white'
                  : 'text-muted hover:bg-bg-elev hover:text-white',
              )}
              onClick={() => {
                onSelect(d.id)
                setOpen(false)
              }}
            >
              <Calendar className="h-3.5 w-3.5 text-muted" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{formatPeriodShort(d)}</p>
                <p className="text-[11px] text-muted">
                  Diupload {new Date(d.uploadedAt).toLocaleDateString('id-ID')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatPeriodShort(d: RawDataset): string {
  if (d.period?.start && d.period?.end) {
    return `${d.period.start} → ${d.period.end}`
  }
  if (d.period?.start) return d.period.start
  return new Date(d.uploadedAt).toLocaleDateString('id-ID')
}
