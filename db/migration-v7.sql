-- Migration v7: Tambah role 'kurir' ke tabel users
-- SQLite tidak support ALTER TABLE untuk mengubah CHECK constraint
-- Jadi kita perlu recreate tabel

-- 1. Buat tabel baru dengan constraint yang benar
CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','gudang','produksi','kurir')),
  outlet_id INTEGER,
  join_date TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Copy data dari tabel lama
INSERT INTO users_new (id, name, email, password_hash, role, outlet_id, join_date, created_at)
SELECT id, name, email, password_hash, role, outlet_id, join_date, created_at FROM users;

-- 3. Hapus tabel lama
DROP TABLE users;

-- 4. Rename tabel baru
ALTER TABLE users_new RENAME TO users;
