# Best Practices: Timezone WITA dengan Cloudflare D1 SQLite

Panduan implementasi timezone WITA (UTC+8) untuk aplikasi Cloudflare Workers dengan D1 database.

## Prinsip Utama

1. **Simpan dalam UTC** - Database selalu menyimpan timestamp dalam UTC
2. **Konversi di aplikasi** - Konversi ke WITA dilakukan di Workers atau frontend
3. **Filter dengan boundaries** - Query berdasarkan tanggal WITA menggunakan UTC boundaries

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
  getTodayWita,           // Get current date in WITA (YYYY-MM-DD)
  getWitaDateBoundaries,  // Get UTC boundaries for WITA date filtering
  formatTimestampWita,    // Format UTC timestamp to WITA display
  getWitaDateFromTimestamp // Extract WITA date from UTC timestamp
} from '../../_utils/timezone';
```

## Pattern: Query Berdasarkan Tanggal WITA

Ketika user memilih tanggal (misal: 2025-01-03), gunakan boundaries:

```typescript
// API endpoint
app.get('/', async (c) => {
  const { date } = c.req.query(); // "2025-01-03" (WITA date)
  
  // Get UTC boundaries for WITA date
  const boundaries = getWitaDateBoundaries(date);
  // boundaries.startUtc = "2025-01-02T16:00:00.000Z" (WITA 00:00)
  // boundaries.endUtc   = "2025-01-03T15:59:59.000Z" (WITA 23:59)
  
  const rows = await db.prepare(
    'SELECT * FROM table WHERE timestamp >= ? AND timestamp <= ?'
  ).bind(boundaries.startUtc, boundaries.endUtc).all();
  
  return c.json(rows.results);
});
```

## Pattern: Cek Duplikat Hari Ini (WITA)

```typescript
const todayWita = getTodayWita(); // "2025-01-03"
const boundaries = getWitaDateBoundaries(todayWita);

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
const entryDateWita = getWitaDateFromTimestamp(entry.timestamp);
const todayWita = getTodayWita();

if (entryDateWita !== todayWita) {
  return c.json({ message: 'Hanya bisa edit data hari ini' }, 400);
}
```

## Pattern: Group by Bulan/Tanggal WITA di SQL

Untuk agregasi berdasarkan waktu WITA dalam SQL:

```sql
-- Group by bulan WITA
SELECT 
  strftime('%Y-%m', datetime(timestamp, '+8 hours')) as month,
  COUNT(*) as total
FROM production
GROUP BY month

-- Group by tanggal WITA
SELECT 
  DATE(datetime(timestamp, '+8 hours')) as date_wita,
  COUNT(*) as total
FROM attendance
GROUP BY date_wita
```

## Pattern: Response API dengan WITA Timestamp

Tambahkan field `_wita` untuk display:

```typescript
const results = rows.results.map((row: any) => ({
  ...row,
  timestamp_wita: formatTimestampWita(row.timestamp),
}));

return c.json(results);
```

## Frontend: Display Timestamp WITA

Selalu gunakan `timeZone: 'Asia/Makassar'` dan pastikan timestamp memiliki 'Z' suffix:

```javascript
function formatWita(timestamp) {
  if (!timestamp) return '-';
  // Ensure Z suffix for proper UTC parsing
  const ts = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

## Frontend: Get Today in WITA

```javascript
function getTodayWita() {
  const now = new Date();
  const witaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return witaTime.toISOString().split('T')[0];
}
```

## Checklist Implementasi

### Backend (Workers)
- [ ] Import utility functions dari `_utils/timezone.ts`
- [ ] Gunakan `getWitaDateBoundaries()` untuk filter tanggal
- [ ] Gunakan `getTodayWita()` untuk cek "hari ini"
- [ ] Gunakan `datetime(timestamp, '+8 hours')` untuk agregasi SQL
- [ ] Tambahkan field `_wita` di response untuk display

### Frontend (HTML/JS)
- [ ] Selalu tambahkan `timeZone: 'Asia/Makassar'` di `toLocaleString()`
- [ ] Pastikan timestamp memiliki 'Z' suffix sebelum parsing
- [ ] Gunakan `getTodayWita()` untuk default date picker

## Contoh Lengkap

Lihat implementasi di:
- `functions/api/admin/attendance_all.ts` - Query dengan boundaries
- `functions/api/production/attendance.ts` - Cek duplikat hari ini
- `functions/api/production/index.ts` - Validasi edit hari ini
- `functions/api/admin/dashboard.ts` - Agregasi per bulan
- `public/admin/absensi.html` - Display timestamp WITA

## Troubleshooting

### Waktu tampil salah (selisih beberapa jam)
- Pastikan timestamp dari DB memiliki 'Z' suffix
- Pastikan `timeZone: 'Asia/Makassar'` ada di `toLocaleString()`

### Data tidak muncul saat filter tanggal
- Pastikan menggunakan `getWitaDateBoundaries()` bukan string comparison
- WITA 00:00 = UTC 16:00 hari sebelumnya

### Duplikat check tidak bekerja
- Pastikan menggunakan boundaries, bukan `DATE(timestamp)`

## Perbedaan WIB vs WITA

| Timezone | Offset | JavaScript timeZone | SQL Offset |
|----------|--------|---------------------|------------|
| WIB      | UTC+7  | Asia/Jakarta        | +7 hours   |
| WITA     | UTC+8  | Asia/Makassar       | +8 hours   |
| WIT      | UTC+9  | Asia/Jayapura       | +9 hours   |
