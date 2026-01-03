# Design Document: WIB Timezone Handling

## Overview

This design implements consistent timezone handling for a Cloudflare Workers application with D1 database. The system stores all timestamps in UTC format in the database while presenting and accepting times in WIB (UTC+7) timezone for Indonesian users. This approach ensures data consistency across serverless environments while providing a localized user experience.

The design uses native JavaScript Date API with `toLocaleString()` for timezone conversion, avoiding external dependencies. All conversion logic is centralized in utility functions to ensure consistency across the application.

## Architecture

### High-Level Flow

```
Client (WIB) → Workers (Convert to UTC) → D1 Database (UTC)
                                              ↓
Client (WIB) ← Workers (Convert to WIB) ← D1 Database (UTC)
```

### Component Layers

1. **Client Layer**: Captures local time, sends ISO 8601 timestamps, displays WIB-formatted times
2. **Workers Layer**: Handles timezone conversion, validates timestamps, queries database
3. **Database Layer**: Stores UTC timestamps, provides raw data
4. **Utility Layer**: Centralized timezone conversion functions

## Components and Interfaces

### 1. Timezone Utility Module (`functions/_utils/timezone.ts`)

This module provides all timezone conversion and formatting functions.

#### Interface

```typescript
/**
 * Convert UTC Date to WIB timezone
 * @param utcDate - Date object in UTC
 * @returns Date object adjusted to WIB (UTC+7)
 */
export function utcToWib(utcDate: Date): Date

/**
 * Convert WIB Date to UTC timezone
 * @param wibDate - Date object in WIB
 * @returns Date object adjusted to UTC
 */
export function wibToUtc(wibDate: Date): Date

/**
 * Format Date to Indonesian locale string in WIB timezone
 * @param date - Date object to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted string in Indonesian locale
 */
export function formatWib(date: Date, options?: Intl.DateTimeFormatOptions): string

/**
 * Get WIB date boundaries for a given date string
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Object with startUtc and endUtc ISO strings
 */
export function getWibDateBoundaries(dateString: string): {
  startUtc: string;
  endUtc: string;
}

/**
 * Parse ISO string and convert to WIB Date
 * @param isoString - ISO 8601 timestamp string
 * @returns Date object in WIB timezone
 */
export function parseIsoToWib(isoString: string): Date

/**
 * Validate timestamp is within reasonable range
 * @param date - Date object to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimestamp(date: Date): boolean
```

#### Implementation Details

**UTC to WIB Conversion:**
```typescript
export function utcToWib(utcDate: Date): Date {
  // Use toLocaleString with Asia/Jakarta timezone
  const wibString = utcDate.toLocaleString('sv-SE', { 
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse back to Date object
  return new Date(wibString + '+07:00');
}
```

**WIB to UTC Conversion:**
```typescript
export function wibToUtc(wibDate: Date): Date {
  // Get time components in WIB
  const wibString = wibDate.toLocaleString('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Create UTC date by parsing with +07:00 offset
  const utcDate = new Date(wibString + '+07:00');
  return new Date(utcDate.toISOString());
}
```

**Date Boundaries for Filtering:**
```typescript
export function getWibDateBoundaries(dateString: string): {
  startUtc: string;
  endUtc: string;
} {
  // Parse date string (YYYY-MM-DD)
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create WIB start of day (00:00:00)
  const wibStart = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`);
  
  // Create WIB end of day (23:59:59)
  const wibEnd = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59+07:00`);
  
  return {
    startUtc: wibStart.toISOString(),
    endUtc: wibEnd.toISOString()
  };
}
```

**Validation:**
```typescript
export function isValidTimestamp(date: Date): boolean {
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return false;
  }
  
  // Check reasonable range (not before 2020, not more than 1 year in future)
  const minDate = new Date('2020-01-01T00:00:00Z');
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  
  return date >= minDate && date <= maxDate;
}
```

### 2. Attendance API Modifications

#### Attendance Submission Endpoint

**File**: `functions/api/production/attendance.ts`

**Changes**:
- Accept ISO 8601 timestamp from client
- Convert to UTC before database insertion
- Validate timestamp
- Return WIB-formatted confirmation

