import type {
  ActionItems,
  AdTypeAgg,
  AdsRow,
  ProdukRow,
  RawDataset,
  SkuRow,
  StockProduct,
  SummaryKpi,
  AdType,
} from './types'

export function summaryKpi(ds: RawDataset): SummaryKpi {
  const parents = (ds.produk ?? []).filter((p) => p.isParent)
  const omzet = sum(parents.map((p) => p.penjualanSiapDikirim))
  const pesanan = sum(parents.map((p) => p.pesananSiapDikirim))
  const dilihat = sum(parents.map((p) => p.jumlahProdukDilihat))
  const klik = sum(parents.map((p) => p.produkDiklik))

  const ads = ds.ads ?? []
  const adSpend = sum(ads.map((a) => a.biaya))
  const adOmzet = sum(ads.map((a) => a.omzet))

  const stock = ds.stock ?? []
  const totalSku = stock.length
  const outOfStockSku = stock.filter((s) => s.totalStock === 0).length

  return {
    omzet,
    pesanan,
    aov: pesanan > 0 ? omzet / pesanan : 0,
    ctrToko: dilihat > 0 ? (klik / dilihat) * 100 : 0,
    cvrToko: klik > 0 ? (pesanan / klik) * 100 : 0,
    adSpend,
    roas: adSpend > 0 ? adOmzet / adSpend : 0,
    acos: adOmzet > 0 ? (adSpend / adOmzet) * 100 : 0,
    totalSku,
    outOfStockSku,
  }
}

export function byAdType(ads: AdsRow[]): AdTypeAgg[] {
  const by = new Map<AdType, AdTypeAgg>()
  for (const a of ads) {
    const cur = by.get(a.jenisIklan) ?? {
      type: a.jenisIklan,
      spend: 0,
      omzet: 0,
      klik: 0,
      konversi: 0,
      roas: 0,
      acos: 0,
    }
    cur.spend += a.biaya
    cur.omzet += a.omzet
    cur.klik += a.klik
    cur.konversi += a.konversi
    by.set(a.jenisIklan, cur)
  }
  return [...by.values()]
    .map((v) => ({
      ...v,
      roas: v.spend > 0 ? v.omzet / v.spend : 0,
      acos: v.omzet > 0 ? (v.spend / v.omzet) * 100 : 0,
    }))
    .sort((a, b) => b.spend - a.spend)
}

export function joinSkus(ds: RawDataset): SkuRow[] {
  // Aggregate ads per kodeProduk
  const adsByKode = new Map<string, { spend: number; omzet: number; klik: number; count: number }>()
  for (const a of ds.ads ?? []) {
    if (!a.kodeProduk) continue
    const cur = adsByKode.get(a.kodeProduk) ?? { spend: 0, omzet: 0, klik: 0, count: 0 }
    cur.spend += a.biaya
    cur.omzet += a.omzet
    cur.klik += a.klik
    cur.count += 1
    adsByKode.set(a.kodeProduk, cur)
  }
  // Stock map
  const stockByKode = new Map<string, StockProduct>()
  for (const s of ds.stock ?? []) stockByKode.set(s.kodeProduk, s)

  // Union of kode produk from produk + ads + stock
  const all = new Set<string>()
  ;(ds.produk ?? []).filter((p) => p.isParent).forEach((p) => all.add(p.kodeProduk))
  ;(ds.ads ?? []).forEach((a) => a.kodeProduk && all.add(a.kodeProduk))
  ;(ds.stock ?? []).forEach((s) => all.add(s.kodeProduk))

  const produkByKode = new Map<string, ProdukRow>()
  for (const p of ds.produk ?? []) {
    if (p.isParent) produkByKode.set(p.kodeProduk, p)
  }

  const out: SkuRow[] = []
  for (const kode of all) {
    const p = produkByKode.get(kode)
    const a = adsByKode.get(kode)
    const s = stockByKode.get(kode)
    const omzet = p?.penjualanSiapDikirim ?? 0
    const pesanan = p?.pesananSiapDikirim ?? 0
    const ctr = (p?.ctr ?? 0) * 100
    const cvr = (p?.cvrSiapDikirim ?? 0) * 100
    const adSpend = a?.spend ?? 0
    const adOmzet = a?.omzet ?? 0
    out.push({
      kodeProduk: kode,
      produkName: p?.produkName || s?.namaProduk || kode,
      omzet,
      pesanan,
      ctr,
      cvr,
      adSpend,
      adOmzet,
      acos: adOmzet > 0 ? (adSpend / adOmzet) * 100 : adSpend > 0 ? Infinity : 0,
      totalStock: s?.totalStock ?? 0,
      variantCount: s?.variantCount ?? 0,
      variantsWithStock: s?.variantsWithStock ?? 0,
      availabilityPct: s?.availabilityPct ?? 100,
      ranAds: (a?.count ?? 0) > 0,
    })
  }
  return out
}

export function topByOmzet(skus: SkuRow[], n = 10): SkuRow[] {
  return [...skus].sort((a, b) => b.omzet - a.omzet).slice(0, n)
}

export function actionItems(ds: RawDataset, opts?: { topN?: number; bestSellerN?: number }): ActionItems {
  const topN = opts?.topN ?? 5
  const bestSellerN = opts?.bestSellerN ?? 5
  const skus = joinSkus(ds)

  // 1. Worst ACOS - among SKUs that ran ads with meaningful spend (>= Rp 100k)
  const worstAcos = [...skus]
    .filter((s) => s.adSpend >= 100_000 && isFinite(s.acos))
    .sort((a, b) => b.acos - a.acos)
    .slice(0, topN)

  // 2. Best-seller stock alerts: top N best sellers by omzet, flag stock <= 10 OR availability < 100%
  const bestSellers = [...skus].sort((a, b) => b.omzet - a.omzet).slice(0, Math.max(bestSellerN * 4, 20))
  const bestSellerLowStock = bestSellers
    .filter((s) => s.variantCount > 0 && (s.totalStock <= 50 || s.availabilityPct < 100))
    .slice(0, topN)

  // 3. Potential ads: organic CTR >= 2%, omzet >= Rp 1jt, but ranAds = false OR adSpend < Rp 100k
  const potentialAds = [...skus]
    .filter((s) => s.ctr >= 2 && s.omzet >= 1_000_000 && (!s.ranAds || s.adSpend < 100_000))
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, topN)

  return { worstAcos, bestSellerLowStock, potentialAds }
}

function sum(arr: number[]): number {
  let s = 0
  for (const n of arr) if (isFinite(n)) s += n
  return s
}
