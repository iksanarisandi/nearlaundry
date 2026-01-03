-- Migration v11: Hapus CHECK constraint dari tabel production dan users
-- Validasi akan dilakukan di application code (lebih fleksibel untuk perubahan)
-- 
-- AMAN: Data tidak dihapus, hanya struktur tabel yang diubah
-- SQLite tidak support ALTER COLUMN, jadi harus recreate tabel
--
-- PENTING: Disable foreign key check sementara untuk recreate tabel

-- Disable foreign key constraints sementara
PRAGMA foreign_keys = OFF;

-- ============================================================
-- BAGIAN 1: RECREATE TABEL PRODUCTION (hapus CHECK pada process)
-- ============================================================

-- 1.1 Buat tabel production baru TANPA CHECK constraint
CREATE TABLE production_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  customer_name TEXT,
  nota_number TEXT,
  process TEXT NOT NULL,  -- Tanpa CHECK constraint, validasi di code
  qty INTEGER NOT NULL,
  timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  weight REAL,
  service_price INTEGER DEFAULT 0
);

-- 1.2 Copy semua data dari tabel lama ke tabel baru
INSERT INTO production_new (id, user_id, outlet_id, customer_name, nota_number, process, qty, timestamp, weight, service_price)
SELECT id, user_id, outlet_id, customer_name, nota_number, process, qty, timestamp, weight, service_price
FROM production;

-- 1.3 Drop tabel lama
DROP TABLE production;

-- 1.4 Rename tabel baru menjadi production
ALTER TABLE production_new RENAME TO production;

-- ============================================================
-- BAGIAN 2: RECREATE TABEL USERS (hapus CHECK pada role)
-- ============================================================
-- CATATAN: Tabel lain yang REFERENCES users(id):
--   - attendance.annulled_by REFERENCES users(id)
--   - kasbon.user_id REFERENCES users(id)
-- SQLite foreign key tidak enforce by default, jadi aman untuk recreate
-- Setelah recreate, foreign key tetap valid karena id tidak berubah

-- 2.1 Buat tabel users baru TANPA CHECK constraint pada role
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,  -- Tanpa CHECK constraint, validasi di code
  outlet_id INTEGER,
  join_date TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  phone TEXT
);

-- 2.2 Copy semua data dari tabel lama ke tabel baru
INSERT INTO users_new (id, name, email, password_hash, role, outlet_id, join_date, created_at, phone)
SELECT id, name, email, password_hash, role, outlet_id, join_date, created_at, phone
FROM users;

-- 2.3 Drop tabel lama
DROP TABLE users;

-- 2.4 Rename tabel baru menjadi users
ALTER TABLE users_new RENAME TO users;

-- ============================================================
-- VERIFIKASI: Pastikan data tidak hilang
-- ============================================================
-- Jalankan query berikut setelah migrasi untuk verifikasi:
-- SELECT COUNT(*) FROM production;
-- SELECT COUNT(*) FROM users;
-- SELECT * FROM users LIMIT 5;
-- SELECT * FROM production LIMIT 5;

-- ============================================================
-- MIGRASI SELESAI!
-- ============================================================

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;

-- CHECK constraint dihapus dari:
--   1. production.process - validasi di functions/api/production/index.ts
--   2. users.role - validasi di functions/api/admin/users.ts
--
-- Foreign key yang tetap valid:
--   - attendance.annulled_by -> users.id (id tidak berubah)
--   - kasbon.user_id -> users.id (id tidak berubah)
--   - production.user_id -> users.id (id tidak berubah)
--   - production.outlet_id -> outlets.id (id tidak berubah)
