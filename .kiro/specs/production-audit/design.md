# Design Document: Production Audit

## Overview

Fitur Audit Produksi Bulanan menyediakan halaman admin untuk melihat, memverifikasi, mengedit, dan mengexport data produksi. Fitur ini menggunakan pattern yang sudah ada di codebase (Hono.js API, D1 database, timezone WITA handling) dengan penambahan tabel untuk edit history dan kolom baru untuk verification status.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (HTML/JS)                        │
│                    public/admin/audit-produksi.html              │
├─────────────────────────────────────────────────────────────────┤
│  Filter Form  │  Summary Stats  │  Data Table  │  Export Button │
└───────┬───────┴────────┬────────┴──────┬───────┴───────┬────────┘
        │                │               │               │
        ▼                ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Hono.js)                           │
│              functions/api/admin/production-audit.ts             │
├─────────────────────────────────────────────────────────────────┤
│ GET /list     │ PUT /:id    │ POST /verify  │ GET /export       │
│ GET /summary  │ GET /history│ POST /unverify│                   │
└───────┬───────┴──────┬──────┴───────┬───────┴───────┬───────────┘
        │              │              │               │
        ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database Layer (D1)                           │
├─────────────────────────────────────────────────────────────────┤
│  production (+ new columns)  │  production_edit_history (new)   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### API Endpoints

#### GET /api/admin/production-audit/list
Mengambil data produksi dengan filter.

**Query Parameters:**
- `month` (required): Format YYYY-MM
- `outlet_id` (optional): Filter by outlet
- `user_id` (optional): Filter by user
- `verified` (optional): "true" | "false" | "all" (default: "all")

**Response:**
```typescript
interface ProductionAuditItem {
  id: number;
  user_id: number;
  user_name: string;
  outlet_id: number;
  outlet_name: string;
  customer_name: string;
  nota_number: string;
  process: string;
  weight: number;
  qty: number;
  service_price: number;
  timestamp: string;
  timestamp_wita: string;
  verified_status: 'verified' | 'unverified';
  verified_by: number | null;
  verified_by_name: string | null;
  verified_at: string | null;
  edited_by_admin: number | null;
}
```

#### GET /api/admin/production-audit/summary
Mengambil statistik summary.

**Query Parameters:** Same as /list

**Response:**
```typescript
interface AuditSummary {
  total_weight: number;
  total_qty: number;
  total_notas: number;
  verified_notas: number;
  unverified_notas: number;
  per_user: Array<{
    user_id: number;
    user_name: string;
    total_weight: number;
    total_qty: number;
  }>;
}
```

#### PUT /api/admin/production-audit/:id
Edit production entry.

**Request Body:**
```typescript
interface EditProductionRequest {
  customer_name?: string;
  nota_number?: string;
  process?: string;
  weight?: number;
  qty?: number;
  service_price?: number;
}
```

**Response:**
```typescript
{ message: string }
```

#### POST /api/admin/production-audit/verify
Verify nota (all entries with same nota_number in same outlet).

**Request Body:**
```typescript
interface VerifyRequest {
  nota_number: string;
  outlet_id: number;
}
```

#### POST /api/admin/production-audit/unverify
Unverify nota.

**Request Body:** Same as verify

#### GET /api/admin/production-audit/history/:id
Get edit history for a production entry.

**Response:**
```typescript
interface EditHistoryItem {
  id: number;
  production_id: number;
  admin_id: number;
  admin_name: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  created_at: string;
  created_at_wita: string;
}
```

#### GET /api/admin/production-audit/export
Export data to CSV.

**Query Parameters:** Same as /list

**Response:** CSV file download

### Frontend Components

#### Filter Form
- Month picker (default: current month)
- Outlet dropdown (default: all)
- User dropdown (default: all)
- Verification status dropdown (all/verified/unverified)
- Search button

#### Summary Cards
- Total berat (kg)
- Total qty
- Nota terverifikasi / total nota
- Progress bar verifikasi

#### Data Table
- Grouped by nota_number
- Columns: Nota, Customer, Staff, Outlet, Process, Qty, Weight, Harga Jasa, Waktu, Status
- Row actions: Edit, History, Verify/Unverify
- Subtotal per nota

#### Edit Modal
- Form fields for all editable columns
- Save/Cancel buttons

#### History Modal
- Table showing edit history
- Columns: Admin, Waktu, Field, Nilai Lama, Nilai Baru

## Data Models

### Database Schema Changes

#### Alter table production (migration-v12.sql)
```sql
-- Add verification columns
ALTER TABLE production ADD COLUMN verified_status TEXT DEFAULT 'unverified' 
  CHECK (verified_status IN ('verified', 'unverified'));
ALTER TABLE production ADD COLUMN verified_by INTEGER REFERENCES users(id);
ALTER TABLE production ADD COLUMN verified_at TEXT;

-- Add admin edit lock column
ALTER TABLE production ADD COLUMN edited_by_admin INTEGER REFERENCES users(id);
```

