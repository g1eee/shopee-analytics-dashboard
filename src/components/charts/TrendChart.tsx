import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatRupiah } from '../../lib/utils'

interface TrendChartProps {
  data: { date: string; shopee: number; tiktok: number; total: number }[]
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Trend Omset Harian</h3>
          <p className="text-xs text-muted">Per channel selama periode terpilih</p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="grad-shopee" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-tiktok" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252a3d" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => v.slice(8)}
              tick={{ fill: '#7e87a3', fontSize: 11 }}
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
              labelStyle={{ color: '#7e87a3' }}
              formatter={(value, name) => [formatRupiah(Number(value)), String(name)]}
            />
            <Legend wrapperStyle={{ color: '#fff', fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="shopee"
              name="Shopee"
              stroke="#a78bfa"
              strokeWidth={2}
              fill="url(#grad-shopee)"
            />
            <Area
              type="monotone"
              dataKey="tiktok"
              name="TikTok"
              stroke="#60a5fa"
              strokeWidth={2}
              fill="url(#grad-tiktok)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
