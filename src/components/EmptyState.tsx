import { FileSpreadsheet, Sparkles, Upload } from 'lucide-react'

interface EmptyStateProps {
  onUpload: () => void
  onLoadSample: () => void
}

export function EmptyState({ onUpload, onLoadSample }: EmptyStateProps) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-accent-gradient grid place-items-center border border-accent/30">
        <FileSpreadsheet className="h-7 w-7 text-accent" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white">
        Belum ada data
      </h2>
      <p className="mt-1 text-sm text-muted max-w-md mx-auto">
        Upload export Excel dari Shopee Seller Center atau platform lainnya, atau coba
        sample data buat lihat tampilan dashboard.
      </p>
      <div className="mt-5 flex justify-center gap-2 flex-wrap">
        <button className="btn-primary" onClick={onUpload}>
          <Upload className="h-4 w-4" />
          Upload Excel
        </button>
        <button className="btn-ghost" onClick={onLoadSample}>
          <Sparkles className="h-4 w-4 text-accent" />
          Coba Sample Data
        </button>
      </div>
    </div>
  )
}
