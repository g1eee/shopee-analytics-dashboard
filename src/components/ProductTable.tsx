import { Trophy, TrendingDown } from 'lucide-react'
import type { Kpis } from '../lib/metrics'
import { formatNumber, formatPercent, formatRupiah } from '../lib/utils'

interface ProductRow extends Kpis {
  brand: string
  product: string
}

interface ProductTableProps {
  rows: ProductRow[]
  variant: 'top' | 'bottom'
  limit?: number
}

export function ProductTable({ rows, variant, limit = 8 }: ProductTableProps) {
  const sorted = [...rows].sort((a, b) =>
    variant === 'top' ? b.omset - a.omset : a.omset - b.omset,
  ).slice(0, limit)

  const Icon = variant === 'top' ? Trophy : TrendingDown
  const accent = variant === 'top' ? 'text-amber-300' : 'text-rose-300'

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent}`} />
        <h3 className="text-sm font-semibold text-white">
          {variant === 'top' ? 'Top Produk' : 'Slow-Moving Produk'}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-y border-border bg-bg-elev/50">
              <th className="px-5 py-2 font-semibold">Produk</th>
              <th className="px-3 py-2 font-semibold text-right">Qty</th>
              <th className="px-3 py-2 font-semibold text-right">Omset</th>
              <th className="px-5 py-2 font-semibold text-right">CVR</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={`${r.brand}__${r.product}__${i}`}
                className="border-b border-border/60 hover:bg-bg-hover transition-colors"
              >
                <td className="px-5 py-2.5">
                  <div className="text-white truncate max-w-[260px]">{r.product}</div>
                  <div className="text-[11px] text-muted">{r.brand}</div>
                </td>
                <td className="px-3 py-2.5 text-right text-muted">{formatNumber(r.quantity)}</td>
                <td className="px-3 py-2.5 text-right text-white">
                  {formatRupiah(r.omset, { compact: true })}
                </td>
                <td className="px-5 py-2.5 text-right text-muted">{formatPercent(r.cvr)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted text-sm">
                  Belum ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
