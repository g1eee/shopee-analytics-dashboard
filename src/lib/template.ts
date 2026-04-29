import * as XLSX from 'xlsx'

export function downloadTemplate() {
  const headers = [
    'Date',
    'Channel',
    'Brand',
    'Product',
    'Category',
    'Visitor',
    'Impression',
    'Click',
    'Add to Cart',
    'Order',
    'Quantity',
    'Omset',
    'Ad Spend',
    'Refund',
  ]
  const today = new Date().toISOString().slice(0, 10)
  const example = [
    [today, 'Shopee', 'Aurora Beauty', 'Hydrating Serum 30ml', 'Skincare', 1240, 8400, 612, 138, 41, 52, 6500000, 850000, 120000],
    [today, 'TikTok', 'Aurora Beauty', 'Hydrating Serum 30ml', 'Skincare', 320, 4200, 188, 39, 11, 14, 1750000, 240000, 0],
    [today, 'Shopee', 'Nordwave', 'Cotton Tee Oversize', 'Fashion', 980, 6500, 410, 95, 28, 32, 4200000, 510000, 80000],
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Performance')
  XLSX.writeFile(wb, 'shopee-analytics-template.xlsx')
}
