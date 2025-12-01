-- Outlet awal
INSERT INTO outlets (name) VALUES
  ('Outlet Pusat'),
  ('Outlet Cabang 1');

-- User awal (password_hash nanti diisi manual dengan bcryptjs di CLI atau script terpisah)
INSERT INTO users (name, email, password_hash, role, outlet_id) VALUES
  ('Admin Utama', 'admin@nearmelaundry.local', 'TO_BE_HASHED_ADMIN', 'admin', NULL),
  ('Staff Gudang', 'gudang@nearmelaundry.local', 'TO_BE_HASHED_GUDANG', 'gudang', NULL),
  ('Operator Produksi Pusat', 'produksi.pusat@nearmelaundry.local', 'TO_BE_HASHED_PROD1', 'produksi', 1),
  ('Operator Produksi Cabang 1', 'produksi.cabang1@nearmelaundry.local', 'TO_BE_HASHED_PROD2', 'produksi', 2);
