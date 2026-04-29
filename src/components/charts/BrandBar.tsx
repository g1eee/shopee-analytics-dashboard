import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatRupiah } from '../../lib/utils'

interface BrandBarProps {
  data: { brand: string; omset: number; cir: number }[]
  cirTarget: number
}

export function BrandBar({ data, cirTarget }: BrandBarProps) {
  const sorted = [...data].sort((a, b) => b.omset - a.omset).slice(0, 12)
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Brand Performance</h3>
          <p className="text-xs text-muted">
            Bar diwarnai berdasar CIR (target {cirTarget.toFixed(1)}%)
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <Legend swatch="#34d399" label={`CIR ≤ ${cirTarget.toFixed(1)}%`} />
          <Legend swatch="#fb7185" label={`CIR > ${cirTarget.toFixed(1)}%`} />
        </div>
      </div>
      <div className="h-72 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252a3d" vertical={false} />
            <XAxis
              dataKey="brand"
              tick={{ fill: '#7e87a3', fontSize: 10 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={70}
              stroke="#252a3d"
            />
            <YAxis
              tickFormatter={(v) => formatRupiah(v, { compact: true })}
              tick={{ fill: '#7e87a3', fontSize: 11 }}
              stroke="#252a3d"
              width={70}
            />
            <Tooltip
              contentStyle={{
                background: '#11141f',
                border: '1px solid #252a3d',
                borderRadius: 12,
                color: '#fff',
              }}
              formatter={(value, name) => {
                if (name === 'omset') {
                  return [formatRupiah(Number(value)), 'Omset']
                }
                return [String(value), String(name)]
              }}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as { cir: number } | undefined
                return p ? `${String(label)} · CIR ${p.cir.toFixed(1)}%` : String(label ?? '')
              }}
            />
            <Bar dataKey="omset" radius={[6, 6, 0, 0]}>
              {sorted.map((d, i) => (
                <Cell key={i} fill={d.cir <= cirTarget ? '#34d399' : '#fb7185'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: swatch }} />
      {label}
    </span>
  )
}
