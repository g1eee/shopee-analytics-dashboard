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
  const atc = sum(parents.map((p) => p.ditambahKeKeranjang))
  const pengunjung = sum(parents.map((p) => p.pengunjungKunjungan))

  const ads = ds.ads ?? []
  const adSpend = sum(ads.map((a) => a.biaya))
  const adOmzet = sum(ads.map((a) => a.omzet))
  const adKlik = sum(ads.map((a) => a.klik))
  const adKonversi = sum(ads.map((a) => a.konversi))

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
    totalDilihat: dilihat,
    totalKlik: klik,
    totalAtc: atc,
    atcRateToko: pengunjung > 0 ? (atc / pengunjung) * 100 : 0,
    totalPengunjung: pengunjung,
    cpc: adKlik > 0 ? adSpend / adKlik : 0,
    adKlik,
    adKonversi,
    adOmzet,
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
  const stockByKode = new Map<string, StockProduct>()
  for (const s of ds.stock ?? []) stockByKode.set(s.kodeProduk, s)

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
    const dilihat = p?.jumlahProdukDilihat ?? 0
    const klik = p?.produkDiklik ?? 0
    const atc = p?.ditambahKeKeranjang ?? 0
    const ctr = (p?.ctr ?? 0) * 100
    const cvr = (p?.cvrSiapDikirim ?? 0) * 100
    const atcRate = (p?.atcRate ?? 0) * 100
    const adSpend = a?.spend ?? 0
    const adOmzet = a?.omzet ?? 0
    out.push({
      kodeProduk: kode,
      produkName: p?.produkName || s?.namaProduk || kode,
      omzet,
      pesanan,
      ctr,
      cvr,
      atcRate,
      dilihat,
      klik,
      atc,
      adSpend,
      adOmzet,
      acos: adOmzet > 0 ? (adSpend / adOmzet) * 100 : adSpend > 0 ? Infinity : 0,
      roas: adSpend > 0 ? adOmzet / adSpend : 0,
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

export function topByCtr(skus: SkuRow[], minViews = 100, n = 10): SkuRow[] {
  return [...skus]
    .filter((s) => s.dilihat >= minViews)
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, n)
}

export function topByAtcRate(skus: SkuRow[], minVisits = 100, n = 10): SkuRow[] {
  return [...skus]
    .filter((s) => s.dilihat >= minVisits && s.atcRate > 0)
    .sort((a, b) => b.atcRate - a.atcRate)
    .slice(0, n)
}

export function actionItems(ds: RawDataset, opts?: { topN?: number; bestSellerN?: number }): ActionItems {
  const topN = opts?.topN ?? 5
  const bestSellerN = opts?.bestSellerN ?? 5
  const skus = joinSkus(ds)

  const worstAcos = [...skus]
    .filter((s) => s.adSpend >= 100_000 && isFinite(s.acos))
    .sort((a, b) => b.acos - a.acos)
    .slice(0, topN)

  const bestSellers = [...skus].sort((a, b) => b.omzet - a.omzet).slice(0, Math.max(bestSellerN * 4, 20))
  const bestSellerLowStock = bestSellers
    .filter((s) => s.variantCount > 0 && (s.totalStock <= 50 || s.availabilityPct < 100))
    .slice(0, topN)

  const potentialAds = [...skus]
    .filter((s) => s.ctr >= 2 && s.omzet >= 1_000_000 && (!s.ranAds || s.adSpend < 100_000))
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, topN)

  return { worstAcos, bestSellerLowStock, potentialAds }
}

// ---------- Recommendations ("Apa yang harus dilakuin") ----------

export interface RecommendationItem {
  name: string
  metric?: string
  sub?: string
}

export interface Recommendation {
  level: 'high' | 'medium' | 'low'
  title: string
  detail: string
  items?: RecommendationItem[]
}

