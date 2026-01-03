# Best Practices: Timezone WIB dengan Cloudflare D1 SQLite

Panduan implementasi timezone WIB (UTC+7) untuk aplikasi Cloudflare Workers dengan D1 database.

## Prinsip Utama

1. **Simpan dalam UTC** - Database selalu menyimpan timestamp dalam UTC
2. **Konversi di aplikasi** - Konversi ke WIB dilakukan di Workers atau frontend
3. **Filter dengan boundaries** - Query berdasarkan tanggal WIB menggunakan UTC boundaries

## Schema Database

Gunakan format ISO 8601 dengan suffix 'Z' untuk timestamp:

```sql
CREATE TABLE example (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

## Utility Functions

Import dari `functions/_utils/timezone.ts`:

```typescript
import { 
  getTodayWib,           // Get current date in WIB (YYYY-MM-DD)
  getWibDateBoundaries,  // Get UTC boundaries for WIB date filtering
  formatTimestampWib,    // Format UTC timestamp to WIB display
  getWibDateFromTimestamp // Extract WIB date from UTC timestamp
} from '../../_utils/timezone';
```

## Pattern: Query Berdasarkan Tanggal WIB

Ketika user memilih tanggal (misal: 2025-01-03), gunakan boundaries:

```typescript
// API endpoint
app.get('/', async (c) => {
  const { date } = c.req.query(); // "2025-01-03" (WIB date)
  
  // Get UTC boundaries for WIB date
  const boundaries = getWibDateBoundaries(date);
  // boundaries.startUtc = "2025-01-02T17:00:00.000Z" (WIB 00:00)
  // boundaries.endUtc   = "2025-01-03T16:59:59.000Z" (WIB 23:59)
  
  const rows = await db.prepare(
    'SELECT * FROM table WHERE timestamp >= ? AND timestamp <= ?'
  ).bind(boundaries.startUtc, boundaries.endUtc).all();
  
  return c.json(rows.results);
});
```

## Pattern: Cek Duplikat Hari Ini (WIB)

```typescript
const todayWib = getTodayWib(); // "2025-01-03"
const boundaries = getWibDateBoundaries(todayWib);

const existing = await db.prepare(
  `SELECT id FROM attendance 
   WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?`
).bind(userId, boundaries.startUtc, boundaries.endUtc).first();

if (existing) {
  return c.json({ message: 'Sudah ada data hari ini' }, 400);
}
```

## Pattern: Validasi Edit/Hapus Hanya Hari Ini

```typescript
const entryDateWib = getWibDateFromTimestamp(entry.timestamp);
const todayWib = getTodayWib();

if (entryDateWib !== todayWib) {
  return c.json({ message: 'Hanya bisa edit data hari ini' }, 400);
}
```

## Pattern: Group by Bulan/Tanggal WIB di SQL

Untuk agregasi berdasarkan waktu WIB dalam SQL:

```sql
-- Group by bulan WIB
SELECT 
  strftime('%Y-%m', datetime(timestamp, '+7 hours')) as month,
  COUNT(*) as total
FROM production
GROUP BY month

-- Group by tanggal WIB
SELECT 
  DATE(datetime(timestamp, '+7 hours')) as date_wib,
  COUNT(*) as total
FROM attendance
GROUP BY date_wib
```

## Pattern: Response API dengan WIB Timestamp

Tambahkan field `_wib` untuk display:

```typescript
const results = rows.results.map((row: any) => ({
  ...row,
  timestamp_wib: formatTimestampWib(row.timestamp),
}));

return c.json(results);
```

## Frontend: Display Timestamp WIB

Selalu gunakan `timeZone: 'Asia/Jakarta'` dan pastikan timestamp memiliki 'Z' suffix:

```javascript
function formatWib(timestamp) {
  if (!timestamp) return '-';
  // Ensure Z suffix for proper UTC parsing
  const ts = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

## Frontend: Get Today in WIB

```javascript
function getTodayWib() {
  const now = new Date();
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return wibTime.toISOString().split('T')[0];
}
```

## Checklist Implementasi

### Backend (Workers)
- [ ] Import utility functions dari `_utils/timezone.ts`
- [ ] Gunakan `getWibDateBoundaries()` untuk filter tanggal
- [ ] Gunakan `getTodayWib()` untuk cek "hari ini"
- [ ] Gunakan `datetime(timestamp, '+7 hours')` untuk agregasi SQL
- [ ] Tambahkan field `_wib` di response untuk display

### Frontend (HTML/JS)
- [ ] Selalu tambahkan `timeZone: 'Asia/Jakarta'` di `toLocaleString()`
- [ ] Pastikan timestamp memiliki 'Z' suffix sebelum parsing
- [ ] Gunakan `getTodayWib()` untuk default date picker

## Contoh Lengkap

Lihat implementasi di:
- `functions/api/admin/attendance_all.ts` - Query dengan boundaries
- `functions/api/production/attendance.ts` - Cek duplikat hari ini
- `functions/api/production/index.ts` - Validasi edit hari ini
- `functions/api/admin/dashboard.ts` - Agregasi per bulan
- `public/admin/absensi.html` - Display timestamp WIB

## Troubleshooting

### Waktu tampil salah (selisih beberapa jam)
- Pastikan timestamp dari DB memiliki 'Z' suffix
- Pastikan `timeZone: 'Asia/Jakarta'` ada di `toLocaleString()`

### Data tidak muncul saat filter tanggal
- Pastikan menggunakan `getWibDateBoundaries()` bukan string comparison
- WIB 00:00 = UTC 17:00 hari sebelumnya

### Duplikat check tidak bekerja
- Pastikan menggunakan boundaries, bukan `DATE(timestamp)`
