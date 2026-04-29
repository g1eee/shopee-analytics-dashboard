import { useState } from 'react'
import { Clock, Sparkles, Upload } from 'lucide-react'
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

export default function App() {
  const [state, setState] = useState(() => loadRawState())
  const [showUpload, setShowUpload] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const active = state.datasets.find((d) => d.id === state.activeId) ?? state.datasets[0]

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

  // Adapt RawDataset to DatasetMeta shape for the existing HistoryDialog component
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
        title="Shopee Analytics"
        subtitle="Summary dashboard untuk pengambilan keputusan cepat"
        onUpload={() => setShowUpload(true)}
        onSample={handleSample}
        onHistory={() => setShowHistory(true)}
        canHistory={state.datasets.length > 0}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 pb-10 mt-4">
        {!active ? (
          <EmptyState onUpload={() => setShowUpload(true)} onLoadSample={handleSample} />
        ) : (
          <SummaryView ds={active} />
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

function TopBar({
  title,
  subtitle,
  onUpload,
  onSample,
  onHistory,
  canHistory,
}: {
  title: string
  subtitle: string
  onUpload: () => void
  onSample: () => void
  onHistory: () => void
  canHistory: boolean
}) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-bg/80 border-b border-border">
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3">
        <div className="h-8 w-8 rounded-xl bg-accent/15 border border-accent/40 grid place-items-center">
          <span className="text-accent font-bold text-sm">S</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-semibold text-white leading-tight">{title}</h1>
          <p className="text-[11px] text-muted leading-tight">{subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn-ghost" onClick={onSample}>
            <Sparkles className="h-4 w-4 text-accent" />
            Sample
          </button>
          <button
            className="btn-ghost disabled:opacity-50"
            onClick={onHistory}
            disabled={!canHistory}
          >
            <Clock className="h-4 w-4 text-muted" />
            History
          </button>
          <button className="btn-primary" onClick={onUpload}>
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>
    </header>
  )
}
