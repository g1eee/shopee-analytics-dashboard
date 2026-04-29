export type Channel = 'Shopee' | 'TikTok' | 'Tokopedia' | 'Lazada' | 'Other'

export interface Row {
  date: string // ISO yyyy-mm-dd
  channel: Channel
  brand: string
  product: string
  category?: string
  visitor: number
  impression: number
  click: number
  addToCart: number
  order: number
  quantity: number
  omset: number
  adSpend: number
  refund: number
}

export interface DatasetMeta {
  id: string
  name: string
  uploadedAt: string // ISO datetime
  rowCount: number
  range: { start: string; end: string }
  source?: string
}

export interface Dataset {
  meta: DatasetMeta
  rows: Row[]
}

export interface BrandTarget {
  brand: string
  cirTarget: number // percent, e.g. 14.1
}

export interface AppState {
  datasets: Dataset[]
  activeDatasetId: string | null
  targets: BrandTarget[]
}