export function globalRecommendations(ds: RawDataset): Recommendation[] {
  const recs: Recommendation[] = []
  const k = summaryKpi(ds)
  const skus = joinSkus(ds)

  if (k.acos > 0 && k.acos > 20) {
    recs.push({
      level: 'high',
      title: 'ACOS toko di atas 20%',
      detail: `Blended ACOS ${k.acos.toFixed(1)}% — review iklan dengan ACOS terburuk dan pertimbangkan turunin bid atau pause.`,
    })
  } else if (k.acos > 0 && k.acos < 5) {
    recs.push({
      level: 'low',
      title: 'ACOS sangat efisien',
      detail: `Blended ACOS ${k.acos.toFixed(1)}% — masih ada ruang scale up budget iklan.`,
    })
  }

  const bestSellers = [...skus].sort((a, b) => b.omzet - a.omzet).slice(0, 10)
  const bsLowStock = bestSellers.filter((s) => s.variantCount > 0 && (s.totalStock <= 50 || s.availabilityPct < 100))
  if (bsLowStock.length > 0) {
    recs.push({
      level: 'high',
      title: `${bsLowStock.length} best-seller butuh refill stok`,
      detail: `Top SKU dengan stok kritis atau varian kosong: ${bsLowStock.slice(0, 3).map((s) => trim(s.produkName)).join('; ')}`,
      items: bsLowStock.map((s) => ({
        name: s.produkName,
        metric: `Stok ${s.totalStock} · ${s.availabilityPct.toFixed(0)}% varian tersedia`,
        sub: `Omzet ${formatIDR(s.omzet)} · ${s.variantCount} varian`,
      })),
    })
  }

  if (k.outOfStockSku > 0) {
    recs.push({
      level: 'medium',
      title: `${k.outOfStockSku} produk stok kosong total`,
      detail: 'Pertimbangkan delisting sementara atau prioritaskan restock biar nggak rusak ranking.',
    })
  }

  if (k.adSpend > 0 && k.roas < 1) {
    recs.push({
      level: 'high',
      title: 'Blended ROAS di bawah 1x',
      detail: 'Kamu rugi: spend lebih besar dari omzet iklan. Pause iklan ACOS tinggi & evaluasi targeting.',
    })
  }

  return recs.sort((a, b) => priority(a.level) - priority(b.level))
}

export function produkRecommendations(ds: RawDataset): Recommendation[] {
  const recs: Recommendation[] = []
  const k = summaryKpi(ds)
  const skus = joinSkus(ds)

  // Low CTR recommendation
  if (k.ctrToko > 0 && k.ctrToko < 1) {
    recs.push({
      level: 'high',
      title: 'CTR toko rendah (<1%)',
      detail: `CTR ${k.ctrToko.toFixed(2)}% — perbaiki thumbnail, judul, harga, atau review SKU dengan view tinggi tapi klik rendah.`,
    })
  }

  // Low CVR recommendation
  if (k.cvrToko > 0 && k.cvrToko < 1) {
    recs.push({
      level: 'high',
      title: 'CVR toko rendah (<1%)',
      detail: `CVR ${k.cvrToko.toFixed(2)}% — cek harga vs kompetitor, foto produk, deskripsi, dan promo voucher.`,
    })
  }

  // Low ATC rate
  if (k.atcRateToko > 0 && k.atcRateToko < 5) {
    recs.push({
      level: 'medium',
      title: 'Tingkat ATC rendah',
      detail: `Rate ${k.atcRateToko.toFixed(2)}% — review harga & visualisasi produk; tambahkan trust signal (rating, review, garansi).`,
    })
  }

  // High traffic but low conversion
  const lowConverters = skus
    .filter((s) => s.dilihat >= 5000 && s.cvr < 0.3 && s.cvr > 0)
    .sort((a, b) => b.dilihat - a.dilihat)
  if (lowConverters.length > 0) {
    recs.push({
      level: 'medium',
      title: `${lowConverters.length} produk traffic tinggi, CVR rendah`,
      detail: `Optimasi konten: ${lowConverters.slice(0, 3).map((s) => trim(s.produkName)).join('; ')}`,
      items: lowConverters.map((s) => ({
        name: s.produkName,
        metric: `CVR ${s.cvr.toFixed(2)}%`,
        sub: `Dilihat ${formatNum(s.dilihat)} · Pesanan ${formatNum(s.pesanan)}`,
      })),
    })
  }

  // Hidden gems: high CVR but low traffic
  const hidden = skus
    .filter((s) => s.cvr >= 1 && s.dilihat < 5000 && s.dilihat > 100)
    .sort((a, b) => b.cvr - a.cvr)
  if (hidden.length > 0) {
    recs.push({
      level: 'low',
      title: `${hidden.length} produk dengan CVR bagus tapi traffic kecil`,
      detail: `Boost via iklan/feature di toko: ${hidden.slice(0, 3).map((s) => trim(s.produkName)).join('; ')}`,
      items: hidden.map((s) => ({
        name: s.produkName,
        metric: `CVR ${s.cvr.toFixed(2)}%`,
        sub: `Dilihat ${formatNum(s.dilihat)} · Omzet ${formatIDR(s.omzet)}`,
      })),
    })
  }

  return recs.sort((a, b) => priority(a.level) - priority(b.level))
}

