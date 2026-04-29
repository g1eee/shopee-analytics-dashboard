import type { Kpis } from '../lib/metrics'
import { formatNumber, formatPercent, formatRupiah } from '../lib/utils'

interface BrandRow extends Kpis {
  brand: string
}

interface BrandTableProps {
  rows: BrandRow[]
  cirTarget: number
}

export function BrandTable({ rows, cirTarget }: BrandTableProps) {
  const sorted = [...rows].sort((a, b) => b.omset - a.omset)
  return (
    <div className="card overflow-hidden">
      <div className="p-5 pb-3">
        <h3 className="text-sm font-semibold text-white">Brand Insight</h3>
        <p className="text-xs text-muted">Kinerja per brand. Highlight: brand yang lewat target CIR.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-y border-border bg-bg-elev/50">
              <th className="px-5 py-2.5 font-semibold">Brand</th>
              <th className="px-3 py-2.5 font-semibold text-right">Omset</th>
              <th className="px-3 py-2.5 font-semibold text-right">Orders</th>
              <th className="px-3 py-2.5 font-semibold text-right">AOV</th>
              <th className="px-3 py-2.5 font-semibold text-right">CTR</th>
              <th className="px-3 py-2.5 font-semibold text-right">CVR</th>
              <th className="px-3 py-2.5 font-semibold text-right">ROAS</th>
              <th className="px-5 py-2.5 font-semibold text-right">CIR</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const overTarget = r.cir > cirTarget
              return (
                <tr
                  key={r.brand}
                  className="border-b border-border/60 hover:bg-bg-hover transition-colors"
                >
                  <td className="px-5 py-2.5 text-white font-medium">{r.brand}</td>
                  <td className="px-3 py-2.5 text-right text-white">
                    {formatRupiah(r.omset, { compact: true })}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted">{formatNumber(r.orders)}</td>
                  <td className="px-3 py-2.5 text-right text-muted">
                    {formatRupiah(r.aov, { compact: true })}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted">{formatPercent(r.ctr)}</td>
                  <td className="px-3 py-2.5 text-right text-muted">{formatPercent(r.cvr)}</td>
                  <td className="px-3 py-2.5 text-right text-muted">{r.roas.toFixed(2)}x</td>
                  <td className="px-5 py-2.5 text-right">
                    <span
                      className={
                        'pill ' +
                        (overTarget
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-emerald-500/15 text-emerald-300')
                      }
                    >
                      {formatPercent(r.cir)}
                    </span>
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-muted text-sm">
                  Tidak ada data untuk filter saat ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
