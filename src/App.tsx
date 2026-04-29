import { useMemo, useState } from 'react'
import { Calendar, ChevronDown, Clock, Sparkles, Trash2, Upload } from 'lucide-react'
import { EmptyState } from './components/EmptyState'
import { SummaryView } from './components/SummaryView'
import { UploadRawDialog } from './components/UploadRawDialog'
import { HistoryDialog } from './components/HistoryDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { generateRawSample } from './lib/raw/sample'
import {
  addRawDataset,
  clearAllRaw,
  loadRawState,
  removeRawByBrand,
  removeRawDataset,
  setActiveRaw,
  type SaveResult,
} from './lib/raw/storage'
import type { RawDataset } from './lib/raw/types'
import {
  MONTH_NAMES_ID,
  comparePeriod,
  periodKeyOf,
  periodLabel,
  samePeriod,
  type PeriodKey,
} from './lib/raw/period'
import type { DatasetMeta } from './lib/types'
import { cn } from './lib/utils'

interface BrandGroup {
  brand: string
  list: RawDataset[]
}

export default function App() {
  const [state, setState] = useState(() => loadRawState())
  const [showUpload, setShowUpload] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [confirm, setConfirm] = useState<
    | { kind: 'brand'; brand: string }
    | { kind: 'dataset'; id: string; name: string }
    | { kind: 'all' }
    | null
  >(null)
  const [storageNotice, setStorageNotice] = useState<
    | { kind: 'trimmed'; count: number }
    | { kind: 'failed' }
    | null
  >(null)

  function applySave(result: { state: ReturnType<typeof loadRawState>; result: SaveResult }) {
    setState(result.state)
    if (!result.result.ok) {
      setStorageNotice({ kind: 'failed' })
    } else if (result.result.trimmed && result.result.trimmed > 0) {
      setStorageNotice({ kind: 'trimmed', count: result.result.trimmed })
    }
  }

  // active dataset from storage (last upload / history pick).
  const stored = state.datasets.find((d) => d.id === state.activeId) ?? state.datasets[0] ?? null

  // Optional user override of (brand, period). Cleared whenever storage's active dataset changes.
  const [override, setOverride] = useState<{ brand: string; period: PeriodKey } | null>(null)

  // Selected (brand, period) shown in the header — override wins, otherwise follow stored.
  const selected: { brand: string; period: PeriodKey } | null = useMemo(
    () => override ?? (stored ? { brand: stored.brand, period: periodKeyOf(stored) } : null),
    [override, stored],
  )

  // Group datasets by brand.
  const brandList: BrandGroup[] = useMemo(() => {
    const map = new Map<string, RawDataset[]>()
    for (const d of state.datasets) {
      const b = d.brand || 'Tanpa Brand'
      if (!map.has(b)) map.set(b, [])
      map.get(b)!.push(d)
    }
    return [...map.entries()].map(([brand, list]) => ({ brand, list }))
  }, [state.datasets])

  // Lookup the actual dataset for the currently selected (brand, period).
  const activeDs = useMemo(() => {
    if (!selected) return null
    const sameBrand = state.datasets.filter((d) => d.brand === selected.brand)
    return sameBrand.find((d) => samePeriod(periodKeyOf(d), selected.period)) ?? null
  }, [state.datasets, selected])

  // Previous-period dataset for the same brand (for delta arrows).
  const prevDs = useMemo(() => {
    if (!selected) return null
    const sameBrand = state.datasets
      .filter((d) => d.brand === selected.brand)
      .sort((a, b) => comparePeriod(periodKeyOf(b), periodKeyOf(a))) // desc
    return sameBrand.find((d) => comparePeriod(periodKeyOf(d), selected.period) < 0) ?? null
  }, [state.datasets, selected])

  function handleLoaded(ds: RawDataset) {
    applySave(addRawDataset(state, ds))
    setOverride(null)
  }
  function handleSample() {
    const ds = generateRawSample()
    applySave(addRawDataset(state, ds))
    setOverride(null)
    setShowUpload(false)
  }
  function handleSelectHistory(id: string) {
    setState((s) => setActiveRaw(s, id))
    setOverride(null)
    setShowHistory(false)
  }
  function handleDeleteHistory(id: string) {
    const ds = state.datasets.find((d) => d.id === id)
    setConfirm({ kind: 'dataset', id, name: ds?.name ?? 'dataset ini' })
  }
  function handleDeleteBrand(brand: string) {
    setConfirm({ kind: 'brand', brand })
  }
  function handleDeleteAll() {
    setConfirm({ kind: 'all' })
  }
  function applyConfirm() {
    if (!confirm) return
    if (confirm.kind === 'brand') {
      setState((s) => removeRawByBrand(s, confirm.brand))
      setOverride(null)
    } else if (confirm.kind === 'dataset') {
      setState((s) => removeRawDataset(s, confirm.id))
    } else if (confirm.kind === 'all') {
      setState(() => clearAllRaw())
      setOverride(null)
      setShowHistory(false)
    }
    setConfirm(null)
  }

  const historyMeta: DatasetMeta[] = state.datasets.map((d) => ({
    id: d.id,
    name: d.name,
    uploadedAt: d.uploadedAt,
    rowCount:
      (d.produk?.length ?? 0) + (d.ads?.length ?? 0) + (d.stock?.length ?? 0),
    range: { start: d.period?.start ?? '', end: d.period?.end ?? '' },
    hasProduk: (d.produk?.length ?? 0) > 0,
    hasAds: (d.ads?.length ?? 0) > 0,
    hasStock: (d.stock?.length ?? 0) > 0,
  }))

  const noData = state.datasets.length === 0

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        onUpload={() => setShowUpload(true)}
        onSample={handleSample}
        onHistory={() => setShowHistory(true)}
        canHistory={state.datasets.length > 0}
        selected={selected}
        brandList={brandList}
        onChangeBrand={(brand) => {
          // when brand changes, default to the latest period for that brand
          const list = brandList.find((b) => b.brand === brand)?.list ?? []
          const sorted = [...list].sort((a, b) => comparePeriod(periodKeyOf(b), periodKeyOf(a)))
          const latest = sorted[0]
          if (latest) setOverride({ brand, period: periodKeyOf(latest) })
          else if (selected) setOverride({ brand, period: selected.period })
        }}
        onDeleteBrand={handleDeleteBrand}
        onChangeMonth={(month) => {
          if (!selected) return
          setOverride({ brand: selected.brand, period: { ...selected.period, month } })
        }}
        onChangeYear={(year) => {
          if (!selected) return
          setOverride({ brand: selected.brand, period: { ...selected.period, year } })
        }}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 pb-10 mt-4">
        {storageNotice && (
          <StorageNotice
            notice={storageNotice}
            onDismiss={() => setStorageNotice(null)}
            onOpenHistory={() => {
              setShowHistory(true)
              setStorageNotice(null)
            }}
          />
        )}
        {noData ? (
          <EmptyState onUpload={() => setShowUpload(true)} onLoadSample={handleSample} />
        ) : activeDs ? (
          <SummaryView ds={activeDs} prevDs={prevDs} />
        ) : (
          <NoPeriodData
            brand={selected?.brand}
            period={selected?.period}
            onUpload={() => setShowUpload(true)}
          />
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
        defaultBrand={selected?.brand}
        defaultPeriod={selected?.period}
      />

      <HistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={historyMeta}
        activeId={activeDs?.id ?? state.activeId}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
        onDeleteAll={historyMeta.length > 0 ? handleDeleteAll : undefined}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === 'brand'
            ? `Hapus semua data brand "${confirm.brand}"?`
            : confirm?.kind === 'dataset'
              ? `Hapus dataset "${confirm.name}"?`
              : confirm?.kind === 'all'
                ? 'Hapus seluruh data dashboard?'
                : ''
        }
        description={
          confirm?.kind === 'brand'
            ? `Semua periode (bulan/tahun) untuk brand ini akan dihapus dari browser. Tindakan ini tidak bisa di-undo.`
            : confirm?.kind === 'dataset'
              ? 'Hanya periode ini yang dihapus. Periode lain di brand sama tetap aman.'
              : confirm?.kind === 'all'
                ? 'Semua dataset (semua brand & periode) akan dihapus dari browser. Tindakan ini tidak bisa di-undo.'
                : ''
        }
        onCancel={() => setConfirm(null)}
        onConfirm={applyConfirm}
      />
    </div>
  )
}

