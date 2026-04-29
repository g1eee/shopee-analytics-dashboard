import * as XLSX from 'xlsx'
import type {
  AdType,
  AdsRow,
  FileKind,
  ParsedFile,
  ProdukRow,
  StockProduct,
  StockVariant,
} from './types'
import { parseIdNum, parseIdPct } from './idnumber'

// ---------- File-type detection ----------

export async function detectFileKind(file: File): Promise<FileKind> {
  if (/\.csv$/i.test(file.name)) {
    const head = await readFirstChunk(file, 4096)
    if (/Semua Laporan Iklan|Iklan CPC/i.test(head)) return 'ads'
    return 'unknown'
  }
  // Read as workbook (xlsx)
  const buf = await file.arrayBuffer()
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buf, { type: 'array' })
  } catch {
    return 'unknown'
  }
  const names = wb.SheetNames
  if (
    names.some((n) => /Performa Terbaik/i.test(n)) ||
    names.some((n) => /Tingkatkan dengan Iklan|Cek Performa Iklan|Iklankan/i.test(n))
  ) {
    return 'produk'
  }
  if (names.some((n) => /Sheet1/i.test(n))) {
    const ws = wb.Sheets[names[0]]
    const arr = XLSX.utils.sheet_to_json<unknown[]>(ws, { defval: null, header: 1, blankrows: false })
    const flat = arr.slice(0, 4).flat().map(String).join(' ')
    if (/sales_info|et_title_product_id|Stok:/i.test(flat)) return 'stock'
  }
  return 'unknown'
}

async function readFirstChunk(file: File, max = 4096): Promise<string> {
  const slice = file.slice(0, Math.min(max, file.size))
  return await slice.text()
}

// ---------- ADS CSV parser ----------

export async function parseAdsCsv(file: File): Promise<ParsedFile> {
  const text = await file.text()
  const lines = text.split(/\r?\n/)
  let headerIdx = lines.findIndex((l) => /^Urutan,/.test(l))
  if (headerIdx < 0) headerIdx = lines.findIndex((l) => /Nama Iklan/i.test(l))
  if (headerIdx < 0) {
    return { kind: 'ads', fileName: file.name, ads: [], warnings: ['Header iklan tidak terdeteksi'] }
  }
  // metadata before header
  let storeName: string | undefined
  let periodStart: string | undefined
  let periodEnd: string | undefined
  for (let i = 0; i < headerIdx; i++) {
    const line = lines[i]
    if (/^Nama Toko,/i.test(line)) storeName = line.split(',').slice(1).join(',').trim()
    if (/^Periode,/i.test(line)) {
      const v = line.split(',').slice(1).join(',').trim()
      const m = v.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
      if (m) {
        periodStart = toIsoDate(m[1])
        periodEnd = toIsoDate(m[2])
      }
    }
  }

  const headers = parseCsvLine(lines[headerIdx])
  const colIdx = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => normalize(h) === normalize(n))
      if (i >= 0) return i
    }
    for (const n of names) {
      const i = headers.findIndex((h) => normalize(h).includes(normalize(n)))
      if (i >= 0) return i
    }
    return -1
  }
  const COL = {
    namaIklan: colIdx('Nama Iklan'),
    status: colIdx('Status'),
    jenisIklan: colIdx('Jenis Iklan'),
    kodeProduk: colIdx('Kode Produk'),
    dilihat: colIdx('Dilihat'),
    klik: colIdx('Jumlah Klik', 'Klik'),
    ctr: colIdx('Persentase Klik'),
    konversi: colIdx('Konversi'),
    konversiLangsung: colIdx('Konversi Langsung'),
    cvr: colIdx('Tingkat konversi', 'Tingkat Konversi'),
    produkTerjual: colIdx('Produk Terjual'),
    omzet: colIdx('Omzet Penjualan'),
    biaya: colIdx('Biaya'),
    roas: colIdx('Efektifitas Iklan', 'Efektivitas Iklan'),
    acos: colIdx('Persentase Biaya Iklan terhadap Penjualan dari Iklan (ACOS)', 'ACOS'),
  }

  const ads: AdsRow[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const cells = parseCsvLine(line)
    if (cells.length < 5) continue
    const namaIklan = String(cells[COL.namaIklan] ?? '').trim()
    if (!namaIklan) continue
    const jenisIklan = mapAdType(String(cells[COL.jenisIklan] ?? ''), namaIklan)
    ads.push({
      namaIklan,
      status: String(cells[COL.status] ?? '').trim(),
      jenisIklan,
      kodeProduk: String(cells[COL.kodeProduk] ?? '').trim(),
      dilihat: parseIdNum(cells[COL.dilihat]),
      klik: parseIdNum(cells[COL.klik]),
      ctr: parseIdPct(cells[COL.ctr]),
      konversi: parseIdNum(cells[COL.konversi]),
      konversiLangsung: parseIdNum(cells[COL.konversiLangsung]),
      cvr: parseIdPct(cells[COL.cvr]),
      produkTerjual: parseIdNum(cells[COL.produkTerjual]),
      omzet: parseIdNum(cells[COL.omzet]),
      biaya: parseIdNum(cells[COL.biaya]),
      roas: parseIdNum(cells[COL.roas]),
      acos: parseIdPct(cells[COL.acos]),
    })
  }
  return {
    kind: 'ads',
    fileName: file.name,
    ads,
    meta: { storeName, period: { start: periodStart, end: periodEnd } },
  }
}

