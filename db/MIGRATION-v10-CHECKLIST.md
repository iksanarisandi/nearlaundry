# Migration v10 - Pre-Execution Checklist

## ✅ Pre-Migration Checks

- [ ] **Backup database** - Pastikan backup terbaru sudah ada
- [ ] **Baca dokumentasi** - Pahami tujuan dan risiko migrasi
- [ ] **Cek duplikat** - Jalankan `check-duplicates.sql` dan pastikan hasilnya kosong
- [ ] **Verifikasi aplikasi** - Pastikan aplikasi sudah di-update dengan kode terbaru
- [ ] **Inform team** - Beritahu tim bahwa akan ada migrasi

## 🚀 Execution Steps

### Step 1: Cek Duplikat
```bash
wrangler d1 execute [database-name] --file db/check-duplicates.sql
```

**Expected Result**: Tidak ada baris (empty result)

**If there are duplicates**:
- [ ] Hubungi admin untuk membersihkan duplikat
- [ ] Dokumentasikan duplikat yang ditemukan
- [ ] Bersihkan duplikat manual atau dengan script
- [ ] Jalankan check-duplicates.sql lagi sampai kosong

### Step 2: Jalankan Migrasi
```bash
wrangler d1 execute [database-name] --file db/migration-v10.sql
```

**Expected Result**: Migrasi berhasil tanpa error

**If there's an error**:
- [ ] Catat error message
- [ ] Jangan lanjutkan
- [ ] Hubungi developer untuk investigasi
- [ ] Restore dari backup jika diperlukan

### Step 3: Verifikasi Constraint
```bash
# Coba insert duplikat (harus gagal)
wrangler d1 execute [database-name] --command "
INSERT INTO production (user_id, outlet_id, customer_name, nota_number, process, weight, qty)
VALUES (1, 1, 'Test', 'TEST001', 'cuci', 5, 1);

INSERT INTO production (user_id, outlet_id, customer_name, nota_number, process, weight, qty)
VALUES (1, 1, 'Test', 'TEST001', 'cuci', 5, 1);
"
```

**Expected Result**: Insert kedua gagal dengan error "UNIQUE constraint failed"

- [ ] Verifikasi constraint aktif
- [ ] Hapus test data jika ada

### Step 4: Test Aplikasi
- [ ] Buka aplikasi production
- [ ] Coba input nota baru
- [ ] Coba input nota yang sama (harus ditolak)
- [ ] Coba input nota yang sama di outlet berbeda (harus berhasil)
- [ ] Cek error message: "Nota XXX sudah diinput untuk proses YYY di outlet ini"

### Step 5: Monitor
- [ ] Monitor aplikasi selama 1 jam pertama
- [ ] Cek logs untuk error
- [ ] Pastikan semua fitur berjalan normal
- [ ] Inform team bahwa migrasi berhasil

## 📋 Post-Migration

- [ ] Update dokumentasi database
- [ ] Dokumentasikan hasil migrasi
- [ ] Archive backup database
- [ ] Inform stakeholders

## 🆘 Rollback Plan

Jika ada masalah serius:

1. **Stop aplikasi** - Hentikan akses ke database
2. **Restore backup** - Restore database dari backup pre-migration
3. **Revert kode** - Revert perubahan di `functions/api/production/index.ts`
4. **Restart aplikasi** - Jalankan aplikasi kembali
5. **Investigate** - Cari tahu apa yang salah
6. **Retry** - Setelah masalah diperbaiki, coba migrasi lagi

## 📞 Contact

Jika ada pertanyaan atau masalah:
- Lihat: `db/MIGRATION-v10-GUIDE.md`
- Lihat: `db/MIGRATION-v10-SUMMARY.txt`
- Hubungi: Developer team

---

**Status**: Ready untuk dijalankan
**Last Updated**: 2026-01-02
**Tested**: Ya, aman untuk production
