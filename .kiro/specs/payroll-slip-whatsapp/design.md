# Design Document: Payroll Slip WhatsApp

## Overview

Fitur ini memungkinkan admin untuk mengirim slip gaji karyawan dalam bentuk gambar PNG melalui WhatsApp. Implementasi menggunakan pendekatan client-side yang simpel:

1. **html2canvas** - Library untuk mengkonversi elemen HTML slip gaji menjadi gambar PNG
2. **wa.me URL scheme** - WhatsApp Web API untuk membuka chat dengan nomor dan pesan yang sudah terisi
3. **Database migration** - Menambah kolom `phone` ke tabel users menggunakan ALTER TABLE

Flow utama:
1. Admin klik tombol "Kirim WA" di baris payroll
2. Sistem generate slip gaji dalam HTML dan convert ke PNG
3. Gambar otomatis ter-download
4. Modal muncul dengan preview dan tombol "Buka WhatsApp"
5. WhatsApp terbuka dengan nomor karyawan dan pesan template

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│  payroll-v2.html                                            │
│  ├── Tombol "Kirim WA" per karyawan                         │
│  ├── Modal slip preview                                      │
│  ├── html2canvas conversion                                  │
│  └── wa.me link generation                                   │
├─────────────────────────────────────────────────────────────┤
│  users.html                                                  │
│  └── Input field nomor telepon                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Cloudflare Workers)              │
├─────────────────────────────────────────────────────────────┤
│  /api/admin/users                                            │
│  └── CRUD dengan field phone                                 │
├─────────────────────────────────────────────────────────────┤
│  /api/payroll-v2                                             │
│  └── Include phone number dalam response                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (D1)                             │
├─────────────────────────────────────────────────────────────┤
│  users table                                                 │
│  └── + phone TEXT (nullable)                                 │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Migration (migration-v9.sql)

```sql
-- Migration v9: Add phone column to users table
-- Safe migration: only ADD COLUMN, no DROP or DELETE

ALTER TABLE users ADD COLUMN phone TEXT;
```

### 2. Phone Number Validation Utility

```typescript
interface PhoneValidation {
  isValid: boolean;
  normalized: string | null;  // Format: 62xxxxxxxxxx
  error?: string;
}

function validateAndNormalizePhone(phone: string): PhoneValidation
```

Validation rules:
- Accept formats: `08xxxxxxxxxx`, `+62xxxxxxxxxx`, `62xxxxxxxxxx`
- Normalize to: `62xxxxxxxxxx` (tanpa +)
- Length: 10-13 digit setelah kode negara

### 3. Slip Image Generator (Client-side)

```typescript
interface SlipData {
  name: string;
  phone: string | null;
  month: number;
  year: number;
  outletName: string;
  gaji_pokok: number;
  uang_makan: number;
  uang_transport: number;
  lembur_jam: number;
  lembur_jam_rate: number;
  lembur_libur: number;
  lembur_libur_rate: number;
  tunjangan_jabatan: number;
  thr: number;
  komisi_total: number;
  denda_terlambat: number;
  denda: number;
  kasbon: number;
  pendapatan: number;
  potongan: number;
  gaji_bersih: number;
}

async function generateSlipImage(data: SlipData): Promise<Blob>
```

### 4. WhatsApp Link Generator

```typescript
function generateWhatsAppLink(phone: string, employeeName: string, period: string): string
// Returns: https://wa.me/62xxx?text=encoded_message
```

### 5. UI Components

#### Modal Slip Preview
- Container untuk render slip HTML
- Tombol "Download Gambar"
- Tombol "Buka WhatsApp" (disabled jika tidak ada phone)
- Tombol "Tutup"

#### Slip HTML Template
- Header dengan logo dan nama perusahaan
- Info karyawan dan periode
- Tabel pendapatan
- Tabel potongan
- Total gaji bersih
- Footer dengan timestamp

## Data Models

### Users Table (Updated)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Nama karyawan |
| email | TEXT | Email (unique) |
| password_hash | TEXT | Hash password |
| role | TEXT | admin/gudang/produksi/kurir |
| outlet_id | INTEGER | FK ke outlets |
| join_date | TEXT | Tanggal mulai kerja |
| phone | TEXT | Nomor telepon (nullable, format 62xxx) |
| created_at | TEXT | Timestamp |

### Payroll Response (Updated)

```typescript
interface PayrollResponse {
  user_id: number;
  name: string;
  phone: string | null;  // NEW
  role: string;
  // ... existing fields
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following properties can be verified through property-based testing:

### Property 1: Phone validation accepts valid Indonesian formats
*For any* string that matches Indonesian phone patterns (08xxxxxxxxxx, +62xxxxxxxxxx, 62xxxxxxxxxx with 10-13 digits), the validation function SHALL return isValid: true.
**Validates: Requirements 1.2**

### Property 2: Phone normalization produces consistent format
*For any* valid Indonesian phone number input, the normalization function SHALL produce output in format 62xxxxxxxxxx (without + prefix, starting with 62).
**Validates: Requirements 1.3**

### Property 3: Phone validation round-trip consistency
*For any* valid phone number, normalizing it and then validating the normalized result SHALL return isValid: true.
**Validates: Requirements 1.2, 1.3**

### Property 4: Filename generation follows pattern
*For any* employee name, month (1-12), and year, the generated filename SHALL match pattern `slip_gaji_{sanitized_name}_{month_name}_{year}.png` where sanitized_name replaces spaces with underscores.
**Validates: Requirements 2.3**

### Property 5: WhatsApp URL contains phone number
*For any* valid normalized phone number, the generated WhatsApp URL SHALL start with `https://wa.me/` followed by the phone number.
**Validates: Requirements 3.2**

### Property 6: WhatsApp message contains employee info
*For any* employee name and period string, the generated WhatsApp message SHALL contain both the employee name and the period.
**Validates: Requirements 3.3**

### Property 7: Slip HTML contains required elements
*For any* valid SlipData object, the generated slip HTML SHALL contain: company name, employee name, period (month/year), and gaji_bersih value.
**Validates: Requirements 4.2**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Phone number invalid format | Show validation error, prevent save |
| Phone number empty | Allow save (nullable), disable WA button |
| html2canvas fails | Show error toast, suggest retry |
| WhatsApp not installed | Browser opens wa.me in new tab (web fallback) |
| Slip data incomplete | Show error, prevent generation |

## Testing Strategy

### Unit Tests
- Phone validation function with various formats
- Phone normalization function
- Filename generation function
- WhatsApp URL generation function

### Property-Based Tests
Using **fast-check** library for JavaScript/TypeScript:

1. **Phone validation property test** - Generate random strings matching Indonesian phone patterns, verify validation passes
2. **Phone normalization property test** - Generate valid phones, verify output format is always 62xxx
3. **Round-trip property test** - Normalize then validate, should always succeed
4. **Filename generation property test** - Generate random names/dates, verify pattern match
5. **WhatsApp URL property test** - Generate valid phones, verify URL structure
6. **WhatsApp message property test** - Generate random names/periods, verify content inclusion
7. **Slip HTML property test** - Generate random slip data, verify required elements present

Each property-based test SHALL run minimum 100 iterations.

### Integration Tests
- End-to-end flow: click button → generate image → download → open WhatsApp
- Database migration verification (phone column exists)
- API response includes phone field

### Test File Structure
```
functions/_utils/
├── phone.ts           # Phone validation & normalization
├── phone.test.ts      # Unit + property tests
├── slip.ts            # Slip generation utilities  
└── slip.test.ts       # Unit + property tests
```