#### New table: production_edit_history
```sql
CREATE TABLE IF NOT EXISTS production_edit_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  production_id INTEGER NOT NULL REFERENCES production(id),
  admin_id INTEGER NOT NULL REFERENCES users(id),
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_production_edit_history_production_id 
  ON production_edit_history(production_id);
```

### TypeScript Interfaces

```typescript
// functions/_utils/production-audit.ts

export interface ProductionEntry {
  id: number;
  user_id: number;
  outlet_id: number;
  customer_name: string;
  nota_number: string;
  process: string;
  weight: number;
  qty: number;
  service_price: number;
  timestamp: string;
  verified_status: 'verified' | 'unverified';
  verified_by: number | null;
  verified_at: string | null;
  edited_by_admin: number | null;
}

export interface EditHistoryEntry {
  id: number;
  production_id: number;
  admin_id: number;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API Response Structure Completeness

*For any* valid filter combination (month, outlet_id, user_id), the production audit list API response SHALL contain all required fields for each entry: id, user_id, user_name, outlet_id, outlet_name, customer_name, nota_number, process, weight, qty, service_price, timestamp, timestamp_wita, verified_status.

**Validates: Requirements 1.2, 1.3**

### Property 2: Verify/Unverify Round-Trip Consistency

*For any* nota_number and outlet_id combination, after a verify action followed by an unverify action, all production entries with that nota should return to unverified status, and the verified_by and verified_at fields should be updated to reflect the last action.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Edit Creates History Record

*For any* valid edit operation on a production entry, the system SHALL create exactly one edit history record per changed field, containing the correct admin_id, field_changed, old_value, and new_value.

**Validates: Requirements 3.2, 3.3**

### Property 4: Invalid Edit Rejection

*For any* edit request with invalid data (negative weight, negative qty, empty nota_number, empty customer_name), the system SHALL reject the request with an error response and the production entry SHALL remain unchanged.

**Validates: Requirements 3.4**

### Property 5: Admin Edit Locks Staff Edit

*For any* production entry where edited_by_admin is not null, staff edit requests for that entry SHALL be rejected with an appropriate error message.

**Validates: Requirements 3.5**

### Property 6: History Retrieval Completeness

*For any* production entry with edit history, the history endpoint SHALL return all history records with required fields: admin_name, created_at, field_changed, old_value, new_value.

**Validates: Requirements 4.1, 4.2**

### Property 7: CSV Export Format Validity

*For any* export request, the generated CSV SHALL use semicolon separator and contain all required columns: nota_number, user_name, outlet_name, process, qty, weight, service_price, timestamp_wita, verification_status.

**Validates: Requirements 5.1, 5.2, 5.4**

### Property 8: Summary Statistics Accuracy

*For any* filter combination, the summary statistics (total_weight, total_qty, verified_notas, unverified_notas) SHALL equal the aggregated values from the filtered production entries.

**Validates: Requirements 6.1, 6.2, 6.3**

## Error Handling

### API Error Responses

| Scenario | HTTP Status | Message |
|----------|-------------|---------|
| Missing month parameter | 400 | "Parameter month wajib (YYYY-MM)" |
| Invalid month format | 400 | "Format bulan tidak valid (YYYY-MM)" |
| Production entry not found | 404 | "Data produksi tidak ditemukan" |
| Invalid edit data | 400 | Specific validation message |
| Unauthorized (not admin) | 403 | "Akses ditolak" |

### Validation Rules

- `weight`: Must be >= 0 (can be 0 for cuci_satuan/cuci_sepatu)
- `qty`: Must be > 0
- `nota_number`: Must not be empty
- `customer_name`: Must not be empty
- `process`: Must be one of valid process types
- `service_price`: Must be >= 0

## Testing Strategy

### Unit Tests
- Validation functions for edit data
- CSV generation formatting
- Summary calculation logic

### Property-Based Tests
Using fast-check library for TypeScript:

1. **Property 1**: Generate random filter combinations, verify response structure
2. **Property 2**: Generate random nota operations, verify round-trip consistency
3. **Property 3**: Generate random edit operations, verify history creation
4. **Property 4**: Generate invalid edit data, verify rejection
5. **Property 5**: Generate staff edit attempts on admin-edited entries, verify rejection
6. **Property 6**: Generate entries with history, verify retrieval completeness
7. **Property 7**: Generate export requests, verify CSV format
8. **Property 8**: Generate filter combinations, verify summary accuracy

### Integration Tests
- Full workflow: filter → view → edit → verify → export
- Staff edit blocked after admin edit
- Concurrent verification handling
