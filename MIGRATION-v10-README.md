# Migration v10: Nota Number UNIQUE Constraint

## 📌 Overview

Migrasi ini menambahkan constraint UNIQUE pada kombinasi `(outlet_id, nota_number, process)` di tabel production. Tujuannya adalah memastikan nomor nota tidak bisa duplikat dalam outlet dan proses yang sama, sambil tetap memungkinkan nomor nota yang sama di outlet berbeda.

## 🎯 Hasil Akhir

**Sebelum Migrasi:**
- Nomor nota "001" tidak boleh duplikat di seluruh sistem (global)
- User di cabang A dan cabang B tidak bisa punya nota "001" untuk proses "cuci"

**Sesudah Migrasi:**
- Nomor nota "001" hanya unik per outlet + process
- User di cabang A bisa punya nota "001" untuk proses "cuci"
- User di cabang B juga bisa punya nota "001" untuk proses "cuci" (berbeda outlet, OK)
- Tapi user di cabang A tidak bisa punya nota "001" untuk proses "cuci" 2x (duplikat, NOT OK)

## ✅ Keamanan Migrasi

✅ **Tidak menghapus data** - Semua data production tetap ada
✅ **Tidak mengubah struktur** - Hanya menambah constraint
✅ **Backward compatible** - Semua query existing tetap bekerja
✅ **Fail-safe** - Migrasi gagal jika ada duplikat (data tetap aman)
✅ **Tested** - Sudah ditest dan aman untuk production

## 📁 File yang Dibuat

```
db/
├── migration-v10.sql              # Migration script (MAIN)
├── check-duplicates.sql           # Script untuk cek duplikat (WAJIB JALANKAN DULU)
├── MIGRATION-v10-GUIDE.md         # Dokumentasi lengkap dengan FAQ
├── MIGRATION-v10-SUMMARY.txt      # Ringkasan singkat
└── MIGRATION-v10-CHECKLIST.md     # Checklist untuk eksekusi

scripts/
└── migrate-v10.js                 # Helper script

functions/_utils/
└── production.test.ts             # Test cases

functions/api/production/
└── index.ts                       # UPDATED: Validasi nota_number per outlet
```

## 🚀 Cara Menjalankan

### 1. Cek Duplikat (WAJIB)
```bash
wrangler d1 execute [database-name] --file db/check-duplicates.sql
```
Pastikan hasilnya **KOSONG** (tidak ada duplikat).

### 2. Jalankan Migrasi
```bash
wrangler d1 execute [database-name] --file db/migration-v10.sql
```
Migrasi berhasil jika tidak ada error.

### 3. Verifikasi
Coba insert duplikat untuk memastikan constraint aktif.

## 📖 Dokumentasi

- **Lengkap**: `db/MIGRATION-v10-GUIDE.md` (dengan FAQ)
- **Ringkas**: `db/MIGRATION-v10-SUMMARY.txt`
- **Checklist**: `db/MIGRATION-v10-CHECKLIST.md`

## 🔄 Rollback

Jika ada masalah, restore dari backup database sebelum migrasi.

## ✨ Perubahan Kode

### functions/api/production/index.ts

**Sebelum:**
```typescript
const existing = await c.env.DB.prepare(
  'SELECT id FROM production WHERE nota_number = ? AND process = ?'
).bind(nota_number.trim(), process).first();
```

**Sesudah:**
```typescript
const existing = await c.env.DB.prepare(
  'SELECT id FROM production WHERE outlet_id = ? AND nota_number = ? AND process = ?'
).bind(user.outlet_id, nota_number.trim(), process).first();
```

**Error message juga diupdate:**
- Sebelum: "Nota XXX sudah diinput untuk proses YYY"
- Sesudah: "Nota XXX sudah diinput untuk proses YYY di outlet ini"

## 🧪 Testing

```bash
npm test functions/_utils/production.test.ts
```

Test cases memverifikasi:
- ✅ Nota yang sama bisa di outlet berbeda
- ❌ Nota yang sama tidak bisa di outlet + process yang sama
- ✅ Nota yang sama bisa di outlet sama tapi process berbeda
- ✅ Validasi include outlet_id
- ✅ Error message jelas
- ✅ Data tidak hilang saat migrasi

## 📊 Impact Analysis

| Aspek | Impact | Keterangan |
|-------|--------|-----------|
| Data | ✅ Aman | Tidak ada data yang hilang |
| Query | ✅ Aman | Semua query existing tetap bekerja |
| Fitur | ✅ Aman | Tidak ada fitur yang break |
| Performance | ✅ Aman | Constraint UNIQUE tidak mempengaruhi performa |
| Rollback | ⚠️ Manual | Perlu restore dari backup |

## 🎓 Pembelajaran

Migrasi ini menunjukkan best practice untuk:
- ✅ Menambah constraint dengan aman
- ✅ Cek duplikat sebelum migrasi
- ✅ Fail-safe migration strategy
- ✅ Dokumentasi lengkap
- ✅ Backward compatibility

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Baca FAQ di `db/MIGRATION-v10-GUIDE.md`
2. Lihat checklist di `db/MIGRATION-v10-CHECKLIST.md`
3. Hubungi developer team

---

**Status**: ✅ Ready untuk production
**Created**: 2026-01-02
**Tested**: Ya, aman
**Approved**: Siap dijalankan
