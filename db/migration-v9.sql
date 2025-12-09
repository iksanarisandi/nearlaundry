-- Migration v9: Tambah kolom phone di tabel users
-- Fitur Slip Gaji WhatsApp untuk menyimpan nomor telepon karyawan

-- SQLite mendukung ALTER TABLE ADD COLUMN
-- Tambah kolom phone (nullable) untuk nomor telepon dalam format 62xxxxxxxxxx
ALTER TABLE users ADD COLUMN phone TEXT;
