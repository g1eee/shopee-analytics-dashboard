import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Megaphone,
  Package,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import { parseAnyFile } from '../lib/raw/parsers'
import type { ParsedFile, RawDataset } from '../lib/raw/types'
import { cn } from '../lib/utils'

interface UploadRawDialogProps {
  open: boolean
  onClose: () => void
  onLoaded: (ds: RawDataset) => void
  onLoadSample: () => void
  previousBrands?: string[]
}

type Slot = { kind: 'produk' | 'ads' | 'stock'; label: string; description: string; icon: typeof Package }

const SLOTS: Slot[] = [
  {
    kind: 'produk',
    label: 'Performa Produk',
    description: 'Export "Performa Produk" Shopee Seller Center (parentskudetail.xlsx).',
    icon: ShoppingBag,
  },
  {
    kind: 'ads',
    label: 'Iklan',
    description: 'Export "Semua Laporan Iklan CPC" (Data+Keseluruhan+Iklan+Shopee*.csv).',
    icon: Megaphone,
  },
  {
    kind: 'stock',
    label: 'Stok',
    description: 'Export "Mass Update Sales Info" stok per cabang (mass_update_sales_info*.xlsx).',
    icon: Package,
  },
]

export function UploadRawDialog({
  open,
  onClose,
  onLoaded,
  onLoadSample,
  previousBrands = [],
}: UploadRawDialogProps) {
  const [parsed, setParsed] = useState<Record<string, ParsedFile>>({})
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brandLabelInput, setBrandLabelInput] = useState<string | null>(null)
  // brandLabel: user-input takes priority; otherwise auto-derive from parsed files.
  const brandLabel = brandLabelInput ?? deriveBrand(parsed) ?? ''

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return
    setError(null)
    setParsing(true)
    try {
      for (const f of files) {
        const p = await parseAnyFile(f)
        if (p.kind === 'unknown') {
          setError(
            `File "${f.name}" tidak dikenali. Pastikan file adalah export Performa Produk, Iklan CPC, atau Stok.`,
          )
          continue
        }
        setParsed((prev) => ({ ...prev, [p.kind]: p }))
      }
    } catch (e) {
      console.error(e)
      setError('Gagal memparsing file. Pastikan format file valid.')
    } finally {
      setParsing(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: true,
    onDrop: handleFiles,
  })

  if (!open) return null

  const filledKinds = Object.keys(parsed) as Array<'produk' | 'ads' | 'stock'>
  const canConfirm = filledKinds.length >= 1

  function reset() {
    setParsed({})
    setError(null)
    setBrandLabelInput(null)
  }

  function confirm() {
    if (!canConfirm) return
    const finalBrand = brandLabel.trim() || 'Tanpa Brand'
    const ds: RawDataset = {
      id: 'ds-' + Date.now(),
      name: deriveName(parsed, finalBrand),
      brand: finalBrand,
      storeName: parsed.ads?.meta?.storeName,
      uploadedAt: new Date().toISOString(),
      period: parsed.ads?.meta?.period ?? parsed.produk?.meta?.period,
      cabangNames: parsed.stock?.meta?.cabangNames,
      produk: parsed.produk?.produk,
      ads: parsed.ads?.ads,
      stock: parsed.stock?.stock,
    }
    onLoaded(ds)
    reset()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-bg-hover text-muted"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-semibold text-white">Upload Data Mentah Shopee</h2>
        <p className="text-sm text-muted mt-1">
          Drag & drop hingga 3 file dari Shopee Seller Center sekaligus. Tipe file dideteksi otomatis.
        </p>

        <div
          {...getRootProps()}
          className={cn(
            'mt-5 rounded-2xl border border-dashed p-6 text-center cursor-pointer transition',
            isDragActive
              ? 'border-accent bg-accent/5'
              : 'border-border hover:border-accent/60 hover:bg-white/[0.02]',
          )}
        >
          <input {...getInputProps()} />
          <FileSpreadsheet className="mx-auto h-9 w-9 text-accent" />
          <p className="mt-2 text-sm text-white">
            {isDragActive ? 'Lepaskan file di sini…' : 'Drop file Excel/CSV, atau klik untuk pilih'}
          </p>
          <p className="mt-1 text-xs text-muted">.xlsx · .xls · .csv</p>
        </div>

        <div className="mt-4">
          <label className="label text-muted">Nama Brand</label>
          <div className="mt-1 flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={brandLabel}
              onChange={(e) => setBrandLabelInput(e.target.value)}
              placeholder="Misal: ATRIA, RTSR, dll"
              className="flex-1 min-w-[180px] rounded-xl border border-border bg-bg-elev px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
            {previousBrands.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {previousBrands.slice(0, 5).map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={cn(
                      'pill border transition',
                      brandLabel === b
                        ? 'bg-accent/20 text-accent border-accent/40'
                        : 'bg-bg-elev text-muted border-border hover:text-white hover:border-accent/40',
                    )}
                    onClick={() => setBrandLabelInput(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted mt-1">
            Auto-fill dari nama produk. Edit untuk multi-brand atau gunakan tombol untuk reuse brand sebelumnya.
          </p>
        </div>

        <div className="mt-4 grid sm:grid-cols-3 gap-2">
          {SLOTS.map((slot) => {
            const p = parsed[slot.kind]
            const Icon = slot.icon
            const filled = !!p
            return (
              <div
                key={slot.kind}
                className={cn(
                  'rounded-xl border p-3 transition',
                  filled
                    ? 'border-emerald-400/40 bg-emerald-400/5'
                    : 'border-border bg-bg-elev',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', filled ? 'text-emerald-300' : 'text-muted')} />
                  <span className="text-sm font-medium text-white">{slot.label}</span>
                  {filled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300 ml-auto" />
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-muted leading-snug">{slot.description}</p>
                {filled && (
                  <p className="mt-1 text-[11px] text-emerald-300 truncate" title={p!.fileName}>
                    {p!.fileName}
                    <span className="text-muted">
                      {' · '}
                      {p!.kind === 'produk'
                        ? `${p!.produk?.length ?? 0} baris`
                        : p!.kind === 'ads'
                          ? `${p!.ads?.length ?? 0} iklan`
                          : `${p!.stock?.length ?? 0} produk`}
                    </span>
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button className="btn-ghost" onClick={onLoadSample}>
            <Sparkles className="h-4 w-4 text-accent" />
            Pakai sample data
          </button>
          <div className="flex items-center gap-2">
            {filledKinds.length > 0 && (
              <button className="btn-ghost" onClick={reset}>
                Reset
              </button>
            )}
            <button
              className="btn-primary disabled:opacity-50"
              disabled={!canConfirm}
              onClick={confirm}
            >
              Tampilkan Dashboard
            </button>
          </div>
        </div>

        {parsing && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Memparsing file…
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-start gap-2 text-sm text-rose-400">
            <AlertTriangle className="h-4 w-4 mt-0.5" /> <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function deriveName(parsed: Record<string, ParsedFile>, brand: string): string {
  const period = parsed.ads?.meta?.period ?? parsed.produk?.meta?.period
  if (period?.start && period?.end) {
    return `${brand} · ${period.start} → ${period.end}`
  }
  return `${brand} · ${new Date().toLocaleDateString('id-ID')}`
}

function deriveBrand(parsed: Record<string, ParsedFile>): string | undefined {
  const sample =
    parsed.produk?.produk?.[0]?.produkName ??
    parsed.stock?.stock?.[0]?.namaProduk ??
    parsed.ads?.ads?.[0]?.namaIklan
  if (!sample) return undefined
  // First word, capitalize
  const w = sample.split(/\s+/)[0]
  if (!w) return undefined
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
}
