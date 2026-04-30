import { formatNumber, formatPercent, safeDivide } from '../../lib/utils'

interface FunnelStep {
  label: string
  value: number
  color: string
}

interface FunnelChartProps {
  halaman: number
  visitor: number
  visitorAtc: number
  addToCart: number
  order: number
}

export function FunnelChart({
  halaman,
  visitor,
  visitorAtc,
  addToCart,
  order,
}: FunnelChartProps) {
  const steps: FunnelStep[] = [
    { label: 'Halaman Dilihat', value: halaman, color: '#a78bfa' },
    { label: 'Pengunjung', value: visitor, color: '#8b5cf6' },
    { label: 'Pengunjung ATC', value: visitorAtc, color: '#60a5fa' },
    { label: 'Add to Cart', value: addToCart, color: '#34d399' },
    { label: 'Pesanan', value: order, color: '#fbbf24' },
  ]
  const max = Math.max(...steps.map((s) => s.value), 1)

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white">Conversion Funnel</h3>
      <p className="text-xs text-muted">Halaman Produk Dilihat → Pengunjung → ATC → Pesanan. Selaras dengan Shopee Dashboard.</p>
      <div className="mt-4 flex flex-col gap-2">
        {steps.map((s, i) => {
          const ratio = s.value / max
          const conv = i === 0 ? 1 : safeDivide(s.value, steps[i - 1].value)
          return (
            <div key={s.label} className="grid grid-cols-[110px_1fr_120px] items-center gap-3">
              <span className="text-xs text-muted">{s.label}</span>
              <div className="relative h-7 rounded-lg bg-bg-elev overflow-hidden border border-border">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg"
                  style={{
                    width: `${Math.max(2, ratio * 100)}%`,
                    background: `linear-gradient(90deg, ${s.color}cc, ${s.color}55)`,
                  }}
                />
                <div className="relative h-full px-2 flex items-center text-xs text-white font-medium">
                  {formatNumber(s.value, { compact: true })}
                </div>
              </div>
              <span className="text-xs text-muted text-right">
                {i === 0 ? '—' : `${formatPercent(conv * 100)} dari sebelumnya`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
