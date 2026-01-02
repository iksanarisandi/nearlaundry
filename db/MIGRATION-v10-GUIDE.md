# Migration v10: UNIQUE Constraint untuk Nota Number

## Tujuan
Menambahkan constraint UNIQUE pada kombinasi `(outlet_id, nota_number, process)` untuk memastikan nomor nota tidak bisa duplikat dalam outlet dan proses yang sama.

## Perubahan
- **Sebelum**: Nomor nota bisa sama di cabang berbeda (tidak ada constraint)
- **Sesudah**: Nomor nota hanya unik per outlet + process (constraint di database level)

## Keamanan Migrasi
✅ **Tidak menghapus data** - Semua data production tetap ada
✅ **Tidak mengubah struktur** - Hanya menambah constraint
✅ **Backward compatible** - Semua query existing tetap bekerja
✅ **Fail-safe** - Jika ada duplikat, migrasi gagal dengan error jelas

## Langkah-Langkah Migrasi

### 1. Cek Duplikat (WAJIB)
Jalankan query ini di database untuk memastikan tidak ada duplikat:

```bash
# Menggunakan wrangler
wrangler d1 execute [database-name] --file db/check-duplicates.sql
```

**Hasil yang diharapkan**: Tidak ada baris (empty result)

Jika ada hasil, itu berarti ada duplikat. Contoh:
```
outlet_id | nota_number | process | jumlah_duplikat | id_list
1         | 001         | cuci    | 2               | 5,10
```

**Jika ada duplikat**, hubungi admin untuk membersihkan data manual sebelum lanjut ke step 2.

### 2. Jalankan Migrasi
Setelah memastikan tidak ada duplikat, jalankan migrasi:

```bash
wrangler d1 execute [database-name] --file db/migration-v10.sql
```

**Hasil yang diharapkan**: Migrasi berhasil tanpa error

Jika ada error "UNIQUE constraint failed", itu berarti ada duplikat yang terlewat. Jangan lanjutkan sampai duplikat dibersihkan.

### 3. Verifikasi Migrasi
Jalankan query ini untuk memastikan constraint sudah aktif:

```sql
-- Coba insert duplikat (akan gagal jika constraint aktif)
INSERT INTO production (user_id, outlet_id, customer_name, nota_number, process, weight, qty)
VALUES (1, 1, 'Test', 'TEST001', 'cuci', 5, 1);

-- Coba insert yang sama lagi (harus gagal dengan UNIQUE constraint error)
INSERT INTO production (user_id, outlet_id, customer_name, nota_number, process, weight, qty)
VALUES (1, 1, 'Test', 'TEST001', 'cuci', 5, 1);
```

Hasil yang diharapkan: Insert kedua gagal dengan error "UNIQUE constraint failed"

### 4. Update Aplikasi
Aplikasi sudah diupdate untuk:
- Validasi nota_number per outlet (bukan global)
- Error message yang lebih jelas: "Nota XXX sudah diinput untuk proses YYY di outlet ini"

## Rollback (Jika Diperlukan)

Jika ada masalah, rollback dengan:

```bash
# Restore dari backup sebelum migrasi
# atau jalankan script rollback manual
```

**Catatan**: Migrasi ini tidak bisa di-rollback otomatis karena mengubah struktur tabel. Pastikan backup database sebelum menjalankan migrasi.

## FAQ

**Q: Apakah data akan hilang?**
A: Tidak. Semua data production tetap ada, hanya ditambah constraint.

**Q: Apakah query existing akan break?**
A: Tidak. Semua query tetap kompatibel.

**Q: Bagaimana jika ada duplikat?**
A: Migrasi akan gagal dengan error jelas. Bersihkan duplikat manual, lalu jalankan migrasi lagi.

**Q: Bisakah user input nota yang sama di cabang berbeda?**
A: Ya, itu diperbolehkan. Constraint hanya mencegah duplikat dalam outlet + process yang sama.

## Timeline
- **Dibuat**: 2026-01-02
- **Status**: Ready untuk dijalankan
- **Tested**: Ya, aman untuk production
