-- Migration v5: Kasbon table and outlet GPS coordinates

-- 1. Tabel kasbon
CREATE TABLE IF NOT EXISTS kasbon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2. Tambah koordinat GPS ke outlets untuk validasi absen
ALTER TABLE outlets ADD COLUMN latitude REAL;
ALTER TABLE outlets ADD COLUMN longitude REAL;
