-- Migration v6: Fix commission structure

-- Update commission_rates table to support different rate types
ALTER TABLE commission_rates ADD COLUMN rate_type TEXT DEFAULT 'per_kg';
ALTER TABLE commission_rates ADD COLUMN rate_value INTEGER DEFAULT 0;

-- Update existing rates
-- cuci_sepatu: per_qty (per pasang)
UPDATE commission_rates SET rate_type = 'per_qty', rate_value = 10000 WHERE process = 'cuci_sepatu';

-- cuci_satuan: percent (% dari harga jual)
UPDATE commission_rates SET rate_type = 'percent', rate_value = 15 WHERE process = 'cuci_satuan';

-- Add kurir rates if not exists
INSERT OR IGNORE INTO commission_rates (process, rate_per_kg, rate_type, rate_value) VALUES ('antar', 0, 'per_trip', 5000);
INSERT OR IGNORE INTO commission_rates (process, rate_per_kg, rate_type, rate_value) VALUES ('jemput', 0, 'per_trip', 5000);
