import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Sparkles, X } from 'lucide-react'
import { buildDataset, parseExcelFile, type ParseResult } from '../lib/parser'
import { downloadTemplate } from '../lib/template'
import type { Dataset } from '../lib/types'
import { cn } from '../lib/utils'

interface UploadDialogProps {
  open: boolean
  onClose: () => void
  onLoaded: (ds: Dataset) => void
  onLoadSample: () => void
}

export function UploadDialog({ open, onClose, onLoaded, onLoadSample }: UploadDialogProps) {
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<{
    file: File
    parsed: ParseResult
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
    onDrop: async (files) => {
      const file = files[0]
      if (!file) return
      setError(null)
      setParsing(true)
      try {
        const parsed = await parseExcelFile(file)
        setResult({ file, parsed })
      } catch (err) {
        console.error(err)
        setError('Gagal membaca file. Pastikan format Excel/CSV valid.')
      } finally {
        setParsing(false)
      }
    },
  })

  if (!open) return null

  function reset() {
    setResult(null)
    setError(null)
  }

  function confirm() {
    if (!result) return
    const ds = buildDataset(result.file, result.parsed)
    onLoaded(ds)
    reset()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-bg-hover text-muted"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-semibold text-white">Update Data</h2>
        <p className="text-sm text-muted mt-1">
          Upload file Excel (.xlsx/.xls) atau CSV. Kolom akan di-deteksi otomatis.
        </p>

        {!result ? (
          <>
            <div
              {...getRootProps()}
              className={cn(
                'mt-5 rounded-2xl border border-dashed p-8 text-center cursor-pointer transition',
                isDragActive
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/60 hover:bg-white/[0.02]',
              )}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="mx-auto h-10 w-10 text-accent" />
              <p className="mt-3 text-sm text-white">
                {isDragActive ? 'Lepaskan file di sini…' : 'Drag & drop file, atau klik untuk pilih'}
              </p>
              <p className="mt-1 text-xs text-muted">.xlsx · .xls · .csv</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button className="btn-ghost" onClick={() => downloadTemplate()}>
                <Download className="h-4 w-4 text-muted" />
                Download template Excel
              </button>
              <button className="btn-primary" onClick={onLoadSample}>
                <Sparkles className="h-4 w-4" />
                Pakai Sample Data
              </button>
            </div>

            {parsing && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Membaca file…
              </div>
            )}
            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-rose-400">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            )}
          </>
        ) : (
          <PreviewResult result={result.parsed} fileName={result.file.name} onConfirm={confirm} onCancel={reset} />
        )}
      </div>
    </div>
  )
}

function PreviewResult({
  result,
  fileName,
  onConfirm,
  onCancel,
}: {
  result: ParseResult
  fileName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const cols = Object.entries(result.detectedColumns)
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 text-sm text-white">
        <FileSpreadsheet className="h-4 w-4 text-accent" /> {fileName}
        <span className="pill bg-white/5 text-muted ml-auto">{result.rows.length} baris</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {cols.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between border border-border rounded-lg px-3 py-2 bg-bg-elev"
          >
            <span className="text-muted capitalize">{k}</span>
            <span className="text-white truncate max-w-[120px]">{v}</span>
          </div>
        ))}
      </div>

      {result.warnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Beberapa kolom tidak terdeteksi:</p>
            <ul className="list-disc pl-4 mt-1">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>
          Batal
        </button>
        <button className="btn-primary" onClick={onConfirm}>
          Import {result.rows.length} baris
        </button>
      </div>
    </div>
  )
}
