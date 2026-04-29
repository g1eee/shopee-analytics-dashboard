import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-bg-hover text-muted"
          onClick={onCancel}
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div
            className={
              destructive
                ? 'h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 grid place-items-center shrink-0'
                : 'h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 grid place-items-center shrink-0'
            }
          >
            <AlertTriangle
              className={destructive ? 'h-5 w-5 text-rose-300' : 'h-5 w-5 text-amber-300'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {description && <p className="text-sm text-muted mt-1">{description}</p>}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={
              destructive
                ? 'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-rose-500 hover:bg-rose-400 text-white transition'
                : 'btn-primary'
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
