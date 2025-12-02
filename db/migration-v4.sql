-- Migration v4: BHP prices, cuci satuan, cuci sepatu improvements

-- 1. Tabel harga item BHP (diatur admin)
CREATE TABLE IF NOT EXISTS bhp_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Insert default BHP items
INSERT OR IGNORE INTO bhp_items (name, category, price, unit) VALUES 
  ('uang makan lembur', 'Uang Makan', 0, 'pcs'),
  ('uang makan target omzet', 'Uang Makan', 0, 'pcs'),
  ('rinso', 'Bahan Cuci', 0, 'pcs'),
  ('emulsi', 'Bahan Cuci', 0, 'liter'),
  ('cuka', 'Bahan Cuci', 0, 'liter'),
  ('baking soda', 'Bahan Cuci', 0, 'kg'),
  ('sabun kodok', 'Bahan Cuci', 0, 'pcs'),
  ('penghilang noda', 'Bahan Cuci', 0, 'pcs'),
  ('parfum allison', 'Pewangi', 0, 'liter'),
  ('parfum pink blossom', 'Pewangi', 0, 'liter'),
  ('parfum molto', 'Pewangi', 0, 'liter'),
  ('semprot parfum', 'Pewangi', 0, 'pcs'),
  ('plastik 7', 'Plastik', 0, 'pack'),
  ('plastik 12', 'Plastik', 0, 'pack'),
  ('plastik 15', 'Plastik', 0, 'pack'),
  ('plastik 20', 'Plastik', 0, 'pack'),
  ('plastik satuan', 'Plastik', 0, 'pack'),
  ('plastik sepatu', 'Plastik', 0, 'pack'),
  ('lakban', 'Perlengkapan', 0, 'pcs'),
  ('hanger', 'Perlengkapan', 0, 'pcs'),
  ('kertas print', 'Perlengkapan', 0, 'rim'),
  ('roll bulu', 'Perlengkapan', 0, 'pcs'),
  ('wipoll', 'Perlengkapan', 0, 'pcs');

-- 2. Tabel settings untuk konfigurasi harga
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value, description) VALUES 
  ('cuci_sepatu_rate', '10000', 'Upah cuci sepatu per pasang'),
  ('cuci_satuan_commission_percent', '15', 'Persentase komisi cuci satuan dari harga jual');

-- 3. Tambah kolom service_price di production untuk cuci satuan
ALTER TABLE production ADD COLUMN service_price INTEGER DEFAULT 0;
