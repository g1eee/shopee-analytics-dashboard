import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  DollarSign,
  Eye,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  Package,
  Percent,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Target,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  CartesianGrid,
} from 'recharts'
import type { RawDataset, SkuRow, SummaryKpi } from '../lib/raw/types'
import {
  actionItems,
  byAdType,
  globalRecommendations,
  iklanRecommendations,
  joinSkus,
  produkRecommendations,
  summaryKpi,
  topByAtcRate,
  topByCtr,
  topByOmzet,
  type Recommendation,
} from '../lib/raw/aggregate'
import { KpiCard } from './KpiCard'
import { FunnelChart } from './charts/FunnelChart'
import { Tabs } from './Tabs'
import { formatNumber, formatPercent, formatRupiah } from '../lib/utils'

interface Props {
  ds: RawDataset
  prevDs?: RawDataset | null
}

const AD_TYPE_COLORS: Record<string, string> = {
  'GMV Max': '#a78bfa',
  'Iklan Produk': '#60a5fa',
  'Iklan Toko': '#22d3ee',
  Manual: '#34d399',
  Other: '#f59e0b',
}

type TabKey = 'global' | 'produk' | 'iklan'

export function SummaryView({ ds, prevDs }: Props) {
  const [tab, setTab] = useState<TabKey>('global')

  const kpi = useMemo(() => summaryKpi(ds), [ds])
  const prevKpi = useMemo(() => (prevDs ? summaryKpi(prevDs) : null), [prevDs])
  const skus = useMemo(() => joinSkus(ds), [ds])
  const adAgg = useMemo(() => byAdType(ds.ads ?? []), [ds])

  // Detect data missing visitor / ATC fields (i.e. uploaded by an older version of the parser).
  const staleNoFunnel = useMemo(() => {
    const parents = (ds.produk ?? []).filter((p) => p.isParent)
    if (parents.length === 0) return false
    const hasImpressions = parents.some((p) => (p.jumlahProdukDilihat ?? 0) > 0)
    const hasVisitors = parents.some((p) => (p.pengunjungKunjungan ?? 0) > 0)
    const hasAtc = parents.some((p) => (p.ditambahKeKeranjang ?? 0) > 0)
    return hasImpressions && !hasVisitors && !hasAtc
  }, [ds])

  // Which file types are present in this dataset?
  const availability = useMemo(
    () => ({
      produk: (ds.produk ?? []).length > 0,
      ads: (ds.ads ?? []).length > 0,
      stock: (ds.stock ?? []).length > 0,
    }),
    [ds],
  )
  const missingFiles = useMemo(() => {
    const out: { key: 'produk' | 'ads' | 'stock'; label: string; hint: string }[] = []
    if (!availability.produk)
      out.push({
        key: 'produk',
        label: 'Performa Produk',
        hint: 'parentskudetail*.xlsx (Shopee Seller Center → Performa)',
      })
    if (!availability.ads)
      out.push({
        key: 'ads',
        label: 'Iklan',
        hint: 'Data Keseluruhan Iklan Shopee*.csv (Shopee Ads → Laporan)',
      })
    if (!availability.stock)
      out.push({
        key: 'stock',
        label: 'Stok',
        hint: 'mass_update_sales_info*.xlsx (Mass Update Stok)',
      })
    return out
  }, [availability])

  const tabs: { value: TabKey; label: string; icon: React.ReactNode }[] = [
    { value: 'global', label: 'Global', icon: <LayoutDashboard className="h-4 w-4" /> },
    { value: 'produk', label: 'Performa Produk', icon: <Package className="h-4 w-4" /> },
    { value: 'iklan', label: 'Iklan', icon: <Megaphone className="h-4 w-4" /> },
  ]

  return (
    <div className="flex flex-col gap-4">
      {missingFiles.length > 0 && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-sky-300 mt-0.5 shrink-0" />
          <div className="text-sm flex-1 min-w-0">
            <p className="text-white font-medium">
              Dataset ini belum lengkap — {missingFiles.length} file belum di-upload
            </p>
            <ul className="text-xs text-muted mt-1 flex flex-col gap-0.5">
              {missingFiles.map((m) => (
                <li key={m.key}>
                  <span className="text-sky-200 font-medium">{m.label}</span>{' '}
                  <span className="text-muted">— {m.hint}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted mt-1.5">
              Klik <span className="text-sky-200">Upload</span> di header → drop file yang kurang ke
              periode &amp; brand yang sama. KPI yang relevan akan otomatis terisi.
            </p>
          </div>
        </div>
      )}
      {staleNoFunnel && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-white font-medium">
              Metrik Pengunjung & Add-to-Cart kosong di dataset ini
            </p>
            <p className="text-xs text-muted mt-0.5">
              Dataset ini di-upload dengan parser versi lama yang belum baca kolom Pengunjung Produk
              & Dimasukkan ke Keranjang. <span className="text-amber-200">Re-upload file Performa
              Produk untuk periode ini</span> via tombol Upload — KPI funnel akan otomatis terisi.
            </p>
          </div>
        </div>
      )}
      <Tabs value={tab} onChange={(v) => setTab(v as TabKey)} items={tabs} />
      {tab === 'global' && (
        <GlobalTab kpi={kpi} prevKpi={prevKpi} skus={skus} ds={ds} availability={availability} />
      )}
      {tab === 'produk' && (
        <ProdukTab kpi={kpi} prevKpi={prevKpi} skus={skus} ds={ds} availability={availability} />
      )}
      {tab === 'iklan' && (
        <IklanTab kpi={kpi} prevKpi={prevKpi} skus={skus} ds={ds} adAgg={adAgg} />
      )}
    </div>
  )
}

type Availability = { produk: boolean; ads: boolean; stock: boolean }

// ----- Helpers -----

function deltaPct(curr: number, prev?: number | null) {
  if (prev == null || prev === 0 || !isFinite(prev)) return undefined
  if (!isFinite(curr)) return undefined
  return ((curr - prev) / Math.abs(prev)) * 100
}

function deltaForKpi(kpi: SummaryKpi, prev: SummaryKpi | null, key: keyof SummaryKpi) {
  if (!prev) return undefined
  const v = deltaPct(Number(kpi[key]), Number(prev[key]))
  return v == null ? undefined : { value: v }
}

// ----- Global Tab -----

function GlobalTab({
  kpi,
  prevKpi,
  skus,
  ds,
  availability,
}: {
  kpi: SummaryKpi
  prevKpi: SummaryKpi | null
  skus: SkuRow[]
  ds: RawDataset
  availability: Availability
}) {
  const top10 = useMemo(() => topByOmzet(skus, 10), [skus])
  const recs = useMemo(() => globalRecommendations(ds), [ds])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Omzet (Pesanan Siap Dikirim)"
          value={formatRupiah(kpi.omzet, { compact: true })}
          sublabel={kpi.omzet ? formatRupiah(kpi.omzet) : 'Belum ada data'}
          icon={<DollarSign className="h-4 w-4" />}
          accent="violet"
          delta={deltaForKpi(kpi, prevKpi, 'omzet')}
        />
        <KpiCard
          label="Pesanan Siap Dikirim"
          value={formatNumber(kpi.pesanan)}
          sublabel={`AOV ${formatRupiah(kpi.aov, { compact: true })}`}
          icon={<ShoppingBag className="h-4 w-4" />}
          accent="emerald"
          delta={deltaForKpi(kpi, prevKpi, 'pesanan')}
        />
        <KpiCard
          label="Total Ad Spend"
          value={formatRupiah(kpi.adSpend, { compact: true })}
          sublabel={kpi.adSpend ? formatRupiah(kpi.adSpend) : '—'}
          icon={<Megaphone className="h-4 w-4" />}
          accent="rose"
          delta={deltaForKpi(kpi, prevKpi, 'adSpend')}
        />
        <KpiCard
          label="ACOS / CIR"
          value={kpi.acos > 0 ? formatPercent(kpi.acos, 2) : '—'}
          sublabel="Cost Income Ratio"
          icon={<Target className="h-4 w-4" />}
          accent="amber"
          delta={deltaForKpi(kpi, prevKpi, 'acos')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <div className="card p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white">Top 10 SKU by Omzet</h3>
          <p className="text-xs text-muted">Warna mencerminkan ACOS (hijau ≤ 10%, kuning ≤ 20%, merah lebih)</p>
          <div className="mt-3 h-[320px]">
            {top10.length === 0 ? (
              <div className="text-sm text-muted py-12 text-center">Belum ada data produk.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart
                  data={top10.map((s) => ({ ...s, label: shortName(s.produkName, 32) }))}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2433" horizontal={false} />
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
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#11141f',
                      border: '1px solid #252a3d',
                      borderRadius: 12,
                    }}
                    formatter={(v, _n, p) => {
                      const sku = p.payload as SkuRow
                      return [`${formatRupiah(Number(v))} · ACOS ${formatPercent(sku.acos, 1)}`, 'Omzet']
                    }}
                    labelFormatter={(_, p) => {
                      const sku = (p?.[0]?.payload ?? {}) as SkuRow
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

        <RecommendationsCard recs={recs} />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <SnapshotCard
          icon={<ShoppingCart className="h-4 w-4 text-emerald-300" />}
          title="Funnel Toko"
          emptyMessage={
            !availability.produk
              ? 'Belum ada data Performa Produk untuk dataset ini. Upload file parentskudetail*.xlsx untuk mengisi funnel.'
              : null
          }
          rows={[
            { label: 'Halaman Dilihat', value: formatNumber(kpi.totalDilihat, { compact: true }) },
            { label: 'Pengunjung', value: formatNumber(kpi.totalPengunjung, { compact: true }) },
            { label: 'Add to Cart', value: formatNumber(kpi.totalAtc, { compact: true }) },
            { label: 'Pesanan Siap Dikirim', value: formatNumber(kpi.pesanan, { compact: true }) },
          ]}
        />
        <SnapshotCard
          icon={<Gauge className="h-4 w-4 text-sky-300" />}
          title="Konversi Toko"
          emptyMessage={
            !availability.produk
              ? 'Belum ada data Performa Produk untuk dataset ini. Upload file parentskudetail*.xlsx untuk menghitung CTR/CVR/AOV.'
              : null
          }
          rows={[
            { label: 'CTR', value: formatPercent(kpi.ctrToko, 2) },
            { label: 'CVR ATC', value: formatPercent(kpi.atcRateToko, 2) },
            { label: 'CVR', value: formatPercent(kpi.cvrToko, 2) },
            { label: 'AOV', value: formatRupiah(kpi.aov, { compact: true }) },
          ]}
        />
        <SnapshotCard
          icon={<Boxes className="h-4 w-4 text-amber-300" />}
          title="Inventori"
          emptyMessage={
            !availability.stock
              ? 'Belum ada data Stok untuk dataset ini. Upload file mass_update_sales_info*.xlsx untuk melihat Total SKU, SKU stok 0, dan availability variant.'
              : null
          }
          rows={[
            { label: 'Total SKU', value: formatNumber(kpi.totalSku) },
            { label: 'SKU stok 0', value: formatNumber(kpi.outOfStockSku) },
            {
              label: 'SKU avail < 100%',
              value: formatNumber(skus.filter((s) => s.variantCount > 0 && s.availabilityPct < 100).length),
            },
          ]}
        />
      </div>
    </div>
  )
}

// ----- Produk Tab -----

function ProdukTab({
  kpi,
  prevKpi,
  skus,
  ds,
  availability,
}: {
  kpi: SummaryKpi
  prevKpi: SummaryKpi | null
  skus: SkuRow[]
  ds: RawDataset
  availability: Availability
}) {
  const recs = useMemo(() => produkRecommendations(ds), [ds])
  const topCtr = useMemo(() => topByCtr(skus, 1000, 8), [skus])
  const topAtc = useMemo(() => topByAtcRate(skus, 500, 8), [skus])
  const stockAlerts = useMemo(() => actionItems(ds, { topN: 5, bestSellerN: 5 }).bestSellerLowStock, [ds])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Halaman Dilihat"
          value={formatNumber(kpi.totalDilihat, { compact: true })}
          sublabel={`Pengunjung ${formatNumber(kpi.totalPengunjung, { compact: true })}`}
          icon={<Eye className="h-4 w-4" />}
          accent="violet"
          delta={deltaForKpi(kpi, prevKpi, 'totalDilihat')}
        />
        <KpiCard
          label="Add to Cart"
          value={formatNumber(kpi.totalAtc, { compact: true })}
          sublabel={`ATC Rate ${formatPercent(kpi.atcRateToko, 2)}`}
          icon={<ShoppingCart className="h-4 w-4" />}
          accent="emerald"
          delta={deltaForKpi(kpi, prevKpi, 'totalAtc')}
        />
        <KpiCard
          label="CTR Toko"
          value={formatPercent(kpi.ctrToko, 2)}
          sublabel={`Klik ${formatNumber(kpi.totalKlik, { compact: true })} ÷ Halaman Dilihat`}
          icon={<MousePointerClick className="h-4 w-4" />}
          accent="sky"
          delta={deltaForKpi(kpi, prevKpi, 'ctrToko')}
        />
        <KpiCard
          label="CVR Toko"
          value={formatPercent(kpi.cvrToko, 2)}
          sublabel={`Pesanan ${formatNumber(kpi.pesanan)} ÷ Pengunjung`}
          icon={<Percent className="h-4 w-4" />}
          accent="amber"
          delta={deltaForKpi(kpi, prevKpi, 'cvrToko')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <FunnelChart
            halaman={kpi.totalDilihat}
            visitor={kpi.totalPengunjung}
            addToCart={kpi.totalAtc}
            order={kpi.pesanan}
          />
        </div>
        <RecommendationsCard recs={recs} />
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <RankCard
          title="Top SKU by CTR"
          subtitle="CTR organic — produk yang berhasil tarik klik"
          rows={topCtr.map((s) => ({
            primary: s.produkName,
            secondary: `Tampilan ${formatNumber(s.dilihat, { compact: true })} · Klik ${formatNumber(s.klik, { compact: true })}`,
            metric: formatPercent(s.ctr, 2),
            metricColor: 'text-violet-300',
          }))}
        />
        <RankCard
          title="Top SKU by ATC Rate"
          subtitle="Rate pengunjung yang masukin keranjang"
          rows={topAtc.map((s) => ({
            primary: s.produkName,
            secondary: `Pengunjung ${formatNumber(s.dilihat, { compact: true })} · ATC ${formatNumber(s.atc, { compact: true })}`,
            metric: formatPercent(s.atcRate, 2),
            metricColor: 'text-emerald-300',
          }))}
        />
      </div>

      <ActionList
        title="Best-seller stok kritis"
        subtitle="5 SKU best-seller dengan stok ≤ 50 atau availability variant < 100%"
        items={stockAlerts}
        empty={
          !availability.stock
            ? 'Belum ada data Stok untuk dataset ini — upload mass_update_sales_info*.xlsx untuk mengaktifkan monitoring stok.'
            : 'Semua best-seller stok aman & semua varian tersedia'
        }
        renderMetric={(s) => (
          <div className="flex items-center gap-2">
            <span className="text-amber-300 font-semibold">{formatNumber(s.totalStock)}</span>
            <span className="text-xs text-muted">unit</span>
          </div>
        )}
        renderSub={(s) => (
          <div className="text-[11px] text-muted">
            Avail{' '}
            <span className={s.availabilityPct < 100 ? 'text-amber-300 font-medium' : 'text-emerald-300'}>
              {formatPercent(s.availabilityPct, 0)}
            </span>{' '}
            ({s.variantsWithStock}/{s.variantCount} varian) · Omzet{' '}
            {formatRupiah(s.omzet, { compact: true })}
          </div>
        )}
        tone="amber"
      />
    </div>
  )
}

// ----- Iklan Tab -----

function IklanTab({
  kpi,
  prevKpi,
  skus,
  ds,
  adAgg,
}: {
  kpi: SummaryKpi
  prevKpi: SummaryKpi | null
  skus: SkuRow[]
  ds: RawDataset
  adAgg: ReturnType<typeof byAdType>
}) {
  const recs = useMemo(() => iklanRecommendations(ds), [ds])
  const actions = useMemo(() => actionItems(ds, { topN: 5, bestSellerN: 5 }), [ds])
  // Top 10 SKU by ad spend — bar chart colored by ROAS health
  const topSpendSkus = useMemo(
    () =>
      skus
        .filter((s) => s.ranAds && s.adSpend > 0)
        .sort((a, b) => b.adSpend - a.adSpend)
        .slice(0, 10)
        .map((s) => ({
          name: shortName(s.produkName, 32),
          fullName: s.produkName,
          spend: s.adSpend,
          roas: s.adSpend > 0 ? s.adOmzet / s.adSpend : 0,
          omzet: s.adOmzet,
        })),
    [skus],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="ROAS"
          value={kpi.roas > 0 ? kpi.roas.toFixed(2) + 'x' : '—'}
          sublabel="Omzet iklan ÷ Spend"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="emerald"
          delta={deltaForKpi(kpi, prevKpi, 'roas')}
        />
        <KpiCard
          label="ACOS"
          value={kpi.acos > 0 ? formatPercent(kpi.acos, 2) : '—'}
          sublabel="Spend ÷ Omzet iklan"
          icon={<Target className="h-4 w-4" />}
          accent="rose"
          delta={deltaForKpi(kpi, prevKpi, 'acos')}
        />
        <KpiCard
          label="CPC"
          value={kpi.cpc > 0 ? formatRupiah(kpi.cpc, { compact: true }) : '—'}
          sublabel="Spend ÷ Klik iklan"
          icon={<BadgeDollarSign className="h-4 w-4" />}
          accent="amber"
          delta={deltaForKpi(kpi, prevKpi, 'cpc')}
        />
        <KpiCard
          label="Total Ad Spend"
          value={formatRupiah(kpi.adSpend, { compact: true })}
          sublabel={`${formatNumber(kpi.adKlik, { compact: true })} klik · ${formatNumber(kpi.adKonversi, { compact: true })} konversi`}
          icon={<ReceiptText className="h-4 w-4" />}
          accent="violet"
          delta={deltaForKpi(kpi, prevKpi, 'adSpend')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <div className="card p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white">Distribusi Spend per Jenis Iklan</h3>
          <p className="text-xs text-muted">ROAS & ACOS dihitung per kategori</p>
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
                          ROAS <span className="text-white font-medium">{a.roas.toFixed(2)}x</span>
                        </span>
                        <span className="text-muted">
                          ACOS <span className="text-white font-medium">{formatPercent(a.acos, 1)}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <RecommendationsCard recs={recs} />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white">Top 10 SKU by Ad Spend</h3>
        <p className="text-xs text-muted">
          Warna bar = kesehatan ROAS. Hijau = efisien (ROAS ≥ 10x), kuning = sedang (3–10x),
          merah = boros (&lt; 3x, kandidat pause).
        </p>
        <div className="mt-3" style={{ height: Math.max(280, topSpendSkus.length * 36) }}>
          {topSpendSkus.length === 0 ? (
            <div className="text-sm text-muted py-16 text-center">Belum ada data iklan SKU.</div>
          ) : (
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={topSpendSkus}
                margin={{ top: 8, right: 64, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2433" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatRupiah(Number(v), { compact: true })}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  stroke="#252a3d"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={220}
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  stroke="#252a3d"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(167,139,250,0.06)' }}
                  contentStyle={{
                    background: '#11141f',
                    border: '1px solid #252a3d',
                    borderRadius: 12,
                  }}
                  formatter={(v, name, p) => {
                    if (name === 'spend') {
                      const r = (p.payload as { roas: number }).roas
                      return [
                        `${formatRupiah(Number(v), { compact: true })} · ROAS ${r.toFixed(2)}x`,
                        'Spend',
                      ]
                    }
                    return v
                  }}
                  labelFormatter={(_, items) => {
                    const d = (items?.[0]?.payload ?? {}) as { fullName?: string }
                    return d.fullName ?? ''
                  }}
                />
                <Bar dataKey="spend" radius={[0, 6, 6, 0]}>
                  {topSpendSkus.map((d, i) => (
                    <Cell key={i} fill={roasColor(d.roas)} />
                  ))}
                  <LabelList
                    dataKey="roas"
                    position="right"
                    formatter={(v) => (typeof v === 'number' ? v.toFixed(1) + 'x' : '')}
                    style={{ fill: '#cbd5e1', fontSize: 11 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <ActionList
          title="ACOS terburuk"
          subtitle="5 SKU spend ≥ Rp 100rb dengan ACOS tertinggi — kandidat pause"
          items={actions.worstAcos}
          empty="Belum ada SKU dengan ACOS bermasalah"
          renderMetric={(s) => (
            <span className="text-rose-300 font-semibold">{formatPercent(s.acos, 1)}</span>
          )}
          renderSub={(s) => (
            <span className="text-muted text-[11px]">
              Spend {formatRupiah(s.adSpend, { compact: true })} · ROAS{' '}
              {s.adSpend > 0 ? (s.adOmzet / s.adSpend).toFixed(2) + 'x' : '—'}
            </span>
          )}
          tone="rose"
        />
        <ActionList
          title="Potensial diiklankan"
          subtitle="5 SKU CTR ≥ 2% dengan omzet ≥ Rp 1jt tapi belum/sedikit diiklankan"
          items={actions.potentialAds}
          empty="Tidak ada produk potensial saat ini"
          renderMetric={(s) => (
            <span className="text-emerald-300 font-semibold">{formatPercent(s.ctr, 1)}</span>
          )}
          renderSub={(s) => (
            <span className="text-muted text-[11px]">
              Omzet {formatRupiah(s.omzet, { compact: true })} · Ad spend{' '}
              {s.ranAds ? formatRupiah(s.adSpend, { compact: true }) : 'belum diiklankan'}
            </span>
          )}
          tone="emerald"
        />
      </div>
    </div>
  )
}

// ----- Reusable -----

function RecommendationsCard({ recs }: { recs: Recommendation[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const open = openIdx != null ? recs[openIdx] : null

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-300" />
        <h3 className="text-sm font-semibold text-white">Apa yang harus dilakuin</h3>
      </div>
      <p className="text-xs text-muted">
        Auto-summary insight & rekomendasi action.{' '}
        <span className="text-amber-200/80">Klik kartu untuk lihat detail produk.</span>
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {recs.length === 0 ? (
          <li className="text-xs text-muted text-center py-6">
            Tidak ada rekomendasi prioritas — performa sehat.
          </li>
        ) : (
          recs.map((r, i) => {
            const clickable = (r.items?.length ?? 0) > 0
            return (
              <li
                key={i}
                className={
                  'rounded-xl border bg-bg-elev p-3 flex items-start gap-3 transition ' +
                  (clickable
                    ? 'cursor-pointer border-border hover:border-accent/50 hover:bg-bg-hover'
                    : 'border-border')
                }
                onClick={() => clickable && setOpenIdx(i)}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    setOpenIdx(i)
                  }
                }}
              >
                <span
                  className={
                    'pill border ' +
                    (r.level === 'high'
                      ? 'bg-rose-400/10 text-rose-300 border-rose-400/30'
                      : r.level === 'medium'
                        ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                        : 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30')
                  }
                >
                  {r.level}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium leading-tight flex-1">
                      {r.title}
                    </p>
                    {clickable && (
                      <span className="text-[11px] text-accent shrink-0">
                        Lihat {r.items!.length} →
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1 leading-snug">{r.detail}</p>
                </div>
              </li>
            )
          })
        )}
      </ul>
      <RecommendationDetailDialog rec={open} onClose={() => setOpenIdx(null)} />
    </div>
  )
}

function RecommendationDetailDialog({
  rec,
  onClose,
}: {
  rec: Recommendation | null
  onClose: () => void
}) {
  if (!rec || !rec.items || rec.items.length === 0) return null
  const levelClass =
    rec.level === 'high'
      ? 'bg-rose-400/10 text-rose-300 border-rose-400/30'
      : rec.level === 'medium'
        ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
        : 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
  return (
    <div
      className="fixed inset-0 z-[55] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl p-6 relative max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-bg-hover text-muted"
          onClick={onClose}
          aria-label="Tutup"
        >
          ×
        </button>
        <div className="flex items-start gap-3 pr-8">
          <span className={'pill border shrink-0 ' + levelClass}>{rec.level}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white leading-tight">{rec.title}</h2>
            <p className="text-sm text-muted mt-1">{rec.detail}</p>
          </div>
        </div>
        <div className="mt-5 overflow-y-auto pr-1">
          <p className="text-[11px] uppercase tracking-wider text-muted mb-2">
            Detail produk ({rec.items.length})
          </p>
          <ul className="flex flex-col gap-2">
            {rec.items.map((it, i) => (
              <li
                key={i}
                className="rounded-xl border border-border bg-bg-elev px-3 py-2.5 flex items-start gap-3"
              >
                <span className="text-[11px] text-muted w-6 shrink-0 mt-0.5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white break-words">{it.name}</p>
                  {it.sub && <p className="text-[11px] text-muted mt-0.5">{it.sub}</p>}
                </div>
                {it.metric && (
                  <span className="text-sm font-semibold text-white shrink-0">{it.metric}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function SnapshotCard({
  icon,
  title,
  rows,
  emptyMessage,
}: {
  icon: React.ReactNode
  title: string
  rows: { label: string; value: string }[]
  emptyMessage?: string | null
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {emptyMessage ? (
        <p className="mt-3 text-xs text-muted leading-relaxed">{emptyMessage}</p>
      ) : (
        <dl className="mt-3 flex flex-col gap-1.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <dt className="text-muted">{r.label}</dt>
              <dd className="text-white font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function RankCard({
  title,
  subtitle,
  rows,
}: {
  title: string
  subtitle: string
  rows: { primary: string; secondary: string; metric: string; metricColor?: string }[]
}) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs text-muted">{subtitle}</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {rows.length === 0 ? (
          <li className="text-xs text-muted text-center py-6">Belum ada data.</li>
        ) : (
          rows.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border bg-bg-elev px-2.5 py-1.5"
            >
              <span className="text-[11px] text-muted w-5">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate" title={r.primary}>
                  {r.primary}
                </p>
                <p className="text-[11px] text-muted truncate">{r.secondary}</p>
              </div>
              <span className={'text-sm font-semibold shrink-0 ' + (r.metricColor ?? 'text-white')}>
                {r.metric}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

interface ActionListProps {
  title: string
  subtitle: string
  items: SkuRow[]
  empty: string
  tone: 'rose' | 'amber' | 'emerald'
  renderMetric: (s: SkuRow) => React.ReactNode
  renderSub: (s: SkuRow) => React.ReactNode
}

function ActionList({ title, subtitle, items, empty, tone, renderMetric, renderSub }: ActionListProps) {
  const toneCls = { rose: 'text-rose-300', amber: 'text-amber-300', emerald: 'text-emerald-300' }[tone]
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
                <div className="mt-0.5">{renderSub(s)}</div>
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
  if (!name) return ''
  if (name.length <= max) return name
  return name.slice(0, max - 1).trimEnd() + '…'
}

function acosColor(acos: number): string {
  if (!isFinite(acos) || acos <= 0) return '#475569'
  if (acos <= 10) return '#34d399'
  if (acos <= 20) return '#f59e0b'
  return '#f43f5e'
}

function roasColor(roas: number): string {
  if (!isFinite(roas) || roas <= 0) return '#475569'
  if (roas >= 10) return '#34d399'
  if (roas >= 3) return '#f59e0b'
  return '#f43f5e'
}
