# Deployment Guide: Cloudflare Workers dengan D1

Panduan deployment untuk aplikasi NearMe Laundry Mini ERP yang berjalan di Cloudflare Workers dengan D1 database.

## Stack Teknologi

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **Static Assets**: Cloudflare Pages Assets
- **Language**: TypeScript

## Perintah Deployment

### Deploy ke Production

```bash
npx wrangler deploy
```

Perintah ini akan:
1. Compile TypeScript ke JavaScript
2. Bundle semua dependencies
3. Upload ke Cloudflare Workers
4. Deploy static assets dari folder `public/`

### Test Lokal (Development)

```bash
npx wrangler dev
```

Ini akan menjalankan local development server dengan:
- Hot reload untuk perubahan kode
- Local D1 database (`.wrangler/state/`)
- Akses di `http://localhost:8787`

## Kapan Perlu Test Lokal vs Langsung Deploy

### Langsung Deploy (Low Risk)
- CRUD sederhana tanpa logic kompleks
- Menambah endpoint baru tanpa mengubah yang lama
- Perubahan UI/frontend saja
- Mengikuti pattern yang sudah ada (copy-paste dari fitur serupa)
- Tidak ada perubahan schema database

### Test Lokal Dulu (Higher Risk)
- Logic bisnis kompleks (kalkulasi payroll, komisi)
- Perubahan pada fitur existing yang sudah production
- Migration database
- Integrasi dengan service external
- Perubahan authentication/authorization

## Database Migration

### Menjalankan Migration di Production

```bash
npx wrangler d1 execute nearme_laundry_db --remote --file=db/migration-vX.sql
```

### Menjalankan Migration di Local

```bash
npx wrangler d1 execute nearme_laundry_db --local --file=db/migration-vX.sql
```

### Cek Data di Database

```bash
# Production
npx wrangler d1 execute nearme_laundry_db --remote --command="SELECT * FROM table_name LIMIT 10"

# Local
npx wrangler d1 execute nearme_laundry_db --local --command="SELECT * FROM table_name LIMIT 10"
```

## Environment Variables & Secrets

### Set Secret (Production)

```bash
npx wrangler secret put JWT_SECRET
```

### Vars di wrangler.toml

Untuk development, vars bisa diset di `wrangler.toml`:
```toml
[vars]
JWT_SECRET = "dev-secret-key-12345"
```

**PENTING**: Jangan commit secret production ke repository!

## Struktur Project

```
├── functions/           # Backend API (Cloudflare Workers)
│   ├── index.ts        # Entry point & routing
│   ├── api/            # API endpoints
│   │   ├── admin/      # Admin endpoints
│   │   ├── production/ # Staff produksi endpoints
│   │   ├── kurir/      # Kurir endpoints
│   │   └── warehouse/  # Gudang endpoints
│   └── _utils/         # Shared utilities
├── public/             # Static assets (HTML, CSS, JS)
│   ├── admin/          # Admin dashboard pages
│   ├── produksi/       # Staff produksi pages
│   ├── kurir/          # Kurir pages
│   └── shared/         # Shared JS (nav.js, timezone.js)
├── db/                 # Database files
│   ├── schema.sql      # Initial schema
│   └── migration-*.sql # Migration files
└── wrangler.toml       # Cloudflare config
```

## Troubleshooting

### Error: "Missing script: build"
Ini normal - Cloudflare Workers tidak perlu build step terpisah. Wrangler handle compilation saat deploy.

### Error: D1 Database not found
Pastikan database_id di wrangler.toml sesuai dengan D1 database yang sudah dibuat di Cloudflare dashboard.

### Error: JWT_SECRET not set
Jalankan: `npx wrangler secret put JWT_SECRET`

## Checklist Sebelum Deploy

- [ ] Tidak ada error TypeScript (`getDiagnostics` clean)
- [ ] Jika ada migration, sudah dijalankan di production
- [ ] Jika mengubah fitur existing, sudah test lokal
- [ ] Commit changes ke git sebelum deploy
