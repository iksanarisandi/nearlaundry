-- Migration v10: Add UNIQUE constraint untuk nota_number per outlet dan process
-- AMAN: Tidak menghapus data, hanya menambah constraint
-- Jika ada duplikat, migrasi akan gagal dengan error yang jelas

-- PENTING: Jalankan check-duplicates.sql terlebih dahulu untuk memastikan tidak ada duplikat
-- Jika ada duplikat, bersihkan manual sebelum menjalankan migrasi ini

-- 1. Buat tabel production baru dengan constraint UNIQUE
CREATE TABLE production_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  nota_number TEXT NOT NULL,
  process TEXT NOT NULL CHECK (process IN ('cuci','kering','setrika','packing','cuci_sepatu','cuci_satuan')),
  weight REAL NOT NULL,
  qty INTEGER NOT NULL,
  service_price INTEGER DEFAULT 0,
  timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(outlet_id, nota_number, process)
);

-- 2. Copy semua data dari tabel lama ke tabel baru
-- Jika ada duplikat, INSERT akan gagal di sini dengan error UNIQUE constraint failed
INSERT INTO production_new 
SELECT id, user_id, outlet_id, customer_name, nota_number, process, weight, qty, service_price, timestamp
FROM production;

-- 3. Drop tabel lama
DROP TABLE production;

-- 4. Rename tabel baru menjadi production
ALTER TABLE production_new RENAME TO production;

-- Migrasi selesai! Constraint UNIQUE(outlet_id, nota_number, process) sekarang aktif
