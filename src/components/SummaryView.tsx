import { useMemo } from 'react'
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Megaphone,
  MousePointerClick,
  Percent,
  ShoppingBag,
  Target,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
} from 'recharts'
import type { RawDataset } from '../lib/raw/types'
import { actionItems, byAdType, joinSkus, summaryKpi, topByOmzet } from '../lib/raw/aggregate'
import { KpiCard } from './KpiCard'
import { formatNumber, formatPercent, formatRupiah } from '../lib/utils'

interface Props {
  ds: RawDataset
}

const AD_TYPE_COLORS: Record<string, string> = {
  'GMV Max': '#a78bfa',
  'Iklan Produk': '#60a5fa',
  Manual: '#34d399',
  Other: '#f59e0b',
}

export function SummaryView({ ds }: Props) {
  const kpi = useMemo(() => summaryKpi(ds), [ds])
  const adAgg = useMemo(() => byAdType(ds.ads ?? []), [ds])
  const skus = useMemo(() => joinSkus(ds), [ds])
  const top10 = useMemo(() => topByOmzet(skus, 10), [skus])
  const actions = useMemo(() => actionItems(ds, { topN: 5, bestSellerN: 5 }), [ds])

  return (
    <div className="flex flex-col gap-4">
      <DatasetHeader ds={ds} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Omzet (Pesanan Siap Dikirim)"
          value={formatRupiah(kpi.omzet, { compact: true })}
          sublabel={kpi.omzet ? formatRupiah(kpi.omzet) : 'Belum ada data'}
          icon={<DollarSign className="h-4 w-4" />}
          accent="violet"
        />
        <KpiCard
          label="Pesanan Siap Dikirim"
          value={formatNumber(kpi.pesanan)}
          sublabel={`AOV ${formatRupiah(kpi.aov, { compact: true })}`}
          icon={<ShoppingBag className="h-4 w-4" />}
          accent="emerald"
        />
        <KpiCard
          label="CTR Toko"
          value={formatPercent(kpi.ctrToko, 2)}
          sublabel="Klik ÷ Tampilan"
          icon={<MousePointerClick className="h-4 w-4" />}
          accent="sky"
        />
        <KpiCard
          label="CVR Toko"
          value={formatPercent(kpi.cvrToko, 2)}
          sublabel="Pesanan ÷ Klik"
          icon={<Percent className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Total Ad Spend"
          value={formatRupiah(kpi.adSpend, { compact: true })}
          sublabel={kpi.adSpend ? formatRupiah(kpi.adSpend) : '—'}
          icon={<Megaphone className="h-4 w-4" />}
          accent="rose"
        />
        <KpiCard
          label="Blended ROAS"
          value={kpi.roas > 0 ? kpi.roas.toFixed(2) + 'x' : '—'}
          sublabel={kpi.roas > 0 ? 'Omzet iklan ÷ Spend' : 'Belum ada data iklan'}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="emerald"
        />
        <KpiCard
          label="ACOS"
          value={kpi.acos > 0 ? formatPercent(kpi.acos, 2) : '—'}
          sublabel="Spend ÷ Omzet iklan"
          icon={<Target className="h-4 w-4" />}
          accent="rose"
        />
        <KpiCard
          label="SKU"
          value={formatNumber(kpi.totalSku)}
          sublabel={
            kpi.totalSku
              ? `${kpi.outOfStockSku} produk stok 0`
              : 'Upload data stok untuk melihat'
          }
          icon={<Boxes className="h-4 w-4" />}
          accent="sky"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Distribusi Spend per Jenis Iklan</h3>
              <p className="text-xs text-muted">ROAS & ACOS dihitung per kategori</p>
            </div>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3 items-center">
            {adAgg.length === 0 ? (
              <div className="text-sm text-muted col-span-2 py-12 text-center">
                Belum ada data iklan untuk periode ini.
              </div>
            ) : (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={adAgg}
                        dataKey="spend"
                        nameKey="type"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                      >
                        {adAgg.map((a, i) => (
                          <Cell key={i} fill={AD_TYPE_COLORS[a.type] ?? '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#11141f',
                          border: '1px solid #252a3d',
                          borderRadius: 12,
                        }}
                        formatter={(v) => formatRupiah(Number(v), { compact: true })}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {adAgg.map((a) => (
                    <div key={a.type} className="rounded-xl border border-border bg-bg-elev p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: AD_TYPE_COLORS[a.type] ?? '#94a3b8' }}
                        />
                        <span className="text-sm font-medium text-white">{a.type}</span>
                        <span className="ml-auto text-xs text-muted">
                          {formatRupiah(a.spend, { compact: true })}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                        <span className="text-muted">
                          ROAS{' '}
                          <span className="text-white font-medium">{a.roas.toFixed(2)}x</span>
                        </span>
                        <span className="text-muted">
                          ACOS{' '}
                          <span className="text-white font-medium">
                            {formatPercent(a.acos, 1)}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-white">Top 10 SKU by Omzet</h3>
          <p className="text-xs text-muted">Warna mencerminkan ACOS (hijau ≤ 10%, kuning ≤ 20%, merah lebih)</p>
          <div className="mt-3 h-[280px]">
            {top10.length === 0 ? (
              <div className="text-sm text-muted py-12 text-center">Belum ada data produk.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart
                  data={top10.map((s) => ({
                    ...s,
                    label: shortName(s.produkName),
                  }))}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatRupiah(Number(v), { compact: true })}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    stroke="#252a3d"
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    stroke="#252a3d"
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#11141f',
                      border: '1px solid #252a3d',
                      borderRadius: 12,
                    }}
                    formatter={(v, _n, p) => {
                      const sku = p.payload as ReturnType<typeof topByOmzet>[number]
                      return [
                        `${formatRupiah(Number(v))}\nACOS ${formatPercent(sku.acos, 1)}`,
                        'Omzet',
                      ]
                    }}
                    labelFormatter={(_, p) => {
                      const sku = (p?.[0]?.payload ?? {}) as ReturnType<typeof topByOmzet>[number]
                      return sku.produkName ?? ''
                    }}
                  />
                  <Bar dataKey="omzet" radius={[0, 6, 6, 0]}>
                    {top10.map((s, i) => (
                      <Cell key={i} fill={acosColor(s.acos)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Action panel */}
      <div className="grid xl:grid-cols-3 gap-3">
        <ActionCard
          title="ACOS terburuk"
          subtitle="5 SKU dengan ACOS tertinggi (spend ≥ Rp 100rb) — pertimbangkan pause atau optimasi bid"
          tone="rose"
          empty="Belum ada SKU dengan ACOS bermasalah"
          items={actions.worstAcos}
          renderMetric={(s) => (
            <span className="text-rose-300 font-semibold">{formatPercent(s.acos, 1)}</span>
          )}
          renderSub={(s) => (
            <span className="text-muted">
              Spend {formatRupiah(s.adSpend, { compact: true })} · ROAS{' '}
              {s.adSpend > 0 ? (s.adOmzet / s.adSpend).toFixed(2) + 'x' : '—'}
            </span>
          )}
        />
        <ActionCard
          title="Best-seller stok kritis"
          subtitle="5 SKU best-seller dengan stok ≤ 50 unit atau availability variant < 100%"
          tone="amber"
          empty="Semua best-seller stok aman & semua varian tersedia"
          items={actions.bestSellerLowStock}
          renderMetric={(s) => (
            <div className="flex items-center gap-2">
              <span className="text-amber-300 font-semibold">{formatNumber(s.totalStock)}</span>
              <span className="text-xs text-muted">unit</span>
            </div>
          )}
          renderSub={(s) => (
            <div className="text-xs text-muted">
              Avail{' '}
              <span
                className={
                  s.availabilityPct < 100 ? 'text-amber-300 font-medium' : 'text-emerald-300'
                }
              >
                {formatPercent(s.availabilityPct, 0)}
              </span>{' '}
              ({s.variantsWithStock}/{s.variantCount} varian) · Omzet{' '}
              {formatRupiah(s.omzet, { compact: true })}
            </div>
          )}
        />
        <ActionCard
          title="Potensial diiklankan"
          subtitle="5 SKU CTR ≥ 2% dengan omzet ≥ Rp 1jt tapi belum/sedikit diiklankan"
          tone="emerald"
          empty="Tidak ada produk potensial saat ini"
          items={actions.potentialAds}
          renderMetric={(s) => (
            <span className="text-emerald-300 font-semibold">{formatPercent(s.ctr, 1)}</span>
          )}
          renderSub={(s) => (
            <span className="text-muted">
              Omzet {formatRupiah(s.omzet, { compact: true })} · Ad spend{' '}
              {s.ranAds ? formatRupiah(s.adSpend, { compact: true }) : 'belum diiklankan'}
            </span>
          )}
        />
      </div>
    </div>
  )
}

function DatasetHeader({ ds }: { ds: RawDataset }) {
  return (
    <div className="card p-4 flex flex-wrap items-center gap-3">
      <div className="flex flex-col">
        <h2 className="text-base font-semibold text-white">{ds.name}</h2>
        <div className="text-xs text-muted flex flex-wrap gap-x-3 gap-y-0.5">
          {ds.brand && <span>Brand: {ds.brand}</span>}
          {ds.period?.start && ds.period?.end && (
            <span>
              Periode: {ds.period.start} → {ds.period.end}
            </span>
          )}
          <span>Diupload {new Date(ds.uploadedAt).toLocaleString('id-ID')}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 ml-auto">
        <SourceBadge label="Performa Produk" filled={!!ds.produk?.length} count={ds.produk?.length} />
        <SourceBadge label="Iklan" filled={!!ds.ads?.length} count={ds.ads?.length} />
        <SourceBadge label="Stok" filled={!!ds.stock?.length} count={ds.stock?.length} />
      </div>
    </div>
  )
}

function SourceBadge({ label, filled, count }: { label: string; filled: boolean; count?: number }) {
  return (
    <span
      className={
        'pill border ' +
        (filled
          ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
          : 'bg-white/5 text-muted border-border')
      }
    >
      {label}
      {filled && count != null ? <span className="text-muted">· {formatNumber(count)}</span> : null}
    </span>
  )
}

interface ActionCardProps {
  title: string
  subtitle: string
  tone: 'rose' | 'amber' | 'emerald'
  empty: string
  items: ReturnType<typeof actionItems>['worstAcos']
  renderMetric: (s: ReturnType<typeof actionItems>['worstAcos'][number]) => React.ReactNode
  renderSub: (s: ReturnType<typeof actionItems>['worstAcos'][number]) => React.ReactNode
}

function ActionCard({
  title,
  subtitle,
  tone,
  empty,
  items,
  renderMetric,
  renderSub,
}: ActionCardProps) {
  const toneCls = {
    rose: 'text-rose-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
  }[tone]
  return (
    <div className="card p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className={'h-4 w-4 mt-0.5 ' + toneCls} />
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {items.length === 0 ? (
          <li className="text-xs text-muted text-center py-6">{empty}</li>
        ) : (
          items.map((s) => (
            <li
              key={s.kodeProduk}
              className="rounded-xl border border-border bg-bg-elev p-2.5 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate" title={s.produkName}>
                  {s.produkName}
                </div>
                <div className="text-[11px] mt-0.5">{renderSub(s)}</div>
              </div>
              <div className="text-right shrink-0">{renderMetric(s)}</div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function shortName(name: string, max = 38): string {
  if (name.length <= max) return name
  return name.slice(0, max - 1).trimEnd() + '…'
}

function acosColor(acos: number): string {
  if (!isFinite(acos) || acos <= 0) return '#475569'
  if (acos <= 10) return '#34d399'
  if (acos <= 20) return '#f59e0b'
  return '#f43f5e'
}
