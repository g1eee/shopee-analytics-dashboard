import * as XLSX from 'xlsx'
import type { Channel, Dataset, Row } from './types'

const HEADER_ALIASES: Record<keyof Row, string[]> = {
  date: ['date', 'tanggal', 'order date', 'periode', 'tanggal order'],
  channel: ['channel', 'platform', 'marketplace', 'kanal'],
  brand: ['brand', 'merek', 'merk', 'shop', 'toko'],
  product: ['product', 'produk', 'sku', 'product name', 'nama produk', 'item'],
  category: ['category', 'kategori'],
  visitor: ['visitor', 'visitors', 'kunjungan', 'pengunjung', 'sessions'],
  impression: ['impression', 'impressions', 'tayangan'],
  click: ['click', 'clicks', 'klik'],
  addToCart: ['add to cart', 'addtocart', 'atc', 'tambah ke keranjang', 'cart'],
  order: ['order', 'orders', 'pesanan', 'jumlah pesanan'],
  quantity: ['quantity', 'qty', 'jumlah', 'units', 'sold', 'terjual'],
  omset: ['omset', 'omzet', 'revenue', 'sales', 'penjualan', 'gmv', 'total sales'],
  adSpend: ['ad spend', 'adspend', 'spend', 'biaya iklan', 'iklan', 'cost'],
  refund: ['refund', 'refunds', 'pengembalian', 'returned', 'returns'],
}

function normalize(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
}

function findKey(headers: string[], aliases: string[]): string | undefined {
  const norm = headers.map(normalize)
  for (const a of aliases) {
    const idx = norm.indexOf(normalize(a))
    if (idx >= 0) return headers[idx]
  }
  return undefined
}

function parseDate(v: unknown): string {
  if (v == null || v === '') return new Date().toISOString().slice(0, 10)
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) {
      const m = String(d.m).padStart(2, '0')
      const day = String(d.d).padStart(2, '0')
      return `${d.y}-${m}-${day}`
    }
  }
  const d = new Date(String(v))
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function parseNum(v: unknown): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isFinite(n) ? n : 0
}

function detectChannel(v: unknown): Channel {
  const s = String(v ?? '').toLowerCase()
  if (s.includes('shopee')) return 'Shopee'
  if (s.includes('tiktok')) return 'TikTok'
  if (s.includes('tokopedia') || s.includes('tokped')) return 'Tokopedia'
  if (s.includes('lazada')) return 'Lazada'
  return s ? 'Other' : 'Shopee'
}

export interface ParseResult {
  rows: Row[]
  warnings: string[]
  detectedColumns: Partial<Record<keyof Row, string>>
}

export function parseSheet(rawRows: Record<string, unknown>[]): ParseResult {
  const warnings: string[] = []
  if (rawRows.length === 0) {
    return { rows: [], warnings: ['Sheet kosong'], detectedColumns: {} }
  }
  const headers = Object.keys(rawRows[0])
  const detected: Partial<Record<keyof Row, string>> = {}
  ;(Object.keys(HEADER_ALIASES) as (keyof Row)[]).forEach((key) => {
    const found = findKey(headers, HEADER_ALIASES[key])
    if (found) detected[key] = found
  })

  const required: (keyof Row)[] = ['date', 'omset']
  required.forEach((k) => {
    if (!detected[k]) warnings.push(`Kolom "${k}" tidak terdeteksi`)
  })

  const rows: Row[] = rawRows.map((r) => ({
    date: detected.date ? parseDate(r[detected.date]) : new Date().toISOString().slice(0, 10),
    channel: detected.channel ? detectChannel(r[detected.channel]) : 'Shopee',
    brand: String(detected.brand ? r[detected.brand] ?? '' : 'Unknown') || 'Unknown',
    product: String(detected.product ? r[detected.product] ?? '' : '') || '-',
    category: detected.category ? String(r[detected.category] ?? '') : undefined,
    visitor: parseNum(detected.visitor ? r[detected.visitor] : 0),
    impression: parseNum(detected.impression ? r[detected.impression] : 0),
    click: parseNum(detected.click ? r[detected.click] : 0),
    addToCart: parseNum(detected.addToCart ? r[detected.addToCart] : 0),
    order: parseNum(detected.order ? r[detected.order] : 0),
    quantity: parseNum(detected.quantity ? r[detected.quantity] : 0),
    omset: parseNum(detected.omset ? r[detected.omset] : 0),
    adSpend: parseNum(detected.adSpend ? r[detected.adSpend] : 0),
    refund: parseNum(detected.refund ? r[detected.refund] : 0),
  }))

  return { rows, warnings, detectedColumns: detected }
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: false })
  const allRows: Record<string, unknown>[] = []
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    allRows.push(...json)
  }
  return parseSheet(allRows)
}

export function buildDataset(file: File, parsed: ParseResult): Dataset {
  const dates = parsed.rows.map((r) => r.date).filter(Boolean).sort()
  const range = {
    start: dates[0] ?? new Date().toISOString().slice(0, 10),
    end: dates[dates.length - 1] ?? new Date().toISOString().slice(0, 10),
  }
  return {
    meta: {
      id: crypto.randomUUID(),
      name: file.name,
      uploadedAt: new Date().toISOString(),
      rowCount: parsed.rows.length,
      range,
      source: 'excel',
    },
    rows: parsed.rows,
  }
}
