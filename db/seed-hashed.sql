-- Outlet awal
INSERT INTO outlets (name) VALUES ('Outlet Pusat');
INSERT INTO outlets (name) VALUES ('Outlet Cabang 1');

-- User dengan password: laundry123
INSERT INTO users (name, email, password_hash, role, outlet_id) VALUES
  ('Admin Utama', 'admin@nearmelaundry.local', '$2a$10$508mJh6InBvKuQdWH7IkUuHSzeLqRipxko4.F8MC3MESXHh5ecTlW', 'admin', NULL);

INSERT INTO users (name, email, password_hash, role, outlet_id) VALUES
  ('Staff Gudang', 'gudang@nearmelaundry.local', '$2a$10$508mJh6InBvKuQdWH7IkUuHSzeLqRipxko4.F8MC3MESXHh5ecTlW', 'gudang', NULL);

INSERT INTO users (name, email, password_hash, role, outlet_id) VALUES
  ('Operator Produksi Pusat', 'produksi.pusat@nearmelaundry.local', '$2a$10$508mJh6InBvKuQdWH7IkUuHSzeLqRipxko4.F8MC3MESXHh5ecTlW', 'produksi', 1);

INSERT INTO users (name, email, password_hash, role, outlet_id) VALUES
  ('Operator Produksi Cabang 1', 'produksi.cabang1@nearmelaundry.local', '$2a$10$508mJh6InBvKuQdWH7IkUuHSzeLqRipxko4.F8MC3MESXHh5ecTlW', 'produksi', 2);

-- Warehouse items sample
INSERT INTO warehouse_items (name, qty) VALUES ('Deterjen 1kg', 50);
INSERT INTO warehouse_items (name, qty) VALUES ('Pewangi 500ml', 30);
INSERT INTO warehouse_items (name, qty) VALUES ('Plastik Packing', 100);
INSERT INTO warehouse_items (name, qty) VALUES ('Gas 3kg', 20);
