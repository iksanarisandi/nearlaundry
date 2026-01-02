# Bugfix: Denda Keterlambatan Menghitung Record yang Dianulir

## Masalah
Sistem menghitung denda keterlambatan berdasarkan **semua record absensi**, termasuk yang sudah dianulir (status = 'annulled'). Ini menyebabkan perhitungan denda yang salah.

### Contoh Kasus: Yasinta D Wunga
- User memiliki 19 record absensi duplikat di tanggal 2 Januari 2026
- 18 record sudah dianulir, 1 record aktif
- Sistem menghitung: 19 hari terlambat × Rp 25.000 = **Rp 475.000** ❌
- Seharusnya: 1 hari terlambat × Rp 25.000 = **Rp 25.000** ✅

## Solusi
Menambahkan filter `AND status = 'active'` pada semua query perhitungan absensi di `functions/api/admin/payroll-new.ts`:

### Query yang Diperbaiki:
1. **Attendance count** - untuk menghitung hari kehadiran
2. **Late count** - untuk menghitung hari terlambat
3. **Work hours** - untuk menghitung jam kerja dan lembur

## Perubahan Kode

### File: `functions/api/admin/payroll-new.ts`

#### 1. Query Attendance Count
```typescript
// BEFORE
SELECT COUNT(DISTINCT DATE(timestamp)) as attendance_count
FROM attendance
WHERE user_id = ? AND type = 'in' AND strftime('%Y-%m', timestamp) = ?

// AFTER
SELECT COUNT(DISTINCT DATE(timestamp)) as attendance_count
FROM attendance
WHERE user_id = ? AND type = 'in' AND status = 'active' AND strftime('%Y-%m', timestamp) = ?
```

#### 2. Query Late Count
```typescript
// BEFORE
SELECT COUNT(*) as late_count
FROM attendance
WHERE user_id = ? AND type = 'in' AND strftime('%Y-%m', timestamp) = ? AND (...)

// AFTER
SELECT COUNT(*) as late_count
FROM attendance
WHERE user_id = ? AND type = 'in' AND status = 'active' AND strftime('%Y-%m', timestamp) = ? AND (...)
```

#### 3. Query Work Hours
```typescript
// BEFORE
FROM attendance a_in
LEFT JOIN attendance a_out ON a_in.user_id = a_out.user_id 
  AND DATE(a_in.timestamp) = DATE(a_out.timestamp)
  AND a_out.type = 'out'
WHERE a_in.user_id = ? AND a_in.type = 'in' AND strftime('%Y-%m', a_in.timestamp) = ?

// AFTER
FROM attendance a_in
LEFT JOIN attendance a_out ON a_in.user_id = a_out.user_id 
  AND DATE(a_in.timestamp) = DATE(a_out.timestamp)
  AND a_out.type = 'out'
  AND a_out.status = 'active'
WHERE a_in.user_id = ? AND a_in.type = 'in' AND a_in.status = 'active' AND strftime('%Y-%m', a_in.timestamp) = ?
```

## Verifikasi

### Sebelum Fix:
```sql
-- Total record (termasuk annulled)
SELECT COUNT(*) FROM attendance WHERE user_id = 10 AND type = 'in' AND strftime('%Y-%m', timestamp) = '2026-01'
-- Result: 19 ❌

-- Denda: 19 × Rp 25.000 = Rp 475.000 ❌
```

### Setelah Fix:
```sql
-- Total record aktif saja
SELECT COUNT(*) FROM attendance WHERE user_id = 10 AND type = 'in' AND status = 'active' AND strftime('%Y-%m', timestamp) = '2026-01'
-- Result: 1 ✅

-- Denda: 1 × Rp 25.000 = Rp 25.000 ✅
```

## Testing
- ✅ Unit test `allowance.test.ts` passed (23 tests)
- ✅ Deployed to production
- ✅ Verified dengan database produksi

## Impact
- Perhitungan denda keterlambatan sekarang akurat
- Hanya menghitung absensi yang aktif (tidak dianulir)
- Konsisten dengan fitur attendance annulment

## Tanggal
2 Januari 2026