function mapAdType(raw: string, namaIklan: string): AdType {
  const r = (raw || '').toLowerCase()
  const n = namaIklan.toLowerCase()
  if (r.includes('gmv max') || n.includes('gmv max')) return 'GMV Max'
  if (r.includes('manual')) return 'Manual'
  if (r.includes('iklan produk')) return 'Iklan Produk'
  if (r.includes('produk')) return 'Iklan Produk'
  return 'Other'
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQ = false
        }
      } else cur += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') {
        out.push(cur)
        cur = ''
      } else cur += c
    }
  }
  out.push(cur)
  return out
}

function normalize(s: string): string {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function toIsoDate(d: string): string {
  // dd/mm/yyyy -> yyyy-mm-dd
  const [dd, mm, yyyy] = d.split('/')
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// ---------- PRODUK xlsx parser ----------

export async function parseProdukXlsx(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  // Prefer "Produk dengan Performa Terbaik" sheet
  const sheetName =
    wb.SheetNames.find((n) => /Performa Terbaik/i.test(n)) ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const arr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, blankrows: false })
  if (arr.length < 2) {
    return { kind: 'produk', fileName: file.name, produk: [], warnings: ['Sheet kosong'] }
  }
  const headers = (arr[0] as unknown[]).map(String)
  const colIdx = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => normalize(h) === normalize(n))
      if (i >= 0) return i
    }
    for (const n of names) {
      const i = headers.findIndex((h) => normalize(h).includes(normalize(n)))
      if (i >= 0) return i
    }
    return -1
  }
  const C = {
    kodeProduk: colIdx('Kode Produk'),
    produk: colIdx('Produk'),
    status: colIdx('Status Produk Saat Ini'),
    kodeVariasi: colIdx('Kode Variasi'),
    namaVariasi: colIdx('Nama Variasi'),
    totalPenjualanDibuat: colIdx('Total Penjualan (Pesanan Dibuat) (IDR)', 'Total Penjualan (Pesanan Dibuat)'),
    penjualanSiapDikirim: colIdx('Penjualan (Pesanan Siap Dikirim) (IDR)', 'Penjualan (Pesanan Siap Dikirim)'),
    jumlahProdukDilihat: colIdx('Jumlah Produk Dilihat'),
    produkDiklik: colIdx('Produk Diklik'),
    ctr: colIdx('Persentase Klik'),
    cvrSiapDikirim: colIdx('Tingkat Konversi Pesanan (Pesanan Siap Dikirim)', 'Tingkat Konversi Pesanan Siap Dikirim'),
    cvrDibuat: colIdx('Tingkat Konversi Pesanan (Pesanan Dibuat)', 'Tingkat Konversi Pesanan Dibuat'),
    pesananDibuat: colIdx('Pesanan Dibuat'),
    pesananSiapDikirim: colIdx('Pesanan Siap Dikirim'),
    totalPembeli: colIdx('Total Pembeli (Pesanan Siap Dikirim)', 'Total Pembeli'),
  }

  const produk: ProdukRow[] = []
  for (let i = 1; i < arr.length; i++) {
    const r = arr[i] as unknown[]
    if (!r) continue
    const kode = String(r[C.kodeProduk] ?? '').trim()
    if (!kode) continue
    const variasi = String(r[C.kodeVariasi] ?? '').trim()
    const isParent = variasi === '-' || variasi === '' || variasi === '0'
    produk.push({
      kodeProduk: kode,
      produkName: String(r[C.produk] ?? '').trim(),
      status: String(r[C.status] ?? '').trim(),
      isParent,
      kodeVariasi: variasi,
      namaVariasi: String(r[C.namaVariasi] ?? '').trim(),
      totalPenjualanDibuat: parseIdNum(r[C.totalPenjualanDibuat]),
      penjualanSiapDikirim: parseIdNum(r[C.penjualanSiapDikirim]),
      jumlahProdukDilihat: parseIdNum(r[C.jumlahProdukDilihat]),
      produkDiklik: parseIdNum(r[C.produkDiklik]),
      ctr: parseIdPct(r[C.ctr]),
      cvrSiapDikirim: parseIdPct(r[C.cvrSiapDikirim]),
      cvrDibuat: parseIdPct(r[C.cvrDibuat]),
      pesananDibuat: parseIdNum(r[C.pesananDibuat]),
      pesananSiapDikirim: parseIdNum(r[C.pesananSiapDikirim]),
      totalPembeli: parseIdNum(r[C.totalPembeli]),
    })
  }
  return { kind: 'produk', fileName: file.name, produk }
}