export function iklanRecommendations(ds: RawDataset): Recommendation[] {
  const recs: Recommendation[] = []
  const k = summaryKpi(ds)
  const adAgg = byAdType(ds.ads ?? [])
  const skus = joinSkus(ds)

  if (k.adSpend === 0) {
    recs.push({
      level: 'medium',
      title: 'Belum ada data iklan',
      detail: 'Upload export iklan CPC dari Shopee untuk lihat metrik ROAS, ACOS, dan rekomendasi.',
    })
    return recs
  }

  // Worst ad type
  if (adAgg.length > 1) {
    const worst = [...adAgg].filter((a) => a.spend >= 500_000).sort((a, b) => b.acos - a.acos)[0]
    if (worst && worst.acos > 25) {
      recs.push({
        level: 'high',
        title: `${worst.type} ACOS terburuk`,
        detail: `${worst.type}: ACOS ${worst.acos.toFixed(1)}%, ROAS ${worst.roas.toFixed(2)}x. Pertimbangkan turunin alokasi budget atau revisi targeting.`,
      })
    }
    const best = [...adAgg].filter((a) => a.spend >= 500_000).sort((a, b) => a.acos - b.acos)[0]
    if (best && best.roas > 5) {
      recs.push({
        level: 'low',
        title: `${best.type} paling efisien`,
        detail: `ROAS ${best.roas.toFixed(2)}x · ACOS ${best.acos.toFixed(1)}%. Cocok di-scale.`,
      })
    }
  }

  // Worst individual ads
  const worstAds = (ds.ads ?? [])
    .filter((a) => a.biaya >= 500_000 && a.acos > 0.30)
    .sort((a, b) => b.acos - a.acos)
  if (worstAds.length > 0) {
    recs.push({
      level: 'high',
      title: `${worstAds.length} iklan dengan ACOS > 30%`,
      detail: `Pertimbangkan pause: ${worstAds.slice(0, 3).map((a) => trim(a.namaIklan)).join('; ')}`,
      items: worstAds.map((a) => ({
        name: a.namaIklan,
        metric: `ACOS ${(a.acos * 100).toFixed(1)}%`,
        sub: `Spend ${formatIDR(a.biaya)} · Omzet ${formatIDR(a.omzet)} · ${a.jenisIklan}`,
      })),
    })
  }

  // Potential = CVR tinggi tapi traffic masih rendah, dan belum diiklankan.
  // Aktifin via iklan biar trafficnya naik — CVR-nya udah terbukti bagus.
  const noAds = skus
    .filter((s) => !s.ranAds && s.cvr >= 1 && s.dilihat >= 100 && s.dilihat < 5000)
    .sort((a, b) => b.cvr - a.cvr)
  if (noAds.length > 0) {
    recs.push({
      level: 'medium',
      title: `${noAds.length} produk potensial belum diiklankan`,
      detail: `CVR tinggi tapi traffic masih rendah — kandidat untuk di-boost via iklan: ${noAds
        .slice(0, 3)
        .map((s) => trim(s.produkName))
        .join('; ')}`,
      items: noAds.map((s) => ({
        name: s.produkName,
        metric: `CVR ${s.cvr.toFixed(2)}%`,
        sub: `Dilihat ${formatNum(s.dilihat)} · Omzet ${formatIDR(s.omzet)} · Stok ${formatNum(s.totalStock)}`,
      })),
    })
  }

  // CPC high
  if (k.cpc > 0 && k.cpc > 1500) {
    recs.push({
      level: 'medium',
      title: 'CPC relatif tinggi',
      detail: `Avg CPC Rp ${Math.round(k.cpc).toLocaleString('id-ID')} — cek bid strategy, mungkin terlalu agresif.`,
    })
  }

  return recs.sort((a, b) => priority(a.level) - priority(b.level))
}

function priority(l: Recommendation['level']): number {
  return l === 'high' ? 0 : l === 'medium' ? 1 : 2
}

function trim(s: string, max = 40): string {
  if (!s) return ''
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…'
}

function formatIDR(v: number): string {
  if (!isFinite(v) || v === 0) return 'Rp 0'
  if (Math.abs(v) >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`
  if (Math.abs(v) >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`
  return `Rp ${Math.round(v)}`
}

function formatNum(v: number): string {
  if (!isFinite(v)) return '0'
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return Math.round(v).toString()
}

function sum(arr: number[]): number {
  let s = 0
  for (const n of arr) if (isFinite(n)) s += n
  return s
}
