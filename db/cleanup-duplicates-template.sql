-- Template untuk membersihkan duplikat nota_number
-- GUNAKAN DENGAN HATI-HATI! Backup database sebelum menjalankan ini.

-- LANGKAH 1: Identifikasi duplikat
-- Jalankan query ini untuk melihat duplikat yang ada:
/*
SELECT 
  outlet_id,
  nota_number,
  process,
  COUNT(*) as jumlah,
  GROUP_CONCAT(id) as id_list
FROM production
GROUP BY outlet_id, nota_number, process
HAVING COUNT(*) > 1;
*/

-- LANGKAH 2: Pilih strategi cleanup
-- Ada 2 pilihan:
-- A. Hapus entry yang lebih lama (keep yang terbaru)
-- B. Merge data dari entry yang duplikat

-- STRATEGI A: Hapus entry yang lebih lama (RECOMMENDED)
-- Jalankan query ini untuk setiap duplikat yang ditemukan:

-- Contoh: Jika ada duplikat di outlet_id=1, nota_number='001', process='cuci'
-- Jalankan:
/*
DELETE FROM production
WHERE id IN (
  SELECT id FROM (
    SELECT id FROM production
    WHERE outlet_id = 1 AND nota_number = '001' AND process = 'cuci'
    ORDER BY timestamp ASC
    LIMIT -1 OFFSET 1  -- Hapus semua kecuali yang terbaru
  )
);
*/

-- STRATEGI B: Merge data (jika ada data penting di entry yang duplikat)
-- Contoh: Jika ada 2 entry dengan nota sama tapi qty berbeda
-- Bisa merge qty-nya ke entry yang terbaru, baru hapus yang lama

-- LANGKAH 3: Verifikasi
-- Setelah cleanup, jalankan check-duplicates.sql untuk memastikan tidak ada duplikat lagi

-- ============================================================================
-- TEMPLATE UNTUK CLEANUP MANUAL
-- ============================================================================

-- Ganti nilai di bawah sesuai duplikat yang ditemukan:
-- @outlet_id = outlet_id dari duplikat
-- @nota_number = nota_number dari duplikat
-- @process = process dari duplikat

-- Contoh:
-- DELETE FROM production
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id FROM production
--     WHERE outlet_id = 1 AND nota_number = '001' AND process = 'cuci'
--     ORDER BY timestamp ASC
--     LIMIT -1 OFFSET 1
--   )
-- );

-- ============================================================================
-- CATATAN PENTING
-- ============================================================================
-- 1. Backup database sebelum menjalankan cleanup
-- 2. Jalankan check-duplicates.sql dulu untuk melihat duplikat
-- 3. Jalankan cleanup untuk setiap duplikat yang ditemukan
-- 4. Verifikasi dengan check-duplicates.sql lagi
-- 5. Baru jalankan migration-v10.sql

-- ============================================================================
