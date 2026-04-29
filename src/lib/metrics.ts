import type { Channel, Row } from './types'
import { safeDivide } from './utils'

export interface Aggregate {
  omset: number
  adSpend: number
  refund: number
  orders: number
  quantity: number
  visitor: number
  impression: number
  click: number
  addToCart: number
  rows: number
}

export interface Kpis extends Aggregate {
  netOmset: number
  aov: number
  ctr: number // %
  cvr: number // % (orders / clicks); fallback to orders/visitor
  cvrFromVisitor: number // %
  atcRate: number // %
  roas: number
  cir: number // % (Cost-to-Income Ratio = adSpend / omset)
  acos: number // alias for cir
  refundRate: number // %
}

const ZERO_AGG: Aggregate = {
  omset: 0,
  adSpend: 0,
  refund: 0,
  orders: 0,
  quantity: 0,
  visitor: 0,
  impression: 0,
  click: 0,
  addToCart: 0,
  rows: 0,
}

export function aggregate(rows: Row[]): Aggregate {
  const a: Aggregate = { ...ZERO_AGG }
  for (const r of rows) {
    a.omset += r.omset
    a.adSpend += r.adSpend
    a.refund += r.refund
    a.orders += r.order
    a.quantity += r.quantity
    a.visitor += r.visitor
    a.impression += r.impression
    a.click += r.click
    a.addToCart += r.addToCart
    a.rows += 1
  }
  return a
}

export function kpisFor(rows: Row[]): Kpis {
  const a = aggregate(rows)
  const cir = safeDivide(a.adSpend, a.omset) * 100
  return {
    ...a,
    netOmset: a.omset - a.refund,
    aov: safeDivide(a.omset, a.orders),
    ctr: safeDivide(a.click, a.impression) * 100,
    cvr: safeDivide(a.orders, a.click) * 100,
    cvrFromVisitor: safeDivide(a.orders, a.visitor) * 100,
    atcRate: safeDivide(a.addToCart, a.visitor) * 100,
    roas: safeDivide(a.omset, a.adSpend),
    cir,
    acos: cir,
    refundRate: safeDivide(a.refund, a.omset) * 100,
  }
}

export function groupBy<K extends string | number>(
  rows: Row[],
  fn: (r: Row) => K,
): Map<K, Row[]> {
  const m = new Map<K, Row[]>()
  for (const r of rows) {
    const k = fn(r)
    const list = m.get(k)
    if (list) list.push(r)
    else m.set(k, [r])
  }
  return m
}

export function byDate(rows: Row[]) {
  return [...groupBy(rows, (r) => r.date).entries()]
    .map(([date, rs]) => ({ date, ...aggregate(rs) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function byChannel(rows: Row[]) {
  return [...groupBy(rows, (r) => r.channel).entries()].map(([channel, rs]) => ({
    channel: channel as Channel,
    ...kpisFor(rs),
  }))
}

export function byBrand(rows: Row[]) {
  return [...groupBy(rows, (r) => r.brand).entries()].map(([brand, rs]) => ({
    brand,
    ...kpisFor(rs),
  }))
}

export function byProduct(rows: Row[]) {
  return [...groupBy(rows, (r) => `${r.brand}__${r.product}`).entries()].map(([key, rs]) => {
    const [brand, product] = key.split('__')
    return { brand, product, ...kpisFor(rs) }
  })
}

export function filterRows(
  rows: Row[],
  filter: { month?: number; year?: number; channels?: Channel[]; brands?: string[] },
): Row[] {
  return rows.filter((r) => {
    const d = new Date(r.date)
    if (filter.month != null && d.getMonth() + 1 !== filter.month) return false
    if (filter.year != null && d.getFullYear() !== filter.year) return false
    if (filter.channels?.length && !filter.channels.includes(r.channel)) return false
    if (filter.brands?.length && !filter.brands.includes(r.brand)) return false
    return true
  })
}

export function computePeriodOptions(rows: Row[]) {
  const set = new Set<string>()
  rows.forEach((r) => {
    const d = new Date(r.date)
    set.add(`${d.getFullYear()}-${d.getMonth() + 1}`)
  })
  return [...set]
    .map((k) => {
      const [y, m] = k.split('-').map(Number)
      return { year: y, month: m }
    })
    .sort((a, b) => (a.year - b.year) || (a.month - b.month))
}
