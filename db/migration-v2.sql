-- Migration v2: Update untuk fitur admin lengkap

-- 1. Update outlets - tambah alamat
ALTER TABLE outlets ADD COLUMN address TEXT;

-- 2. Update production - tambah proses baru
-- Tidak bisa ALTER CHECK constraint di SQLite, jadi kita buat tabel baru nanti jika perlu
-- Untuk sekarang, kita akan handle di aplikasi

-- 3. Tabel pengaturan komisi per kg
CREATE TABLE IF NOT EXISTS commission_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process TEXT NOT NULL UNIQUE,
  rate_per_kg INTEGER NOT NULL DEFAULT 0
);

-- Insert default rates
INSERT OR IGNORE INTO commission_rates (process, rate_per_kg) VALUES 
  ('cuci', 0),
  ('kering', 0),
  ('setrika', 0),
  ('packing', 0),
  ('cuci_sepatu', 0),
  ('cuci_satuan', 0);

-- 4. Tabel payroll baru yang lebih lengkap
CREATE TABLE IF NOT EXISTS payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  gaji_pokok INTEGER NOT NULL DEFAULT 0,
  uang_makan INTEGER NOT NULL DEFAULT 0,
  uang_transport INTEGER NOT NULL DEFAULT 0,
  lembur_jam INTEGER NOT NULL DEFAULT 0,
  lembur_jam_rate INTEGER NOT NULL DEFAULT 7000,
  lembur_libur INTEGER NOT NULL DEFAULT 0,
  lembur_libur_rate INTEGER NOT NULL DEFAULT 35000,
  tunjangan_jabatan INTEGER NOT NULL DEFAULT 0,
  thr INTEGER NOT NULL DEFAULT 0,
  denda INTEGER NOT NULL DEFAULT 0,
  kasbon INTEGER NOT NULL DEFAULT 0,
  komisi_total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(user_id, month, year)
);

-- 5. Tabel warehouse_logs update untuk stok masuk
ALTER TABLE warehouse_logs ADD COLUMN type TEXT DEFAULT 'out';
ALTER TABLE warehouse_logs ADD COLUMN qty_in INTEGER DEFAULT 0;