// ---------- STOCK xlsx parser ----------

export async function parseStockXlsx(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const arr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, blankrows: false })
  // Find the human header row (contains "Kode Produk" + "Stok:..." columns)
  let headerRow = -1
  for (let i = 0; i < Math.min(10, arr.length); i++) {
    const r = (arr[i] as unknown[]) ?? []
    if (r.includes('Kode Produk') && r.some((c) => typeof c === 'string' && /^Stok:/i.test(c as string))) {
      headerRow = i
      break
    }
  }
  if (headerRow < 0) {
    return { kind: 'stock', fileName: file.name, stock: [], warnings: ['Header stok tidak terdeteksi'] }
  }
  const headers = (arr[headerRow] as unknown[]).map((c) => (c == null ? '' : String(c)))
  const stokCols: { idx: number; name: string }[] = []
  headers.forEach((h, i) => {
    if (/^Stok:/i.test(h)) stokCols.push({ idx: i, name: h.replace(/^Stok:/i, '').trim() })
  })
  const findCol = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => normalize(h) === normalize(n))
      if (i >= 0) return i
    }
    return -1
  }
  const C = {
    kodeProduk: findCol('Kode Produk'),
    namaProduk: findCol('Nama Produk'),
    kodeVariasi: findCol('Kode Variasi'),
    namaVariasi: findCol('Nama Variasi'),
    sku: findCol('SKU'),
    harga: findCol('Harga'),
  }
  // Data starts after marker rows; find first row whose Kode Produk is numeric-looking
  let dataStart = headerRow + 1
  while (dataStart < arr.length) {
    const r = (arr[dataStart] as unknown[]) ?? []
    const kp = String(r[C.kodeProduk] ?? '').trim()
    if (kp && !/^(wajib|pilihan)$/i.test(kp)) break
    dataStart++
  }

  const byKode = new Map<string, StockProduct>()
  for (let i = dataStart; i < arr.length; i++) {
    const r = (arr[i] as unknown[]) ?? []
    const kp = String(r[C.kodeProduk] ?? '').trim()
    if (!kp) continue
    const stockPerCabang: Record<string, number> = {}
    let total = 0
    for (const sc of stokCols) {
      const v = parseIdNum(r[sc.idx])
      stockPerCabang[sc.name] = v
      total += v
    }
    const variant: StockVariant = {
      varId: String(r[C.kodeVariasi] ?? '').trim(),
      varName: String(r[C.namaVariasi] ?? '').trim(),
      sku: String(r[C.sku] ?? '').trim(),
      price: parseIdNum(r[C.harga]),
      stockPerCabang,
      totalStock: total,
    }
    if (!byKode.has(kp)) {
      byKode.set(kp, {
        kodeProduk: kp,
        namaProduk: String(r[C.namaProduk] ?? '').trim(),
        variants: [],
        totalStock: 0,
        variantCount: 0,
        variantsWithStock: 0,
        availabilityPct: 0,
      })
    }
    byKode.get(kp)!.variants.push(variant)
  }
  const stock: StockProduct[] = []
  for (const p of byKode.values()) {
    p.variantCount = p.variants.length
    p.variantsWithStock = p.variants.filter((v) => v.totalStock > 0).length
    p.totalStock = p.variants.reduce((s, v) => s + v.totalStock, 0)
    p.availabilityPct = p.variantCount === 0 ? 0 : (p.variantsWithStock / p.variantCount) * 100
    stock.push(p)
  }
  return {
    kind: 'stock',
    fileName: file.name,
    stock,
    meta: { cabangNames: stokCols.map((c) => c.name) },
  }
}

// ---------- Generic dispatcher ----------

export async function parseAnyFile(file: File): Promise<ParsedFile> {
  const kind = await detectFileKind(file)
  if (kind === 'ads') return parseAdsCsv(file)
  if (kind === 'produk') return parseProdukXlsx(file)
  if (kind === 'stock') return parseStockXlsx(file)
  return { kind: 'unknown', fileName: file.name, warnings: ['Tipe file tidak dikenali'] }
}
