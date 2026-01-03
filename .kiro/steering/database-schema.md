# Database Schema - NearMe Laundry Mini ERP

Dokumentasi lengkap skema database Cloudflare D1 (SQLite) untuk aplikasi NearMe Laundry.

## Overview

- **Database**: Cloudflare D1 (SQLite)
- **Timezone**: Semua timestamp disimpan dalam UTC, konversi ke WITA (UTC+8) di aplikasi
- **Format Timestamp**: ISO 8601 dengan suffix 'Z' (`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)

## Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   outlets   │     │    users    │     │  attendance │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │◄────│ outlet_id   │     │ id (PK)     │
│ name        │     │ id (PK)     │◄────│ user_id     │
│ address     │     │ name        │     │ type        │
│ latitude    │     │ email       │     │ timestamp   │
│ longitude   │     │ password    │     │ lat, lng    │
└─────────────┘     │ role        │     │ status      │
                    │ phone       │     │ annulled_by │──┐
                    │ join_date   │     └─────────────┘  │
                    └─────────────┘◄──────────────────────┘
                          │
          ┌───────────────┼───────────────┬───────────────┐
          ▼               ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
    │production │   │ expenses  │   │deliveries │   │  kasbon   │
    ├───────────┤   ├───────────┤   ├───────────┤   ├───────────┤
    │ id (PK)   │   │ id (PK)   │   │ id (PK)   │   │ id (PK)   │
    │ user_id   │   │ user_id   │   │ user_id   │   │ user_id   │
    │ outlet_id │   │ outlet_id │   │ outlet_id │   │ amount    │
    │ process   │   │ category  │   │ type      │   │ status    │
    │ nota_num  │   │ amount    │   │ customer  │   │ notes     │
    │ weight    │   │ timestamp │   │ address   │   └───────────┘
    │ qty       │   └───────────┘   │ status    │
    │ svc_price │                   └───────────┘
    └───────────┘
```

---

## Tabel: users

Menyimpan data pengguna sistem (admin, staff produksi, kurir, gudang).

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,  -- Validasi di code: admin, gudang, produksi, kurir
  outlet_id INTEGER,   -- FK ke outlets.id (nullable untuk admin)
  join_date TEXT,      -- Format: YYYY-MM-DD
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  phone TEXT           -- Format: 628xxxxxxxxxx (normalized)
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key, auto increment |
| name | TEXT | NO | Nama lengkap user |
| email | TEXT | NO | Email unik untuk login |
| password_hash | TEXT | NO | Password hash (bcrypt) |
| role | TEXT | NO | Role: `admin`, `gudang`, `produksi`, `kurir` |
| outlet_id | INTEGER | YES | FK ke outlets.id |
| join_date | TEXT | YES | Tanggal bergabung (YYYY-MM-DD) |
| created_at | TEXT | YES | Timestamp pembuatan (UTC) |
| phone | TEXT | YES | Nomor HP (format: 628xxx) |

**Validasi role di code**: `functions/api/admin/users.ts`

---

## Tabel: outlets

Menyimpan data outlet/cabang laundry.

```sql
CREATE TABLE outlets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  latitude REAL,
  longitude REAL
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key |
| name | TEXT | NO | Nama outlet |
| address | TEXT | YES | Alamat lengkap |
| latitude | REAL | YES | Koordinat latitude |
| longitude | REAL | YES | Koordinat longitude |

---

## Tabel: attendance

Menyimpan data absensi karyawan (check-in/check-out).

```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in','out')),
  timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  lat REAL,
  lng REAL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'annulled')),
  annulled_by INTEGER REFERENCES users(id),
  annulled_at TEXT,
  annulled_reason TEXT
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key |
| user_id | INTEGER | NO | FK ke users.id |
| type | TEXT | NO | Tipe: `in` (masuk), `out` (keluar) |
| timestamp | TEXT | YES | Waktu absen (UTC) |
| lat | REAL | YES | Latitude lokasi absen |
| lng | REAL | YES | Longitude lokasi absen |
| status | TEXT | YES | Status: `active`, `annulled` |
| annulled_by | INTEGER | YES | FK ke users.id (admin yang membatalkan) |
| annulled_at | TEXT | YES | Waktu pembatalan (UTC) |
| annulled_reason | TEXT | YES | Alasan pembatalan |

---

## Tabel: production

Menyimpan data produksi laundry (cuci, kering, setrika, packing, dll).