**Pseudocode**:
```
FUNCTION handleAttendanceSubmission(request):
  // Parse request
  body = parseJSON(request.body)
  clientTimestamp = body.timestamp
  userId = body.userId
  
  // Validate and convert
  clientDate = new Date(clientTimestamp)
  IF NOT isValidTimestamp(clientDate):
    RETURN error(400, "Invalid timestamp")
  
  // Convert to UTC for storage
  utcTimestamp = clientDate.toISOString()
  
  // Insert to database
  result = database.execute(
    "INSERT INTO absensi (user_id, waktu_utc) VALUES (?, ?)",
    [userId, utcTimestamp]
  )
  
  // Return WIB-formatted response
  wibFormatted = formatWib(clientDate)
  RETURN success({
    message: "Attendance recorded",
    timestamp: wibFormatted
  })
```

#### Attendance Query Endpoint

**File**: `functions/api/admin/attendance_all.ts`

**Changes**:
- Accept date filter in YYYY-MM-DD format
- Convert to UTC boundaries for querying
- Convert results to WIB for display

**Pseudocode**:
```
FUNCTION handleAttendanceQuery(request):
  // Parse query parameters
  dateFilter = request.query.date // YYYY-MM-DD format
  
  // Get UTC boundaries for WIB date
  boundaries = getWibDateBoundaries(dateFilter)
  
  // Query database with UTC boundaries
  results = database.execute(
    "SELECT * FROM absensi WHERE waktu_utc >= ? AND waktu_utc <= ?",
    [boundaries.startUtc, boundaries.endUtc]
  )
  
  // Convert each result to WIB for display
  FOR EACH record IN results:
    utcDate = new Date(record.waktu_utc)
    record.waktu_wib = formatWib(utcDate, {
      dateStyle: 'medium',
      timeStyle: 'medium'
    })
  
  RETURN success(results)
```

### 3. Client-Side Changes

#### Attendance Submission

**Files**: 
- `public/produksi/absen.html`
- `public/kurir/absen.html`

**Changes**:
- Capture current time using `new Date().toISOString()`
- Send ISO 8601 timestamp to server
- Display confirmation in WIB format

**Pseudocode**:
```javascript
FUNCTION submitAttendance():
  // Capture current time
  currentTime = new Date().toISOString()
  
  // Send to server
  response = fetch('/api/production/attendance', {
    method: 'POST',
    body: JSON.stringify({
      userId: currentUserId,
      timestamp: currentTime
    })
  })
  
  // Display confirmation
  IF response.ok:
    data = response.json()
    showMessage("Absensi berhasil: " + data.timestamp)
```

#### Attendance Display

**File**: `public/admin/absensi.html`

**Changes**:
- Display timestamps in WIB format
- Use Indonesian locale for date formatting

**Pseudocode**:
```javascript
FUNCTION displayAttendance(records):
  FOR EACH record IN records:
    // Server already converted to WIB
    displayRow({
      name: record.user_name,
      time: record.waktu_wib,
      status: record.status
    })
```

### 4. Database Schema

**No changes required** - existing schema already uses DATETIME columns with UTC storage.

**Existing schema** (from `db/schema.sql`):
```sql
CREATE TABLE absensi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  waktu_utc DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Optional enhancement** - Add computed column for WIB display:
```sql
ALTER TABLE absensi ADD COLUMN waktu_wib_display TEXT 
  GENERATED ALWAYS AS (datetime(waktu_utc, '+7 hours')) VIRTUAL;
