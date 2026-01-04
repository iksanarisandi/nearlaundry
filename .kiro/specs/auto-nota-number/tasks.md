# Implementation Plan: Auto Nota Number

## Overview

Implementasi fitur auto-generate nomor nota dengan format `{OUTLET_CODE}.{MMM}{YY}.{SEQUENCE}`. Implementasi dilakukan secara bertahap untuk memastikan backward compatibility dan migration yang aman.

## Tasks

- [x] 1. Create nota utility functions
  - [x] 1.1 Create `functions/_utils/nota.ts` with core functions
    - Implement `generateOutletCode(outletName)` - extract first letter + numbers
    - Implement `getMonthAbbreviation(monthIndex)` - return Indonesian month abbr
    - Implement `generateNotaPrefix(outletCode, date)` - combine code + month + year
    - Implement `parseNotaNumber(notaNumber)` - parse into components
    - Implement `isValidNotaFormat(notaNumber)` - validate format
    - Implement `combineNotaNumber(prefix, sequence)` - combine prefix + sequence
    - _Requirements: 2.2, 3.3, 4.1_

  - [ ]* 1.2 Write property tests for nota utilities
    - **Property 1: Outlet Code Generation Determinism**
    - **Property 2: Nota Prefix Format Validity**
    - **Property 3: Nota Number Round-Trip Parsing**
    - **Property 4: Sequence Handling Correctness**
    - **Validates: Requirements 1.2, 2.2, 3.4, 4.1**

- [x] 2. Database migration for outlet code
  - [x] 2.1 Create migration file `db/migration-v13.sql`
    - Add `code` column to outlets table (nullable)
    - Create unique index on `code` column
    - _Requirements: 5.1, 5.2_

  - [x] 2.2 Update outlets API to handle code field
    - Update GET `/api/admin/outlets` to return code
    - Update POST `/api/admin/outlets` to accept and validate code
    - Update PUT `/api/admin/outlets/:id` to accept and validate code
    - Add auto-generate code suggestion on create
    - Add uniqueness validation for code
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.3 Update outlet admin UI
    - Add "Kode" column to outlet list table
    - Add "Kode Outlet" input field in form
    - Auto-suggest code when creating new outlet
    - Show validation error for duplicate/invalid codes
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Checkpoint - Verify outlet code management works
  - Ensure migration runs without errors
  - Ensure outlet CRUD with code works
  - Ask user if questions arise

- [x] 4. Implement nota prefix API endpoints
  - [x] 4.1 Add GET `/api/production/nota-prefix` endpoint
    - Fetch outlet code for logged-in user
    - Generate prefix using current WITA date
    - Return prefix, outlet_code, month, year
    - Handle case when outlet has no code
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 4.2 Add GET `/api/production/last-sequence` endpoint
    - Accept prefix as query parameter
    - Query production table for last nota with matching prefix
    - Extract and return sequence number
    - Return null if no previous sequence
    - _Requirements: 3.1.1, 3.1.3_

- [x] 5. Update production form UI
  - [x] 5.1 Update `public/produksi/produksi.html` for auto nota
    - Fetch nota prefix on form load
    - Display prefix as readonly text
    - Replace nota_number input with sequence-only input
    - Display "Terakhir: {SEQ}" below sequence input
    - Combine prefix + sequence on submit
    - Update last sequence display after successful save
    - _Requirements: 2.3, 3.1, 3.2, 3.1.2, 3.1.4_

  - [x] 5.2 Update POST `/api/production` for backward compatibility
    - Accept both `nota_number` (full) and `nota_sequence` (new)
    - If `nota_sequence` provided, combine with auto-prefix
    - Validate format if new format detected
    - Preserve existing uniqueness validation
    - _Requirements: 3.3, 4.1, 4.2, 6.1_

- [x] 6. Checkpoint - Verify full feature works
  - Test creating production with new nota format
  - Test last sequence display updates correctly
  - Test backward compatibility with old format
  - Ask user if questions arise

- [ ]* 7. Write integration tests
  - Test nota-prefix endpoint returns correct format
  - Test last-sequence endpoint returns correct value
  - Test production creation with sequence-only input
  - Test backward compatibility with full nota_number
  - _Requirements: 6.1, 6.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Migration is designed to be safe (nullable column, no data modification)
- Backward compatibility ensures existing data and workflows continue to work
- Property tests validate core utility functions
- Integration tests validate API behavior