```sql
CREATE TABLE production (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  customer_name TEXT,
  nota_number TEXT,
  process TEXT NOT NULL,  -- Validasi di code
  qty INTEGER NOT NULL,
  timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  weight REAL,
  service_price INTEGER DEFAULT 0
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key |
| user_id | INTEGER | NO | FK ke users.id (staff yang input) |
| outlet_id | INTEGER | NO | FK ke outlets.id |
| customer_name | TEXT | YES | Nama pelanggan |
| nota_number | TEXT | YES | Nomor nota |
| process | TEXT | NO | Jenis proses (lihat di bawah) |
| qty | INTEGER | NO | Jumlah item |
| timestamp | TEXT | YES | Waktu input (UTC) |
| weight | REAL | YES | Berat (kg), 0 untuk cuci_satuan/cuci_sepatu |
| service_price | INTEGER | YES | Harga jasa (untuk cuci_satuan) |

**Nilai process yang valid** (validasi di `functions/api/production/index.ts`):
- `cuci` - Proses cuci
- `kering` - Proses pengeringan
- `setrika` - Proses setrika
- `packing` - Proses packing
- `cuci_sepatu` - Cuci sepatu (per pasang)
- `cuci_satuan` - Cuci satuan (per item, dengan harga jasa)

---

## Tabel: expenses

Menyimpan data pengeluaran operasional.

```sql
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key |
| user_id | INTEGER | NO | FK ke users.id |
| outlet_id | INTEGER | NO | FK ke outlets.id |
| category | TEXT | NO | Kategori pengeluaran |
| amount | INTEGER | NO | Jumlah (dalam Rupiah) |
| timestamp | TEXT | YES | Waktu input (UTC) |

---

## Tabel: deliveries

Menyimpan data pengantaran/penjemputan oleh kurir.

```sql
CREATE TABLE deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  outlet_id INTEGER,
  type TEXT NOT NULL CHECK (type IN ('antar','jemput')),
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  nota_number TEXT,
  status TEXT DEFAULT 'berhasil' CHECK (status IN ('berhasil','gagal')),
  timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key |
| user_id | INTEGER | NO | FK ke users.id (kurir) |
| outlet_id | INTEGER | YES | FK ke outlets.id |
| type | TEXT | NO | Tipe: `antar`, `jemput` |
| customer_name | TEXT | NO | Nama pelanggan |
| address | TEXT | NO | Alamat pengantaran/penjemputan |
| nota_number | TEXT | YES | Nomor nota |
| status | TEXT | YES | Status: `berhasil`, `gagal` |
| timestamp | TEXT | YES | Waktu input (UTC) |

---

## Tabel: kasbon

Menyimpan data kasbon/pinjaman karyawan.

```sql
CREATE TABLE kasbon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key |
| user_id | INTEGER | NO | FK ke users.id |
| amount | INTEGER | NO | Jumlah kasbon (Rupiah) |
| status | TEXT | YES | Status: `pending`, `approved`, `rejected`, `paid` |
| notes | TEXT | YES | Catatan |
| created_at | TEXT | YES | Waktu pembuatan (UTC) |

---

## Tabel: payroll

Menyimpan data gaji bulanan karyawan.

```sql
CREATE TABLE payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month INTEGER NOT NULL,        -- 1-12
  year INTEGER NOT NULL,         -- e.g. 2026
  gaji_pokok INTEGER NOT NULL DEFAULT 0,
  uang_makan INTEGER NOT NULL DEFAULT 0,
  uang_transport INTEGER NOT NULL DEFAULT 0,
  lembur_jam INTEGER NOT NULL DEFAULT 0,
  lembur_jam_rate INTEGER NOT NULL DEFAULT 0,
  lembur_libur INTEGER NOT NULL DEFAULT 0,
  lembur_libur_rate INTEGER NOT NULL DEFAULT 0,
  tunjangan_jabatan INTEGER NOT NULL DEFAULT 0,
  tunjangan_lain INTEGER NOT NULL DEFAULT 0,
  potongan_kasbon INTEGER NOT NULL DEFAULT 0,
  potongan_lain INTEGER NOT NULL DEFAULT 0,
  komisi_total INTEGER NOT NULL DEFAULT 0,
  denda_terlambat INTEGER NOT NULL DEFAULT 0,
  denda_tanpa_keterangan INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key |
| user_id | INTEGER | NO | FK ke users.id |
| month | INTEGER | NO | Bulan (1-12) |
| year | INTEGER | NO | Tahun |
| gaji_pokok | INTEGER | NO | Gaji pokok |
| uang_makan | INTEGER | NO | Uang makan |
| uang_transport | INTEGER | NO | Uang transport |
| lembur_jam | INTEGER | NO | Jumlah jam lembur |
| lembur_jam_rate | INTEGER | NO | Rate per jam lembur |
| lembur_libur | INTEGER | NO | Jumlah hari lembur libur |
| lembur_libur_rate | INTEGER | NO | Rate lembur hari libur |
| tunjangan_jabatan | INTEGER | NO | Tunjangan jabatan |
| tunjangan_lain | INTEGER | NO | Tunjangan lainnya |
| potongan_kasbon | INTEGER | NO | Potongan kasbon |
| potongan_lain | INTEGER | NO | Potongan lainnya |
| komisi_total | INTEGER | NO | Total komisi |
| denda_terlambat | INTEGER | NO | Denda keterlambatan |
| denda_tanpa_keterangan | INTEGER | NO | Denda tanpa keterangan |
| created_at | TEXT | YES | Waktu pembuatan (UTC) |

---

## Tabel: commission_rates

Menyimpan konfigurasi rate komisi per proses.

```sql
CREATE TABLE commission_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process TEXT NOT NULL UNIQUE,
  rate_per_kg INTEGER NOT NULL DEFAULT 0,
  rate_type TEXT DEFAULT 'per_kg',
  rate_value INTEGER DEFAULT 0
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key |
| process | TEXT | NO | Nama proses (unique) |
| rate_per_kg | INTEGER | NO | Rate per kg (legacy) |
| rate_type | TEXT | YES | Tipe rate: `per_kg`, `per_qty`, `percent` |
| rate_value | INTEGER | YES | Nilai rate |

