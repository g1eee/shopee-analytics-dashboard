import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatRupiah } from '../../lib/utils'

const COLORS = ['#a78bfa', '#60a5fa', '#f472b6', '#34d399', '#fbbf24']

interface ChannelDonutProps {
  data: { name: string; value: number }[]
}

export function ChannelDonut({ data }: ChannelDonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white">Distribusi Channel</h3>
      <p className="text-xs text-muted">Share omset per channel</p>
      <div className="h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={60}
              outerRadius={86}
              paddingAngle={4}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#11141f',
                border: '1px solid #252a3d',
                borderRadius: 12,
                color: '#fff',
              }}
              formatter={(value) => formatRupiah(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-wide text-muted">Total</div>
            <div className="text-base font-semibold text-white">
              {formatRupiah(total, { compact: true })}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 justify-center text-xs">
        {data.map((d, i) => (
          <span
            key={d.name}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-elev border border-border"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-white">{d.name}</span>
            <span className="text-muted">{((d.value / total) * 100 || 0).toFixed(1)}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}