function StorageNotice({
  notice,
  onDismiss,
  onOpenHistory,
}: {
  notice: { kind: 'trimmed'; count: number } | { kind: 'failed' }
  onDismiss: () => void
  onOpenHistory: () => void
}) {
  if (notice.kind === 'trimmed') {
    return (
      <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-3">
        <span className="h-2 w-2 mt-2 rounded-full bg-amber-300 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="text-white font-medium">
            Storage browser hampir penuh — {notice.count} dataset paling lama dihapus
          </p>
          <p className="text-xs text-muted mt-0.5">
            Browser cuma punya ~5–10MB localStorage. Untuk lega, hapus dataset yang udah ga
            dipakai dari{' '}
            <button className="underline hover:text-white" onClick={onOpenHistory}>
              Sync History
            </button>
            .
          </p>
        </div>
        <button
          className="text-muted hover:text-white text-xs px-2 py-1 shrink-0"
          onClick={onDismiss}
        >
          Tutup
        </button>
      </div>
    )
  }
  return (
    <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 flex items-start gap-3">
      <span className="h-2 w-2 mt-2 rounded-full bg-rose-300 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="text-white font-medium">
          Gagal menyimpan dataset — storage browser penuh
        </p>
        <p className="text-xs text-muted mt-0.5">
          Dataset terakhir yang kamu upload <span className="text-rose-200">tidak tersimpan</span>{' '}
          dan akan hilang kalau halaman di-reload. Hapus dataset lama dulu di{' '}
          <button className="underline hover:text-white" onClick={onOpenHistory}>
            Sync History
          </button>{' '}
          atau pakai brand selector, lalu upload ulang.
        </p>
      </div>
      <button
        className="text-muted hover:text-white text-xs px-2 py-1 shrink-0"
        onClick={onDismiss}
      >
        Tutup
      </button>
    </div>
  )
}

