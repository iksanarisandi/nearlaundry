# Design Document: Auto Nota Number

## Overview

Fitur auto-generate nomor nota untuk input produksi dengan format `{OUTLET_CODE}.{MMM}{YY}.{SEQUENCE}`. Sistem akan auto-generate prefix berdasarkan outlet dan bulan/tahun WITA, sementara user hanya perlu input sequence number.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (HTML/JS)                        │
├─────────────────────────────────────────────────────────────────┤
│  Admin: outlet.html          │  Staff: produksi.html            │
│  - Manage outlet codes       │  - Auto prefix display           │
│  - CRUD with code field      │  - Sequence input only           │
│                              │  - Last sequence display         │
└──────────────┬───────────────┴──────────────┬───────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐  ┌───────────────────────────────┐
│  /api/admin/outlets          │  │  /api/production              │
│  - GET / (with code)         │  │  - GET /nota-prefix           │
│  - POST / (with code)        │  │  - GET /last-sequence         │
│  - PUT /:id (with code)      │  │  - POST / (combine nota)      │
└──────────────┬───────────────┘  └──────────────┬────────────────┘
               │                                 │
               ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Utility Functions                             │
│  functions/_utils/nota.ts                                        │
│  - generateNotaPrefix(outletCode, date)                         │
│  - parseNotaNumber(notaNumber)                                  │
│  - generateOutletCode(outletName)                               │
│  - getMonthAbbreviation(month)                                  │
└──────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (D1 SQLite)                          │
│  outlets: id, name, address, latitude, longitude, code (NEW)    │
│  production: ... nota_number (existing)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Nota Utility Functions (`functions/_utils/nota.ts`)

```typescript
// Indonesian month abbreviations
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 
                    'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

/**
 * Generate outlet code from outlet name
 * Rules: First letter uppercase + number if present
 * Examples: "Uluwatu 2" -> "U2", "Outlet Pusat" -> "OP", "Cabang 1" -> "C1"
 */
function generateOutletCode(outletName: string): string;

/**
 * Generate nota prefix from outlet code and date
 * Format: {CODE}.{MMM}{YY}.
 * Example: generateNotaPrefix("U2", new Date("2026-01-15")) -> "U2.JAN26."
 */
function generateNotaPrefix(outletCode: string, date: Date): string;

/**
 * Get month abbreviation in Indonesian
 * Example: getMonthAbbreviation(0) -> "JAN", getMonthAbbreviation(4) -> "MEI"
 */
function getMonthAbbreviation(monthIndex: number): string;

/**
 * Parse nota number into components
 * Example: parseNotaNumber("U2.JAN26.001") -> { code: "U2", month: "JAN", year: "26", sequence: "001" }
 */
function parseNotaNumber(notaNumber: string): NotaParts | null;

/**
 * Validate nota number format
 * Returns true if format matches {CODE}.{MMM}{YY}.{SEQ}
 */
function isValidNotaFormat(notaNumber: string): boolean;
```

### 2. API Endpoints

#### GET /api/production/nota-prefix
Returns the current nota prefix for the logged-in user's outlet.

**Response:**
```json
{
  "prefix": "U2.JAN26.",
  "outlet_code": "U2",
  "month": "JAN",
  "year": "26"
}
```

#### GET /api/production/last-sequence?prefix={prefix}
Returns the last used sequence for a given prefix.

**Response:**
```json
{
  "last_sequence": "005",
  "prefix": "U2.JAN26."
}
```

#### Updated: POST /api/production
Accepts either:
- `nota_number`: Full nota number (backward compatible)
- `nota_sequence`: Sequence only (new format, combined with auto-prefix)

### 3. Database Schema Changes

```sql
-- Migration: Add code column to outlets
ALTER TABLE outlets ADD COLUMN code TEXT;

-- Create unique index for outlet codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_outlets_code ON outlets(code);

-- Auto-populate existing outlets (run once)
-- This will be handled by application code during migration
```

## Data Models

### NotaParts Interface
```typescript
interface NotaParts {
  code: string;      // Outlet code (e.g., "U2")
  month: string;     // Month abbreviation (e.g., "JAN")
  year: string;      // 2-digit year (e.g., "26")
  sequence: string;  // Sequence number (e.g., "001")
}
```

### Outlet (Updated)
```typescript
interface Outlet {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  code: string;  // NEW: Outlet code for nota generation
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Outlet Code Generation Determinism
*For any* outlet name string, calling `generateOutletCode()` multiple times should always produce the same result, and the result should contain only uppercase letters and digits with maximum 5 characters.
**Validates: Requirements 1.2, 1.5, 5.3**

### Property 2: Nota Prefix Format Validity
*For any* valid outlet code (uppercase letters + digits, max 5 chars) and any valid Date object, the generated nota prefix should match the regex pattern `^[A-Z0-9]{1,5}\.(JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES)\d{2}\.$`.
**Validates: Requirements 2.1, 2.2, 2.4**

### Property 3: Nota Number Round-Trip Parsing
*For any* valid nota number in format `{CODE}.{MMM}{YY}.{SEQ}`, parsing with `parseNotaNumber()` then reconstructing should produce the original nota number.
**Validates: Requirements 4.1**

### Property 4: Sequence Handling Correctness
*For any* valid prefix and sequence string (1-4 digits), combining them should produce a nota number where the sequence portion exactly matches the input (preserving leading zeros).
**Validates: Requirements 3.2, 3.3, 3.4**

### Property 5: Backward Compatibility
*For any* nota number string (old free-text format or new structured format), the production API should accept it without error when it doesn't violate uniqueness constraints.
**Validates: Requirements 6.1**

## Error Handling

| Error Condition | Response | HTTP Status |
|-----------------|----------|-------------|
| Outlet has no code set | "Kode outlet belum diset, hubungi admin" | 400 |
| Invalid sequence format | "Sequence harus berupa angka 1-4 digit" | 400 |
| Duplicate nota + process | "Nota {X} sudah diinput untuk proses {Y}" | 400 |
| Invalid nota format | "Format nota tidak valid" | 400 |
| Duplicate outlet code | "Kode outlet sudah digunakan" | 400 |

## Testing Strategy

### Unit Tests
- Test `generateOutletCode()` with various outlet names
- Test `generateNotaPrefix()` with different dates and codes
- Test `parseNotaNumber()` with valid and invalid formats
- Test `getMonthAbbreviation()` for all 12 months
- Test edge cases: empty strings, special characters, numbers only

### Property-Based Tests
- Property 1: Outlet code generation consistency
- Property 2: Nota prefix format validity
- Property 3: Nota number round-trip parsing
- Property 4: Month abbreviation mapping completeness
- Property 5: Sequence leading zero preservation

### Integration Tests
- Test API endpoint `/api/production/nota-prefix`
- Test API endpoint `/api/production/last-sequence`
- Test production creation with new nota format
- Test backward compatibility with old nota format

## Migration Strategy

### Phase 1: Add Column (Safe)
```sql
ALTER TABLE outlets ADD COLUMN code TEXT;
```
- Column is nullable, no data loss
- Existing functionality unaffected

### Phase 2: Auto-Populate Codes
- Application code generates codes for existing outlets
- Admin can review and adjust via UI

### Phase 3: Enable Feature
- Deploy new UI with auto-prefix
- Both old and new formats accepted

### Phase 4: (Optional) Make Code Required
- After all outlets have codes
- Add NOT NULL constraint if desired
