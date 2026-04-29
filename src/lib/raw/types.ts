// Types for raw Shopee Seller Center exports.

export type AdType = 'GMV Max' | 'Iklan Produk' | 'Manual' | 'Other'

export interface ProdukRow {
  kodeProduk: string
  produkName: string
  status: string
  // Parent-only metrics (variants have these as '-')
  isParent: boolean
  totalPenjualanDibuat: number       // Total Penjualan (Pesanan Dibuat) IDR
  penjualanSiapDikirim: number       // Penjualan (Pesanan Siap Dikirim) IDR
  jumlahProdukDilihat: number
  produkDiklik: number
  ctr: number                         // Persentase Klik (decimal e.g. 0.0442)
  cvrSiapDikirim: number              // Tingkat Konversi (Pesanan Siap Dikirim) decimal
  cvrDibuat: number
  pesananDibuat: number
  pesananSiapDikirim: number
  totalPembeli: number
  // Variant-level fallbacks (variant rows)
  kodeVariasi?: string
  namaVariasi?: string
}

export interface AdsRow {
  namaIklan: string
  status: string
  jenisIklan: AdType
  kodeProduk: string
  dilihat: number
  klik: number
  ctr: number                         // Persentase Klik decimal
  konversi: number
  konversiLangsung: number
  cvr: number                         // Tingkat konversi decimal
  produkTerjual: number
  omzet: number                       // Omzet Penjualan IDR
  biaya: number                       // Biaya IDR (ad spend)
  roas: number                        // Efektifitas Iklan
  acos: number                        // ACOS decimal
}

export interface StockVariant {
  varId: string
  varName: string
  sku: string
  price: number
  stockPerCabang: Record<string, number>
  totalStock: number
}

export interface StockProduct {
  kodeProduk: string
  namaProduk: string
  variants: StockVariant[]
  totalStock: number
  variantCount: number
  variantsWithStock: number
  availabilityPct: number             // 0-100
}

export interface RawDataset {
  id: string
  name: string
  brand?: string
  uploadedAt: string                  // ISO
  period?: { start?: string; end?: string }
  produk?: ProdukRow[]
  ads?: AdsRow[]
  stock?: StockProduct[]
  cabangNames?: string[]
}

export type FileKind = 'produk' | 'ads' | 'stock' | 'unknown'

export interface ParsedFile {
  kind: FileKind
  fileName: string
  warnings?: string[]
  // exactly one of these
  produk?: ProdukRow[]
  ads?: AdsRow[]
  stock?: StockProduct[]
  meta?: {
    cabangNames?: string[]
    period?: { start?: string; end?: string }
    storeName?: string
  }
}

export interface SummaryKpi {
  omzet: number                       // Penjualan Pesanan Siap Dikirim
  pesanan: number                     // Pesanan Siap Dikirim
  aov: number                         // omzet / pesanan
  ctrToko: number                     // % (sum click / sum dilihat) * 100
  cvrToko: number                     // % (sum order / sum click) * 100
  adSpend: number
  roas: number                        // omzet from ads / spend (blended)
  acos: number                        // spend / omzet from ads * 100
  totalSku: number
  outOfStockSku: number
}

export interface AdTypeAgg {
  type: AdType
  spend: number
  omzet: number
  klik: number
  konversi: number
  roas: number
  acos: number
}

export interface SkuRow {
  kodeProduk: string
  produkName: string
  omzet: number
  pesanan: number
  ctr: number                         // %
  cvr: number                         // %
  adSpend: number
  adOmzet: number
  acos: number                        // %
  totalStock: number
  variantCount: number
  variantsWithStock: number
  availabilityPct: number             // 0-100
  ranAds: boolean
}

export interface ActionItems {
  worstAcos: SkuRow[]                 // best-spender with worst ACOS
  bestSellerLowStock: SkuRow[]        // best-sellers with low stock or low variant availability
  potentialAds: SkuRow[]              // good organic CTR but no/low ad spend
}