**Rate types**:
- `per_kg` - Komisi per kilogram
- `per_qty` - Komisi per item (untuk cuci_sepatu)
- `percent` - Persentase dari harga jasa (untuk cuci_satuan)

---

## Tabel: bhp_items

Menyimpan data item BHP (Bahan Habis Pakai).

```sql
CREATE TABLE bhp_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| id | INTEGER | NO | Primary key |
| name | TEXT | NO | Nama item (unique) |
| category | TEXT | NO | Kategori: Bahan Cuci, Pewangi, Plastik, dll |
| price | INTEGER | NO | Harga per unit |
| unit | TEXT | YES | Satuan: pcs, liter, kg, pack, rim |
| created_at | TEXT | YES | Waktu pembuatan (UTC) |

---

## Tabel: app_settings

Menyimpan konfigurasi aplikasi.

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);
```

| Kolom | Tipe | Nullable | Deskripsi |
|-------|------|----------|-----------|
| key | TEXT | NO | Primary key, nama setting |
| value | TEXT | NO | Nilai setting |
| description | TEXT | YES | Deskripsi setting |

**Settings yang tersedia**:
- `cuci_sepatu_rate` - Upah cuci sepatu per pasang
- `cuci_satuan_commission_percent` - Persentase komisi cuci satuan

---

## Tabel: warehouse_items

Menyimpan data stok gudang.

```sql
CREATE TABLE warehouse_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0
);
```

---

## Tabel: warehouse_logs

Menyimpan log pengeluaran barang dari gudang.

```sql
CREATE TABLE warehouse_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  qty_out INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

---

## Tabel: revenue

Menyimpan data pendapatan harian per outlet.

```sql
CREATE TABLE revenue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id INTEGER NOT NULL,
  date TEXT NOT NULL,      -- Format: YYYY-MM-DD
  amount INTEGER NOT NULL
);
```

---

## Tabel: audit_logs

Menyimpan log aktivitas untuk audit trail.

```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

---

## Tabel: payroll_matrix (Legacy)

Tabel legacy untuk konfigurasi gaji. Gunakan tabel `payroll` untuk data gaji aktual.

```sql
CREATE TABLE payroll_matrix (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  base_salary INTEGER NOT NULL,
  adjustment INTEGER NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL
);
```

---

## Foreign Key Relationships

```
users.outlet_id          → outlets.id
attendance.user_id       → users.id
attendance.annulled_by   → users.id
production.user_id       → users.id
production.outlet_id     → outlets.id
expenses.user_id         → users.id
expenses.outlet_id       → outlets.id
deliveries.user_id       → users.id
deliveries.outlet_id     → outlets.id
kasbon.user_id           → users.id
payroll.user_id          → users.id
warehouse_logs.item_id   → warehouse_items.id
warehouse_logs.outlet_id → outlets.id
revenue.outlet_id        → outlets.id
audit_logs.user_id       → users.id
```

---

## Validasi di Application Code

Beberapa validasi dilakukan di code (bukan CHECK constraint) untuk fleksibilitas:

| Field | Valid Values | File Validasi |
|-------|--------------|---------------|
| users.role | admin, gudang, produksi, kurir | `functions/api/admin/users.ts` |
| production.process | cuci, kering, setrika, packing, cuci_sepatu, cuci_satuan | `functions/api/production/index.ts` |

---

## Query Patterns

### Filter berdasarkan tanggal WITA

```sql
-- Gunakan UTC boundaries untuk filter tanggal WITA
-- WITA 2025-01-03 00:00 = UTC 2025-01-02 16:00
SELECT * FROM production 
WHERE timestamp >= '2025-01-02T16:00:00.000Z' 
  AND timestamp <= '2025-01-03T15:59:59.999Z';
```

### Agregasi per bulan WITA

```sql
SELECT 
  strftime('%Y-%m', datetime(timestamp, '+8 hours')) as month,
  COUNT(*) as total
FROM production
GROUP BY month;
```

### Join user dengan outlet

```sql
SELECT u.*, o.name as outlet_name
FROM users u
LEFT JOIN outlets o ON u.outlet_id = o.id;
```