```

## Data Models

### Timestamp Storage Format

**Database**: ISO 8601 UTC string
```
2025-01-02T10:30:00.000Z
```

**Client Display**: Indonesian locale with WIB timezone
```
2 Januari 2025 pukul 17.30.00 WIB
```

### API Request/Response Format

**Attendance Submission Request**:
```json
{
  "userId": 123,
  "timestamp": "2025-01-02T10:30:00.000Z",
  "type": "masuk"
}
```

**Attendance Submission Response**:
```json
{
  "success": true,
  "message": "Attendance recorded",
  "timestamp": "2 Januari 2025 pukul 17.30 WIB",
  "id": 456
}
```

**Attendance Query Request**:
```
GET /api/admin/attendance_all?date=2025-01-02
```

**Attendance Query Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "user_id": 123,
      "user_name": "John Doe",
      "waktu_utc": "2025-01-02T10:30:00.000Z",
      "waktu_wib": "2 Januari 2025 pukul 17.30 WIB",
      "status": "masuk"
    }
  ]
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: UTC Storage Round-Trip

*For any* valid Date object, when converted to ISO string and stored in the database, then retrieved and parsed, the resulting timestamp should be equivalent to the original UTC time.

**Validates: Requirements 1.1, 1.3**

### Property 2: ISO 8601 Format Validation

*For any* timestamp generated by the client submission function, the output string should match the ISO 8601 format pattern (YYYY-MM-DDTHH:mm:ss.sssZ or with timezone offset).

**Validates: Requirements 2.1**

### Property 3: UTC to WIB Conversion Adds 7 Hours

*For any* valid UTC Date object, converting it to WIB timezone should result in a time that is exactly 7 hours ahead of the UTC time.

**Validates: Requirements 3.1, 5.1**

### Property 4: WIB to UTC Conversion Subtracts 7 Hours

*For any* valid WIB Date object, converting it to UTC timezone should result in a time that is exactly 7 hours behind the WIB time.

**Validates: Requirements 3.2, 5.2**

### Property 5: Round-Trip Conversion Preserves Time

*For any* valid Date object, converting UTC → WIB → UTC (or WIB → UTC → WIB) should result in the same timestamp as the original.

**Validates: Requirements 3.1, 3.2**

### Property 6: WIB Date Boundaries Calculation

*For any* date string in YYYY-MM-DD format, the calculated UTC boundaries should start at 17:00:00 of the previous day and end at 16:59:59 of the current day (accounting for the -7 hour offset from WIB to UTC).

**Validates: Requirements 4.1**

### Property 7: Indonesian Locale Formatting Contains Expected Elements

*For any* valid Date object, when formatted with Indonesian locale and WIB timezone, the resulting string should contain Indonesian month names (Januari, Februari, etc.) and proper time formatting.

**Validates: Requirements 5.3**

### Property 8: Invalid Input Error Handling

*For any* invalid input (null, undefined, invalid date string, or malformed timestamp), the utility functions should throw descriptive errors or return error responses with appropriate HTTP status codes.

**Validates: Requirements 3.4, 5.5, 7.1**

### Property 9: Timestamp Range Validation

*For any* timestamp, the validation function should accept dates between 2020-01-01 and one year in the future, and reject dates outside this range.

**Validates: Requirements 7.3**

### Property 10: Multiple Timestamp Format Support

*For any* valid timestamp format (ISO with Z, ISO with +00:00, ISO with other offsets), the parsing function should correctly interpret and convert to UTC.

**Validates: Requirements 6.4**

## Error Handling

### Validation Errors

**Invalid Timestamp Format**:
- HTTP Status: 400 Bad Request
- Error Message: "Invalid timestamp format. Expected ISO 8601 format."
- Example: `{"error": "Invalid timestamp format", "received": "2025-13-45"}`

**Timestamp Out of Range**:
- HTTP Status: 400 Bad Request
- Error Message: "Timestamp out of valid range. Must be between 2020-01-01 and [current_date + 1 year]."
- Example: `{"error": "Timestamp out of range", "timestamp": "2019-01-01T00:00:00Z"}`

**Missing Required Fields**:
- HTTP Status: 400 Bad Request
- Error Message: "Missing required field: timestamp"
- Example: `{"error": "Missing required field", "field": "timestamp"}`

### Conversion Errors

**Timezone Conversion Failure**:
- HTTP Status: 500 Internal Server Error
- Error Message: "Failed to convert timezone"
- Logging: Log full error stack with input timestamp
- Example: `{"error": "Timezone conversion failed", "details": "..."}`

### Database Errors

**Database Insert Failure**:
- HTTP Status: 500 Internal Server Error
- Error Message: "Failed to record attendance"
- Logging: Log database error with query details
- Example: `{"error": "Database operation failed"}`

**Database Query Failure**:
- HTTP Status: 500 Internal Server Error
- Error Message: "Failed to retrieve attendance records"
- Logging: Log database error with query details

### Error Handling Strategy

1. **Input Validation**: Validate all timestamps before processing
2. **Early Return**: Return errors immediately upon validation failure
3. **Descriptive Messages**: Provide clear error messages for debugging
4. **Logging**: Log all errors with context for troubleshooting
5. **Graceful Degradation**: Never expose internal errors to clients

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

**Timezone Conversion Tests**:
- Test specific known conversions (e.g., "2025-01-02T10:00:00Z" → "2025-01-02T17:00:00+07:00")
- Test midnight boundaries (00:00:00 WIB → 17:00:00 previous day UTC)
- Test end of day (23:59:59 WIB → 16:59:59 current day UTC)
- Test daylight saving time (WIB doesn't observe DST, should remain UTC+7)

**Date Boundary Tests**:
- Test specific date: "2025-01-02" → startUtc: "2025-01-01T17:00:00Z", endUtc: "2025-01-02T16:59:59Z"
- Test month boundaries (last day of month, first day of month)
- Test year boundaries (December 31, January 1)

**Format Validation Tests**:
- Test valid ISO 8601 formats
- Test invalid formats (missing T, wrong separators, etc.)
- Test edge cases (leap seconds, milliseconds)

**Error Handling Tests**:
- Test null input
- Test undefined input
- Test empty string
- Test malformed date strings
- Test dates outside valid range

### Property-Based Testing

Property-based tests will verify universal properties across many generated inputs using a TypeScript property-based testing library (fast-check or jsverify).

**Configuration**:
- Minimum 100 iterations per property test
- Use random date generation within valid ranges
- Test with various timezone offsets

**Property Test Suite**:

1. **UTC Storage Round-Trip** (Property 1)
   - Generate random valid dates
   - Convert to ISO string, parse back
   - Verify timestamps are equivalent
   - Tag: `Feature: timezone-wib-handling, Property 1: UTC storage round-trip`

2. **ISO 8601 Format** (Property 2)
   - Generate random dates
   - Convert to ISO string
   - Verify format matches regex pattern
   - Tag: `Feature: timezone-wib-handling, Property 2: ISO 8601 format validation`

3. **UTC to WIB Adds 7 Hours** (Property 3)
   - Generate random UTC dates
   - Convert to WIB
   - Verify difference is exactly 7 hours
   - Tag: `Feature: timezone-wib-handling, Property 3: UTC to WIB conversion adds 7 hours`

4. **WIB to UTC Subtracts 7 Hours** (Property 4)
   - Generate random WIB dates
   - Convert to UTC
   - Verify difference is exactly -7 hours
   - Tag: `Feature: timezone-wib-handling, Property 4: WIB to UTC conversion subtracts 7 hours`

5. **Round-Trip Conversion** (Property 5)
   - Generate random dates
   - Convert UTC → WIB → UTC
   - Verify result equals original
   - Tag: `Feature: timezone-wib-handling, Property 5: Round-trip conversion preserves time`

6. **Date Boundaries Calculation** (Property 6)
   - Generate random date strings
   - Calculate boundaries
   - Verify start is 17:00:00 previous day UTC
   - Verify end is 16:59:59 current day UTC
   - Tag: `Feature: timezone-wib-handling, Property 6: WIB date boundaries calculation`

7. **Indonesian Locale Formatting** (Property 7)
   - Generate random dates
   - Format with Indonesian locale
   - Verify contains Indonesian month names
   - Verify proper structure
   - Tag: `Feature: timezone-wib-handling, Property 7: Indonesian locale formatting`

8. **Invalid Input Errors** (Property 8)
   - Generate invalid inputs (null, undefined, malformed strings)
   - Verify functions throw errors or return error responses
   - Verify error messages are descriptive
   - Tag: `Feature: timezone-wib-handling, Property 8: Invalid input error handling`

9. **Timestamp Range Validation** (Property 9)
   - Generate dates within and outside valid range
   - Verify validation accepts valid dates
   - Verify validation rejects invalid dates
   - Tag: `Feature: timezone-wib-handling, Property 9: Timestamp range validation`

10. **Multiple Format Support** (Property 10)
    - Generate timestamps in various ISO 8601 formats
    - Parse and convert to UTC
    - Verify all formats are handled correctly
    - Tag: `Feature: timezone-wib-handling, Property 10: Multiple timestamp format support`

### Integration Testing

Integration tests will verify end-to-end flows:

**Attendance Submission Flow**:
1. Client sends attendance with ISO timestamp
2. Workers convert to UTC
3. Database stores UTC timestamp
4. Query retrieves and converts to WIB
5. Client displays WIB-formatted time

**Date Filtering Flow**:
1. Admin selects date in WIB (e.g., "2025-01-02")
2. Workers calculate UTC boundaries
3. Database queries with UTC range
4. Results converted to WIB for display
5. All records within WIB date are returned

### Testing Tools

- **Unit Tests**: Vitest or Jest
- **Property-Based Tests**: fast-check (recommended for TypeScript)
- **Integration Tests**: Vitest with Cloudflare Workers test environment
- **Database Tests**: In-memory SQLite for D1 simulation

### Test Coverage Goals

- 100% coverage of timezone utility functions
- All error paths tested
- All edge cases covered (midnight, month/year boundaries)
- All properties verified with minimum 100 iterations each
