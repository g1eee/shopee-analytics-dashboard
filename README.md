# Shopee Analytics Dashboard

Dashboard analitik untuk performa toko Shopee / TikTok (multi-brand) berbasis upload file Excel. Tampilan dark + purple, mirip dashboard "Brand Performance" modern.

Tujuan: ambil keputusan lebih cepat berdasar data — sekali upload, langsung jadi dashboard rapi dengan metrik lengkap (Omset, CTR, CVR, ROAS, CIR/ACOS, AOV, dll).

## Fitur

- **Upload Excel / CSV** — drag & drop, kolom auto-detect (Date, Channel, Brand, Product, Visitor, Click, Order, Omset, Ad Spend, Refund, dll).
- **Sample Data** — pakai data dummy realistic untuk eksplorasi tanpa upload.
- **Sync History** — setiap upload tersimpan di `localStorage`, bisa switch & rollback.
- **Period Filter** — pilih bulan/tahun, otomatis bandingkan vs bulan sebelumnya (delta %).
- **4 Tabs**:
  - **Brand Performance** — KPI utama + chart trend, donut channel, bar omset per brand.
  - **Brand Insight** — table lengkap per brand (CTR, CVR, ROAS, CIR vs target) + funnel konversi.
  - **Product Performance** — top & slow-moving SKU.
  - **Trend Analysis** — fokus chart trend & funnel.
- **Metrik** yang dihitung otomatis:
  - Total Omset (Global / Shopee / TikTok / per brand / per produk)
  - **AOV** (Average Order Value)
  - **CTR** (Click-Through Rate)
  - **CVR** (Conversion Rate dari Click maupun Visitor)
  - **ROAS** (Return on Ad Spend)
  - **CIR / ACOS** (Cost-to-Income Ratio) + indikator on-target per brand
  - **Add-to-Cart Rate**
  - **Refund Rate** + Net Omset
- 100% client-side, ga butuh backend.

## Tech Stack

- React 19 + TypeScript + Vite
- TailwindCSS
- Recharts
- SheetJS (`xlsx`) untuk parse Excel di browser
- lucide-react untuk ikon
- localStorage untuk persist riwayat upload

## Cara Pakai (Lokal)

```bash
npm install
npm run dev
```

Buka http://localhost:5173

### Skrip lain

```bash
npm run build      # production build
npm run lint       # eslint
npm run preview    # preview build production
```

## Format File Excel

Tinggal upload export dari Shopee Seller Center / Meta Ads / spreadsheet manual. Header bisa Bahasa Indonesia atau Inggris — kolom akan dideteksi via alias. Kolom yang dikenali:

| Field | Alias yang dikenali |
|---|---|
| Date | date, tanggal, order date, periode |
| Channel | channel, platform, marketplace, kanal |
| Brand | brand, merek, merk, shop, toko |
| Product | product, produk, sku, nama produk |
| Category | category, kategori |
| Visitor | visitor, kunjungan, pengunjung, sessions |
| Impression | impression, tayangan |
| Click | click, klik |
| Add to Cart | add to cart, atc, tambah ke keranjang |
| Order | order, pesanan |
| Quantity | quantity, qty, jumlah, terjual |
| Omset | omset, omzet, revenue, sales, gmv |
| Ad Spend | ad spend, biaya iklan, iklan |
| Refund | refund, pengembalian, returns |

Kolom yang ga ada akan di-default ke 0. Klik **Download template Excel** di dialog upload untuk file contoh siap edit.

## Roadmap (ide lanjutan)

- Export laporan PDF satu-klik
- Compare antar 2 periode (e.g. April vs Maret)
- AI-generated insights per brand
- Integrasi langsung Google Sheets / Shopee Open Platform API
- Multi-user + login (Supabase)

## Lisensi

Internal use.
