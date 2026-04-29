import type { Channel, Dataset, Row } from './types'

const BRANDS = [
  'Aurora Beauty',
  'Nordwave',
  'Lumiere',
  'Kenzaki',
  'Velvora',
  'Pinely',
  'Mochiko',
  'Glowra',
  'Tropikana',
  'Hanami',
  'Drift Co',
  'Senka Living',
  'Kotori',
  'Petalux',
  'Nuvelle',
  'Sora Mart',
]

const CATEGORIES = ['Skincare', 'Fashion', 'Home', 'Beauty', 'Snack', 'Health', 'Gadget']
const PRODUCTS = [
  'Hydrating Serum 30ml',
  'Glow Toner 100ml',
  'Daily Cleanser',
  'Cotton Tee Oversize',
  'Linen Trouser',
  'Matte Lipstick',
  'Aroma Candle 200g',
  'Crispy Nori Snack',
  'Vitamin C Drops',
  'Wireless Earbuds',
  'Travel Mug 500ml',
]

const CHANNELS: Channel[] = ['Shopee', 'TikTok']

function rand(seed: { v: number }) {
  seed.v = (seed.v * 1664525 + 1013904223) >>> 0
  return seed.v / 0xffffffff
}

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)]
}

export function generateSampleRows(year: number, month: number): Row[] {
  const seed = { v: year * 100 + month }
  const r = () => rand(seed)
  const days = new Date(year, month, 0).getDate()
  const rows: Row[] = []
  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    for (const brand of BRANDS) {
      for (const channel of CHANNELS) {
        const base = 0.6 + r() * 1.6 // brand performance multiplier
        const channelMul = channel === 'Shopee' ? 1 : 0.18 + r() * 0.25
        const visitor = Math.round(((300 + r() * 1400) * base) * channelMul)
        const impression = Math.round(visitor * (3 + r() * 6))
        const click = Math.round(impression * (0.02 + r() * 0.06))
        const atc = Math.round(click * (0.18 + r() * 0.25))
        const order = Math.round(atc * (0.22 + r() * 0.28))
        const qty = Math.round(order * (1 + r() * 1.4))
        const avgPrice = 60_000 + r() * 380_000
        const omset = Math.round(qty * avgPrice)
        const adSpend = Math.round(omset * (0.06 + r() * 0.22))
        const refund = Math.round(omset * (0.0 + r() * 0.04))
        rows.push({
          date: dateStr,
          channel,
          brand,
          product: pick(PRODUCTS, r),
          category: pick(CATEGORIES, r),
          visitor,
          impression,
          click,
          addToCart: atc,
          order,
          quantity: qty,
          omset,
          adSpend,
          refund,
        })
      }
    }
  }
  return rows
}

export function generateSampleDataset(year = 2026, month = 4): Dataset {
  const rows = generateSampleRows(year, month)
  return {
    meta: {
      id: 'sample-' + year + '-' + month,
      name: `Sample Data ${month}/${year}.xlsx`,
      uploadedAt: new Date().toISOString(),
      rowCount: rows.length,
      range: { start: rows[0].date, end: rows[rows.length - 1].date },
      source: 'sample',
    },
    rows,
  }
}
