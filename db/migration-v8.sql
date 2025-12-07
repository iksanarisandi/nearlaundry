-- Migration v8: Tambah kolom annulment di tabel attendance
-- Fitur Anulir Absensi untuk membatalkan record absensi tanpa menghapus data

-- SQLite mendukung ALTER TABLE ADD COLUMN
-- Tambah kolom status dengan default 'active'
ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'annulled'));

-- Tambah kolom annulled_by untuk menyimpan admin ID yang melakukan anulir
ALTER TABLE attendance ADD COLUMN annulled_by INTEGER REFERENCES users(id);

-- Tambah kolom annulled_at untuk timestamp anulir
ALTER TABLE attendance ADD COLUMN annulled_at TEXT;

-- Tambah kolom annulled_reason untuk alasan anulir
ALTER TABLE attendance ADD COLUMN annulled_reason TEXT;
