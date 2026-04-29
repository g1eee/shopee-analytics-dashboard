import { useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  DollarSign,
  Eye,
  MousePointerClick,
  Percent,
  ShoppingBag,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { EmptyState } from './components/EmptyState'
import { Header } from './components/Header'
import { HistoryDialog } from './components/HistoryDialog'
import { KpiCard } from './components/KpiCard'
import { Tabs } from './components/Tabs'
import { UploadDialog } from './components/UploadDialog'
import { BrandTable } from './components/BrandTable'
import { ProductTable } from './components/ProductTable'
import { BrandBar } from './components/charts/BrandBar'
import { ChannelDonut } from './components/charts/ChannelDonut'
import { FunnelChart } from './components/charts/FunnelChart'
import { TrendChart } from './components/charts/TrendChart'
import { aggregate, byBrand, byChannel, byDate, byProduct, filterRows, kpisFor } from './lib/metrics'
import { generateSampleDataset } from './lib/sample'
import { addDataset, loadState, removeDataset, setActive } from './lib/storage'
import type { AppState, Channel, Dataset } from './lib/types'
import { formatNumber, formatPercent, formatRupiah, safeDivide } from './lib/utils'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const CIR_TARGET_DEFAULT = 14.1

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [tab, setTab] = useState<'performance' | 'insight' | 'product' | 'trend'>('performance')
  const [showUpload, setShowUpload] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())

  const active = useMemo(
    () => state.datasets.find((d) => d.meta.id === state.activeDatasetId) ?? state.datasets[0],
    [state.datasets, state.activeDatasetId],
  )

  // sync default period to dataset's most recent month
  const [syncedFor, setSyncedFor] = useState<string | null>(null)
  if (active && active.rows.length > 0 && syncedFor !== active.meta.id) {
    const latest = active.rows.reduce(
      (acc, r) => (r.date > acc ? r.date : acc),
      active.rows[0].date,
    )
    const d = new Date(latest)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
    setSyncedFor(active.meta.id)
  }

  function handleLoaded(ds: Dataset) {
    setState((s) => addDataset(s, ds))
  }

  function handleSample() {
    const ds = generateSampleDataset(year, month)
    setState((s) => addDataset(s, ds))
    setShowUpload(false)
  }

  function handleSelectHistory(id: string) {
    setState((s) => setActive(s, id))
    setShowHistory(false)
  }

  function handleDeleteHistory(id: string) {
    setState((s) => removeDataset(s, id))
  }

  // Filtered period
  const filtered = useMemo(() => {
    if (!active) return []
    return filterRows(active.rows, { month, year })
  }, [active, month, year])

  const prevFiltered = useMemo(() => {
    if (!active) return []
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    return filterRows(active.rows, { month: prevMonth, year: prevYear })
  }, [active, month, year])

  const k = useMemo(() => kpisFor(filtered), [filtered])
  const kPrev = useMemo(() => kpisFor(prevFiltered), [prevFiltered])

  const channels = useMemo(() => byChannel(filtered), [filtered])
  const brands = useMemo(() => byBrand(filtered), [filtered])
  const products = useMemo(() => byProduct(filtered), [filtered])
  const dailyAgg = useMemo(() => byDate(filtered), [filtered])

  const trendData = useMemo(() => {
    return dailyAgg.map((d) => {
      const day = filtered.filter((r) => r.date === d.date)
      const shopeeAgg = aggregate(day.filter((r) => r.channel === 'Shopee'))
      const tiktokAgg = aggregate(day.filter((r) => r.channel === 'TikTok'))
      return {
        date: d.date,
        shopee: shopeeAgg.omset,
        tiktok: tiktokAgg.omset,
        total: d.omset,
      }
    })
  }, [dailyAgg, filtered])

  const channelDonutData = channels.map((c) => ({ name: c.channel, value: c.omset }))

  const cirTarget = CIR_TARGET_DEFAULT
  const onTargetCount = brands.filter((b) => b.cir <= cirTarget && b.omset > 0).length
  const totalBrands = brands.length

  const months = MONTHS.map((m, i) => ({ value: i + 1, label: m }))
  const years = useMemo(() => {
    if (!active) return [year]
    const set = new Set<number>([year])
    active.rows.forEach((r) => set.add(new Date(r.date).getFullYear()))
    return [...set].sort((a, b) => a - b)
  }, [active, year])

  function delta(curr: number, prev: number): number | undefined {
    if (!prev) return undefined
    return ((curr - prev) / prev) * 100
  }

  const shopeeOmset = channels.find((c) => c.channel === 'Shopee')?.omset ?? 0
  const tiktokOmset = channels.find((c) => c.channel === 'TikTok')?.omset ?? 0
  const otherOmset = channels
    .filter((c) => !['Shopee', 'TikTok'].includes(c.channel as Channel))
    .reduce((s, c) => s + c.omset, 0)

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-5 flex flex-col gap-4">
        <TopBar
          datasetName={active?.meta.name}
          rowCount={active?.meta.rowCount}
        />

        <Header
          month={month}
          year={year}
          months={months}
          years={years}
          onMonthChange={setMonth}
          onYearChange={setYear}
          onUpload={() => setShowUpload(true)}
          onHistory={() => setShowHistory(true)}
          hasUpdate={state.datasets.length === 0}
        />

        {!active ? (
          <EmptyState onUpload={() => setShowUpload(true)} onLoadSample={handleSample} />
        ) : (
          <>
            <Tabs
              value={tab}
              onChange={(v) => setTab(v as typeof tab)}
              items={[
                { value: 'performance', label: 'Brand Performance', icon: <TrendingUp className="h-4 w-4" /> },
                { value: 'insight', label: 'Brand Insight', icon: <Eye className="h-4 w-4" /> },
                { value: 'product', label: 'Product Performance', icon: <ShoppingBag className="h-4 w-4" /> },
                { value: 'trend', label: 'Trend Analysis', icon: <Activity className="h-4 w-4" /> },
              ]}
            />

            {tab === 'performance' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <KpiCard
                    label="TOTAL OMSET GLOBAL"
                    value={formatRupiah(k.omset, { compact: true })}
                    sublabel={`${MONTHS[month - 1]} ${year}`}
                    icon={<DollarSign className="h-4 w-4" />}
                    accent="violet"
                    delta={delta(k.omset, kPrev.omset) != null ? { value: delta(k.omset, kPrev.omset)! } : undefined}
                  />
                  <KpiCard
                    label="OMSET SHOPEE"
                    value={formatRupiah(shopeeOmset, { compact: true })}
                    sublabel={`${MONTHS[month - 1]} ${year}`}
                    icon={<TrendingUp className="h-4 w-4" />}
                    accent="amber"
                  />
                  <KpiCard
                    label="OMSET TIKTOK"
                    value={formatRupiah(tiktokOmset, { compact: true })}
                    sublabel={`${MONTHS[month - 1]} ${year}`}
                    icon={<TrendingDown className="h-4 w-4" />}
                    accent="rose"
                  />
                  <KpiCard
                    label="AVG CIR"
                    value={formatPercent(k.cir)}
                    sublabel={`Target: ${cirTarget.toFixed(1)}%`}
                    icon={<Target className="h-4 w-4" />}
                    accent="emerald"
                  />
                  <KpiCard
                    label="ON TARGET"
                    value={`${onTargetCount}/${totalBrands}`}
                    sublabel="Brands meeting CIR target"
                    icon={<BarChart3 className="h-4 w-4" />}
                    accent="sky"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <KpiCard
                    label="ORDERS"
                    value={formatNumber(k.orders, { compact: true })}
                    sublabel={`AOV ${formatRupiah(k.aov, { compact: true })}`}
                    icon={<ShoppingBag className="h-4 w-4" />}
                    accent="violet"
                    delta={delta(k.orders, kPrev.orders) != null ? { value: delta(k.orders, kPrev.orders)! } : undefined}
                  />
                  <KpiCard
                    label="CTR"
                    value={formatPercent(k.ctr)}
                    sublabel="Click / Impression"
                    icon={<MousePointerClick className="h-4 w-4" />}
                    accent="sky"
                    delta={delta(k.ctr, kPrev.ctr) != null ? { value: delta(k.ctr, kPrev.ctr)! } : undefined}
                  />
                  <KpiCard
                    label="CVR"
                    value={formatPercent(k.cvr)}
                    sublabel="Order / Click"
                    icon={<Percent className="h-4 w-4" />}
                    accent="emerald"
                    delta={delta(k.cvr, kPrev.cvr) != null ? { value: delta(k.cvr, kPrev.cvr)! } : undefined}
                  />
                  <KpiCard
                    label="ROAS"
                    value={`${k.roas.toFixed(2)}x`}
                    sublabel={`Spend ${formatRupiah(k.adSpend, { compact: true })}`}
                    icon={<Zap className="h-4 w-4" />}
                    accent="amber"
                    delta={delta(k.roas, kPrev.roas) != null ? { value: delta(k.roas, kPrev.roas)! } : undefined}
                  />
                  <KpiCard
                    label="VISITOR"
                    value={formatNumber(k.visitor, { compact: true })}
                    sublabel={`ATC ${formatPercent(k.atcRate)}`}
                    icon={<Users className="h-4 w-4" />}
                    accent="sky"
                  />
                  <KpiCard
                    label="REFUND RATE"
                    value={formatPercent(k.refundRate)}
                    sublabel={`Net ${formatRupiah(k.netOmset, { compact: true })}`}
                    icon={<Wallet className="h-4 w-4" />}
                    accent="rose"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <TrendChart data={trendData} />
                  </div>
                  <ChannelDonut data={channelDonutData} />
                </div>

                <BrandBar data={brands.map((b) => ({ brand: b.brand, omset: b.omset, cir: b.cir }))} cirTarget={cirTarget} />
              </>
            )}

            {tab === 'insight' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <BrandTable rows={brands} cirTarget={cirTarget} />
                  </div>
                  <FunnelChart
                    impression={k.impression}
                    visitor={k.visitor}
                    click={k.click}
                    addToCart={k.addToCart}
                    order={k.orders}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <KpiCard label="TOTAL VISITOR" value={formatNumber(k.visitor, { compact: true })} icon={<Users className="h-4 w-4" />} accent="sky" />
                  <KpiCard label="TOTAL CLICK" value={formatNumber(k.click, { compact: true })} icon={<MousePointerClick className="h-4 w-4" />} accent="violet" />
                  <KpiCard label="ADD TO CART" value={formatNumber(k.addToCart, { compact: true })} icon={<ShoppingBag className="h-4 w-4" />} accent="amber" />
                  <KpiCard label="CVR (FROM VISITOR)" value={formatPercent(k.cvrFromVisitor)} icon={<Percent className="h-4 w-4" />} accent="emerald" />
                </div>
              </>
            )}

            {tab === 'product' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ProductTable rows={products} variant="top" />
                  <ProductTable rows={products} variant="bottom" />
                </div>

                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-white">Ringkasan Produk</h3>
                  <p className="text-xs text-muted">
                    Total {products.length} produk · Avg quantity per order:{' '}
                    {safeDivide(k.quantity, k.orders).toFixed(1)}
                  </p>
                </div>
              </>
            )}

            {tab === 'trend' && (
              <>
                <TrendChart data={trendData} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChannelDonut data={channelDonutData} />
                  <FunnelChart
                    impression={k.impression}
                    visitor={k.visitor}
                    click={k.click}
                    addToCart={k.addToCart}
                    order={k.orders}
                  />
                </div>
              </>
            )}

            {otherOmset > 0 && tab === 'performance' && (
              <p className="text-xs text-muted text-center">
                Catatan: ada {formatRupiah(otherOmset, { compact: true })} omset dari channel lain.
              </p>
            )}
          </>
        )}
      </div>

      <UploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onLoaded={handleLoaded}
        onLoadSample={handleSample}
      />
      <HistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={state.datasets.map((d) => d.meta)}
        activeId={state.activeDatasetId}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
      />
    </div>
  )
}

function TopBar({ datasetName, rowCount }: { datasetName?: string; rowCount?: number }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-accent-gradient border border-accent/40 grid place-items-center">
          <BarChart3 className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white leading-none">
            Shopee Analytics Dashboard
          </h1>
          <p className="text-xs text-muted mt-1">
            {datasetName ? `${datasetName} · ${rowCount ?? 0} baris` : 'Brand performance & insight'}
          </p>
        </div>
      </div>
      <span className="hidden sm:inline-flex pill bg-bg-elev border border-border text-muted">
        v1.0 · Local
      </span>
    </header>
  )
}

