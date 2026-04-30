import type { AdType, RawDataset } from './types'

// Generate a realistic sample raw dataset. Tries to mimic ATRIA-like furniture brand.

const SKU_NAMES = [
  'Atria Sofa Recliner Livana 2 Seater',
  'Atria Sofa Recliner Lulaby 1 Seat',
  'Atria Octan Meja Makan Set',
  'Atria Set Meja Belajar Alfred',
  'Atria Paket Meja Makan Lipat Freddy',
  'Atria Falisha Task Chair',
  'Atria Joshua Meja Komputer',
  'Atria Vaza Karpet Foamy',
  'Atria Diego Karpet Foamy Dark Blue',
  'Atria Fiona Karpet Mini Polyester',
  'Atria Jacob Karpet Mini Polyester',
  'Atria Halvi Coffee Table',
  'Atria Nordy Bookshelf 5 Tier',
  'Atria Calista Storage Cabinet',
  'Atria Pristine Bedside Table',
  'Atria Galaxy Wall Shelf',
  'Atria Murano Mirror Round',
  'Atria Vienna Armchair',
  'Atria Lumiere Floor Lamp',
  'Atria Rosa Dining Chair',
]

const CABANG = [
  'Atria Gading S', 'Atria Pasarbaru', 'Atria Cibinong', 'Atria Kalimalan',
  'Atria Tasik', 'Atria Makassar', 'Atria Cibubur', 'Atria Cikarang',
  'Atria Kendari', 'Atria Bintaro', 'Atria Pesona SQ', 'Atria Purwokrto',
  'Atria Garut', 'Atria Bandung', 'Atria Lampung', 'Atria Sawangan',
]

const AD_TYPES: AdType[] = ['GMV Max', 'Iklan Produk', 'Manual']

let seed = 1
function rand() {
  seed = (seed * 9301 + 49297) % 233280
  return seed / 233280
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}

export function generateRawSample(): RawDataset {
  seed = 42 // deterministic
  const today = new Date()
  const periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const periodEnd = new Date(today.getFullYear(), today.getMonth(), 0)

  const ds: RawDataset = {
    id: 'sample-' + Date.now(),
    name: 'Sample (ATRIA-like, demo data)',
    brand: 'ATRIA',
    uploadedAt: new Date().toISOString(),
    period: { start: iso(periodStart), end: iso(periodEnd) },
    cabangNames: CABANG,
    produk: [],
    ads: [],
    stock: [],
  }

  for (let i = 0; i < SKU_NAMES.length; i++) {
    const kode = String(10000000000 + i * 137 + randInt(1, 999))
    const produkName = SKU_NAMES[i] + (i % 3 === 0 ? ' Black/Tan' : i % 3 === 1 ? ' Premium' : '')
    const dilihat = randInt(15_000, 350_000) // Jumlah Produk Dilihat (impressions)
    const klik = Math.floor(dilihat * (0.02 + rand() * 0.04)) // Produk Diklik (broad clicks)
    const ctr = klik / dilihat
    // Page-level: Halaman ~ klik (each click \u2248 page view, with some refresh inflation)
    const halamanProdukDilihat = Math.floor(klik * (1.6 + rand() * 1.0))
    const klikPencarian = Math.floor(klik * (0.15 + rand() * 0.15))
    const pesanan = Math.floor(klik * (0.003 + rand() * 0.012))
    const cvr = klik > 0 ? pesanan / klik : 0
    const aov = randInt(120_000, 5_500_000)
    const omzet = pesanan * aov
    const pesananDibuat = Math.round(pesanan * (1.05 + rand() * 0.25))
    const omzetDibuat = Math.round(omzet * (1.05 + rand() * 0.3))

    // Pengunjung Produk (unique visitors) \u2248 28-40% of page views, matches Shopee dashboard
    const pengunjungKunjungan = Math.floor(halamanProdukDilihat * (0.28 + rand() * 0.12))
    const ditambahKeKeranjang = Math.floor(pengunjungKunjungan * (0.18 + rand() * 0.15))
    const pengunjungAtc = Math.floor(ditambahKeKeranjang * (0.7 + rand() * 0.2))
    const atcRate = pengunjungKunjungan > 0 ? pengunjungAtc / pengunjungKunjungan : 0
    ds.produk!.push({
      kodeProduk: kode,
      produkName,
      status: 'Normal',
      isParent: true,
      kodeVariasi: '-',
      namaVariasi: '-',
      totalPenjualanDibuat: omzetDibuat,
      penjualanSiapDikirim: omzet,
      jumlahProdukDilihat: dilihat,
      halamanProdukDilihat,
      produkDiklik: klik,
      klikPencarian,
      ctr,
      cvrSiapDikirim: cvr,
      cvrDibuat: cvr * (1.05 + rand() * 0.2),
      pesananDibuat,
      pesananSiapDikirim: pesanan,
      totalPembeli: Math.floor(pesanan * 0.9),
      pengunjungKunjungan,
      pengunjungAtc,
      ditambahKeKeranjang,
      atcRate,
    })

    // Stock - some products have low availability
    const numVariants: number = i % 4 === 0 ? 4 : i % 4 === 1 ? 2 : i % 4 === 2 ? 1 : 3
    const variants = []
    let withStock = 0
    for (let v = 0; v < numVariants; v++) {
      const stockPerCabang: Record<string, number> = {}
      // Hot SKUs (top 5) sometimes have variants out of stock
      const isHotLowStock = i < 5 && v % 2 === 0 && rand() < 0.5
      let totalForVariant = 0
      for (const c of CABANG) {
        const s = isHotLowStock && rand() < 0.7 ? 0 : randInt(0, 30)
        stockPerCabang[c] = s
        totalForVariant += s
      }
      if (totalForVariant > 0) withStock++
      variants.push({
        varId: `${kode}_v${v}`,
        varName: ['Black', 'Tan', 'Grey', 'White'][v % 4],
        sku: `SKU-${kode}-${v}`,
        price: aov,
        stockPerCabang,
        totalStock: totalForVariant,
      })
    }
    const totalStock = variants.reduce((s, v) => s + v.totalStock, 0)
    ds.stock!.push({
      kodeProduk: kode,
      namaProduk: produkName,
      variants,
      totalStock,
      variantCount: numVariants,
      variantsWithStock: withStock,
      availabilityPct: numVariants === 0 ? 0 : (withStock / numVariants) * 100,
    })

    // Ads - not all products have ads
    if (rand() < 0.75) {
      const adType = AD_TYPES[randInt(0, AD_TYPES.length - 1)]
      const acos = 0.02 + rand() * 0.18 // 2% - 20%
      const biaya = Math.round(omzet * acos * (0.6 + rand() * 0.6))
      const adOmzet = biaya > 0 ? Math.round(biaya / acos) : 0
      ds.ads!.push({
        namaIklan: produkName + ' [' + randInt(1, 9) + ']',
        status: rand() < 0.85 ? 'Berjalan' : 'Berakhir',
        jenisIklan: adType,
        kodeProduk: kode,
        dilihat: Math.round(dilihat * 0.6),
        klik: Math.round(klik * 0.6),
        ctr: ctr * 0.95,
        konversi: Math.round(pesanan * 0.6),
        konversiLangsung: Math.round(pesanan * 0.45),
        cvr: cvr * 0.95,
        produkTerjual: Math.round(pesanan * 0.6),
        omzet: adOmzet,
        biaya,
        roas: biaya > 0 ? adOmzet / biaya : 0,
        acos,
      })
    }
  }
  return ds
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}