function NoPeriodData({
  brand,
  period,
  onUpload,
}: {
  brand?: string
  period?: PeriodKey
  onUpload: () => void
}) {
  return (
    <div className="card p-10 text-center">
      <Calendar className="h-10 w-10 text-accent mx-auto" />
      <h2 className="text-lg font-semibold text-white mt-3">
        Belum ada data{period ? ` untuk ${periodLabel(period)}` : ''}
        {brand ? ` (${brand})` : ''}
      </h2>
      <p className="text-sm text-muted mt-1">
        Upload file Shopee untuk periode ini, atau pindah ke bulan/tahun lain di header.
      </p>
      <button className="btn-primary mt-4 mx-auto" onClick={onUpload}>
        <Upload className="h-4 w-4" />
        Upload Data
      </button>
    </div>
  )
}

interface TopBarProps {
  onUpload: () => void
  onSample: () => void
  onHistory: () => void
  canHistory: boolean
  selected: { brand: string; period: PeriodKey } | null
  brandList: BrandGroup[]
  onChangeBrand: (brand: string) => void
  onChangeMonth: (month: number) => void
  onChangeYear: (year: number) => void
  onDeleteBrand: (brand: string) => void
}

function TopBar({
  onUpload,
  onSample,
  onHistory,
  canHistory,
  selected,
  brandList,
  onChangeBrand,
  onChangeMonth,
  onChangeYear,
  onDeleteBrand,
}: TopBarProps) {
  // Years that have data for the currently selected brand
  const yearsForBrand = useMemo(() => {
    if (!selected) return []
    const list = brandList.find((b) => b.brand === selected.brand)?.list ?? []
    const years = new Set(list.map((d) => periodKeyOf(d).year))
    return [...years].sort((a, b) => b - a)
  }, [brandList, selected])

  // Months with data for the (brand, year)
  const monthsWithDataForYear = useMemo(() => {
    if (!selected) return new Set<number>()
    const list = brandList.find((b) => b.brand === selected.brand)?.list ?? []
    return new Set(list.filter((d) => periodKeyOf(d).year === selected.period.year).map((d) => periodKeyOf(d).month))
  }, [brandList, selected])

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

        {selected && (
          <div className="flex items-center gap-2 ml-2 sm:ml-4 flex-wrap">
            <BrandSelector
              activeBrand={selected.brand}
              brandList={brandList}
              onChange={onChangeBrand}
              onDelete={onDeleteBrand}
            />
            <MonthSelector
              activeMonth={selected.period.month}
              monthsWithData={monthsWithDataForYear}
              onChange={onChangeMonth}
            />
            <YearSelector
              activeYear={selected.period.year}
              yearsForBrand={yearsForBrand}
              onChange={onChangeYear}
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
  activeBrand,
  brandList,
  onChange,
  onDelete,
}: {
  activeBrand: string
  brandList: BrandGroup[]
  onChange: (brand: string) => void
  onDelete: (brand: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        className="btn-ghost"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="font-medium text-white">{activeBrand}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 card p-1 z-30 max-h-80 overflow-y-auto">
          {brandList.map((b) => {
            const active = b.brand === activeBrand
            return (
              <div
                key={b.brand}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition',
                  active ? 'bg-accent/10 text-white' : 'text-muted hover:bg-bg-elev hover:text-white',
                )}
              >
                <button
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                  onMouseDown={(e) => {
                    // prevent button blur from closing the dropdown before click fires
                    e.preventDefault()
                  }}
                  onClick={() => {
                    onChange(b.brand)
                    setOpen(false)
                  }}
                >
                  <span className={cn('h-2 w-2 rounded-full shrink-0', active ? 'bg-accent' : 'bg-muted')} />
                  <span className="flex-1 truncate">{b.brand}</span>
                  <span className="text-[11px] text-muted shrink-0">{b.list.length}×</span>
                </button>
                <button
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400 shrink-0"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(b.brand)
                    setOpen(false)
                  }}
                  aria-label={`Hapus brand ${b.brand}`}
                  title={`Hapus brand ${b.brand}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MonthSelector({
  activeMonth,
  monthsWithData,
  onChange,
}: {
  activeMonth: number
  monthsWithData: Set<number>
  onChange: (month: number) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        className="btn-ghost"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <Calendar className="h-3.5 w-3.5 text-muted" />
        <span className="text-white">{MONTH_NAMES_ID[activeMonth - 1]}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-44 card p-1 z-30 grid grid-cols-2 gap-0.5">
          {MONTH_NAMES_ID.map((name, i) => {
            const month = i + 1
            const active = month === activeMonth
            const hasData = monthsWithData.has(month)
            return (
              <button
                key={month}
                className={cn(
                  'rounded-lg px-2 py-1.5 text-xs transition flex items-center gap-1.5',
                  active
                    ? 'bg-accent/15 text-accent font-medium'
                    : hasData
                      ? 'text-white hover:bg-bg-elev'
                      : 'text-muted hover:bg-bg-elev hover:text-white',
                )}
                onClick={() => {
                  onChange(month)
                  setOpen(false)
                }}
              >
                {hasData && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                {name.slice(0, 3)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function YearSelector({
  activeYear,
  yearsForBrand,
  onChange,
}: {
  activeYear: number
  yearsForBrand: number[]
  onChange: (year: number) => void
}) {
  const [open, setOpen] = useState(false)
  // Always show: years with data + current ± 2
  const candidate = useMemo(() => {
    const set = new Set<number>(yearsForBrand)
    const now = new Date().getFullYear()
    for (let y = now - 2; y <= now + 1; y++) set.add(y)
    set.add(activeYear)
    return [...set].sort((a, b) => b - a)
  }, [yearsForBrand, activeYear])
  return (
    <div className="relative">
      <button
        className="btn-ghost"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <span className="text-white">{activeYear}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-28 card p-1 z-30 max-h-72 overflow-y-auto">
          {candidate.map((y) => {
            const active = y === activeYear
            const hasData = yearsForBrand.includes(y)
            return (
              <button
                key={y}
                className={cn(
                  'w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition',
                  active
                    ? 'bg-accent/15 text-accent font-medium'
                    : hasData
                      ? 'text-white hover:bg-bg-elev'
                      : 'text-muted hover:bg-bg-elev hover:text-white',
                )}
                onClick={() => {
                  onChange(y)
                  setOpen(false)
                }}
              >
                {hasData && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                <span>{y}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
