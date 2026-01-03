# Design Document: Currency Input Formatter

## Overview

Fitur ini menyediakan utility JavaScript untuk auto-format input nominal uang dengan pemisah ribuan (titik) di frontend. Utility ini akan diimplementasikan sebagai shared module yang dapat digunakan di seluruh halaman aplikasi dengan menambahkan attribute `data-currency` pada input field.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      HTML Pages                              │
│  (kasbon.html, pengeluaran.html, payroll.html, dll)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ <script src="/shared/currency.js">
                              │ <input data-currency>
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  public/shared/currency.js                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  NearMeCurrency                                      │    │
│  │  ├── formatCurrency(number) → string                 │    │
│  │  ├── parseCurrency(string) → number                  │    │
│  │  ├── initCurrencyInputs()                            │    │
│  │  └── attachToInput(inputElement)                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### NearMeCurrency Module

```javascript
// public/shared/currency.js
const NearMeCurrency = {
  /**
   * Format number to Indonesian thousand-separated string
   * @param {number} value - Raw integer value
   * @returns {string} Formatted string with dots (e.g., "1.500.000")
   */
  formatCurrency(value) { ... },

  /**
   * Parse formatted string back to integer
   * @param {string} formatted - Formatted string (e.g., "1.500.000")
   * @returns {number} Raw integer value (e.g., 1500000)
   */
  parseCurrency(formatted) { ... },

  /**
   * Attach currency formatting to a single input element
   * @param {HTMLInputElement} input - Input element to attach
   */
  attachToInput(input) { ... },

  /**
   * Initialize all inputs with data-currency attribute
   * Called automatically on DOMContentLoaded
   */
  initCurrencyInputs() { ... }
};
```

### HTML Usage Pattern

```html
<!-- Include the script -->
<script src="/shared/currency.js" defer></script>

<!-- Add data-currency attribute to input -->
<input type="text" id="amount" data-currency class="..." />

<!-- Get raw value for submission -->
<script>
  const rawValue = NearMeCurrency.parseCurrency(document.getElementById('amount').value);
</script>
```

### Input Type Consideration

Menggunakan `type="text"` dengan `inputmode="numeric"` untuk:
- Memungkinkan formatting dengan titik (type="number" tidak mengizinkan titik)
- Tetap menampilkan keyboard numerik di mobile
- Pattern attribute untuk validasi HTML5

```html
<input type="text" inputmode="numeric" pattern="[0-9.]*" data-currency />
```

## Data Models

### Input State

```typescript
interface CurrencyInputState {
  rawValue: number;        // Nilai integer tanpa format (1500000)
  displayValue: string;    // Nilai dengan format ("1.500.000")
  cursorPosition: number;  // Posisi cursor untuk UX
}
```

### Event Flow

```
User Types "1500000"
        │
        ▼
┌───────────────────┐
│  Input Event      │
│  value: "1500000" │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Filter non-digit │
│  "1500000"        │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Format with dots │
│  "1.500.000"      │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Update input     │
│  display value    │
└───────────────────┘
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Round-trip consistency

*For any* non-negative integer n, `parseCurrency(formatCurrency(n))` SHALL equal n.

**Validates: Requirements 3.1, 3.2**

### Property 2: Format produces valid thousand-separated string

*For any* non-negative integer n, `formatCurrency(n)` SHALL produce a string where:
- Contains only digits and dots
- Dots appear every 3 digits from the right
- No leading dots
- No consecutive dots

**Validates: Requirements 1.1, 1.2, 4.1, 4.2**

### Property 3: Parse filters non-digits

*For any* string s, `parseCurrency(s)` SHALL return a number equal to parsing only the digit characters in s.

**Validates: Requirements 2.1, 2.2, 2.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Empty input | Return 0 for parseCurrency, "" for formatCurrency(0) |
| Non-numeric paste | Strip non-digits, format remaining |
| Negative numbers | Treat as 0 (tidak ada nominal negatif) |
| Very large numbers | Format normally (JavaScript safe integer limit) |
| Decimal input | Ignore decimal part (integer only) |

## Testing Strategy

### Unit Tests

Unit tests akan memverifikasi contoh spesifik dan edge cases:

```javascript
// Specific examples
test('formatCurrency(1500000) returns "1.500.000"');
test('parseCurrency("1.500.000") returns 1500000');

// Edge cases
test('formatCurrency(0) returns "0"');
test('parseCurrency("") returns 0');
test('parseCurrency("abc") returns 0');
test('formatCurrency(999) returns "999" (no dots needed)');
test('formatCurrency(1000) returns "1.000"');
```

### Property-Based Tests

Property tests akan menggunakan fast-check library untuk memverifikasi properties di atas dengan banyak input random:

```javascript
// Property 1: Round-trip
fc.assert(fc.property(fc.nat(), (n) => {
  return NearMeCurrency.parseCurrency(NearMeCurrency.formatCurrency(n)) === n;
}));

// Property 2: Format validity
fc.assert(fc.property(fc.nat(), (n) => {
  const formatted = NearMeCurrency.formatCurrency(n);
  return /^[0-9.]*$/.test(formatted) && !formatted.startsWith('.') && !formatted.includes('..');
}));

// Property 3: Parse filters
fc.assert(fc.property(fc.string(), (s) => {
  const digitsOnly = s.replace(/[^0-9]/g, '');
  return NearMeCurrency.parseCurrency(s) === (parseInt(digitsOnly, 10) || 0);
}));
```

### Integration Testing

Manual testing di browser untuk:
- Keyboard input real-time formatting
- Paste behavior
- Mobile keyboard appearance
- Cursor position after formatting

## Implementation Notes

### Halaman yang perlu diupdate

1. `public/admin/kasbon.html` - input amount
2. `public/admin/pengeluaran.html` - input amount, edit-amount
3. `public/admin/payroll.html` - multiple salary inputs
4. `public/admin/payroll-v2.html` - multiple salary inputs
5. `public/produksi/pengeluaran.html` - input amount
6. `public/kurir/pengeluaran.html` (jika ada)

### Form Submission Pattern

Setiap form yang menggunakan currency input perlu mengupdate cara mengambil nilai:

```javascript
// Before (type="number")
const amount = Number(document.getElementById('amount').value);

// After (data-currency)
const amount = NearMeCurrency.parseCurrency(document.getElementById('amount').value);
```
