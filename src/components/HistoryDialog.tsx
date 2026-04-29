import { Clock, FileSpreadsheet, Trash2, X } from 'lucide-react'
import type { DatasetMeta } from '../lib/types'

interface HistoryDialogProps {
  open: boolean
  onClose: () => void
  history: DatasetMeta[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onDeleteAll?: () => void
}

export function HistoryDialog({
  open,
  onClose,
  history,
  activeId,
  onSelect,
  onDelete,
  onDeleteAll,
}: HistoryDialogProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-xl p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-bg-hover text-muted"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-accent" /> Sync History
        </h2>
        <p className="text-sm text-muted mt-1">
          Daftar upload sebelumnya. Klik untuk aktifkan, atau hapus per-dataset / semua data.
        </p>
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="text-sm text-muted py-8 text-center">Belum ada riwayat.</div>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((h) => (
                <li
                  key={h.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition ${
                    h.id === activeId
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-bg-elev hover:border-accent/40'
                  }`}
                  onClick={() => onSelect(h.id)}
                >
                  <FileSpreadsheet className="h-4 w-4 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{h.name}</div>
                    <div className="text-xs text-muted">
                      {new Date(h.uploadedAt).toLocaleString('id-ID')} · {h.rowCount} baris
                    </div>
                  </div>
                  <button
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(h.id)
                    }}
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {onDeleteAll && history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Hapus semua dataset (semua brand & periode) sekaligus.
            </p>
            <button
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition"
              onClick={onDeleteAll}
            >
              <Trash2 className="h-4 w-4" />
              Hapus semua data
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
