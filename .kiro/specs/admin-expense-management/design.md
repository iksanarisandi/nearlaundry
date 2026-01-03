# Design Document: Admin Expense Management

## Overview

Fitur ini menambahkan kemampuan bagi admin untuk mengelola data pengeluaran dari semua outlet. Admin dapat melihat, menambah, mengedit, dan menghapus pengeluaran melalui halaman dashboard admin baru.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (HTML/JS)                        │
│                 public/admin/pengeluaran.html                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Hono)                          │
│              functions/api/admin/expenses.ts                 │
│  GET /api/admin/expenses      - List expenses with filters   │
│  POST /api/admin/expenses     - Create new expense           │
│  PUT /api/admin/expenses/:id  - Update expense               │
│  DELETE /api/admin/expenses/:id - Delete expense             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (D1)                             │
│                    expenses table                            │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### API Endpoints

#### GET /api/admin/expenses

Query parameters:
- `date` (optional): Filter by WITA date (YYYY-MM-DD)
- `outlet_id` (optional): Filter by outlet ID
- `month` (optional): Filter by month (1-12)
- `year` (optional): Filter by year (YYYY)

Response:
```typescript
interface ExpenseListResponse {
  id: number;
  user_id: number;
  user_name: string;
  outlet_id: number;
  outlet_name: string;
  category: string;
  amount: number;
  timestamp: string;
  timestamp_wita: string;
}[]
```

#### POST /api/admin/expenses

Request body:
```typescript
interface CreateExpenseRequest {
  outlet_id: number;
  category: string;
  amount: number;
  date?: string; // Optional, defaults to now
}
```

Response:
```typescript
{ message: string }
```

#### PUT /api/admin/expenses/:id

Request body:
```typescript
interface UpdateExpenseRequest {
  category: string;
  amount: number;
}
```

Response:
```typescript
{ message: string }
```

#### DELETE /api/admin/expenses/:id

Response:
```typescript
{ message: string }
```

### Frontend Components

#### Halaman Admin Pengeluaran (public/admin/pengeluaran.html)

Komponen UI:
1. **Form Input Pengeluaran Baru**
   - Dropdown outlet
   - Dropdown kategori (BHP/DLL/GAS)
   - Conditional: subcategory untuk BHP, keterangan untuk DLL
   - Input nominal
   - Input tanggal (opsional)
   - Tombol simpan

2. **Filter Section**
   - Dropdown outlet (semua/per outlet)
   - Date picker atau month/year selector
   - Tombol filter

3. **Tabel Pengeluaran**
   - Kolom: Tanggal, Outlet, Staff, Kategori, Nominal, Aksi
   - Tombol Edit dan Hapus per row
   - Total nominal di footer

4. **Modal Edit**
   - Form edit dengan field kategori dan nominal
   - Tombol simpan dan batal

## Data Models

### Existing Table: expenses

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

Tidak perlu perubahan schema. Admin akan menggunakan user_id sendiri saat membuat expense baru.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Create expense round-trip

*For any* valid expense creation request with outlet_id, category (non-empty string), and amount > 0, creating the expense then fetching it by ID SHALL return the exact same outlet_id, category, and amount values.

**Validates: Requirements 2.1**

### Property 2: Filter correctness

*For any* filter combination (date and/or outlet_id), all returned expenses SHALL have:
- timestamp within the WITA date boundaries (if date filter applied)
- matching outlet_id (if outlet filter applied)

**Validates: Requirements 1.2, 1.3**

### Property 3: Edit preserves timestamp

*For any* expense edit operation that changes category or amount, the timestamp field of the expense SHALL remain unchanged after the update.

**Validates: Requirements 3.4**

### Property 4: Delete removes exactly one record

*For any* delete operation on a valid expense ID, fetching that expense after deletion SHALL return no results, while all other expenses SHALL remain unchanged.

**Validates: Requirements 4.2**

### Property 5: Invalid input rejection

*For any* create or update request with invalid data (empty category OR amount <= 0 OR missing outlet_id for create), the system SHALL return a 400 error and no database changes SHALL occur.

**Validates: Requirements 2.5, 3.3**

## Error Handling

| Error Condition | HTTP Status | Message |
|-----------------|-------------|---------|
| Missing category | 400 | "Kategori wajib diisi" |
| Amount <= 0 | 400 | "Nominal harus lebih dari 0" |
| Missing outlet_id | 400 | "Outlet wajib dipilih" |
| Expense not found | 404 | "Pengeluaran tidak ditemukan" |
| Unauthorized access | 403 | "Akses ditolak" |

## Testing Strategy

### Unit Tests
- Validasi input untuk create dan update expense
- Parsing filter parameters

### Integration Tests
- CRUD operations pada expenses table
- Filter by date dan outlet

### Property-Based Tests
- Property 1: Round-trip test untuk create expense
- Property 2: Filter correctness test
- Property 3: Timestamp preservation test
- Property 4: Delete isolation test

Testing framework: Vitest dengan fast-check untuk property-based testing
