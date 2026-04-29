import { Calendar, Clock, RefreshCcw, Upload } from 'lucide-react'

interface HeaderProps {
  month: number
  year: number
  months: { value: number; label: string }[]
  years: number[]
  onMonthChange: (m: number) => void
  onYearChange: (y: number) => void
  onUpload: () => void
  onHistory: () => void
  hasUpdate: boolean
}

export function Header({
  month,
  year,
  months,
  years,
  onMonthChange,
  onYearChange,
  onUpload,
  onHistory,
  hasUpdate,
}: HeaderProps) {
  return (
    <div className="card p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-elev border border-border">
        <Calendar className="h-4 w-4 text-muted" />
        <select
          aria-label="Bulan"
          className="bg-transparent text-sm text-white outline-none cursor-pointer pr-1"
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
        >
          {months.map((m) => (
            <option key={m.value} value={m.value} className="bg-bg-card">
              {m.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Tahun"
          className="bg-transparent text-sm text-white outline-none cursor-pointer"
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y} className="bg-bg-card">
              {y}
            </option>
          ))}
        </select>
      </div>

      <button className="btn-primary" onClick={onUpload}>
        <Upload className="h-4 w-4" />
        Update Data
        {hasUpdate && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
      </button>

      <button className="btn-ghost" onClick={onUpload}>
        <RefreshCcw className="h-4 w-4 text-muted" />
        Pilih file Excel
      </button>

      <button className="btn-ghost ml-auto" onClick={onHistory}>
        <Clock className="h-4 w-4 text-muted" />
        Sync History
      </button>
    </div>
  )
}
