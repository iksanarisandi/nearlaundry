# Implementation Plan: Production Audit

## Overview

Implementasi fitur Audit Produksi Bulanan untuk admin, mencakup database migration, API endpoints, dan halaman frontend. Menggunakan pattern yang sudah ada di codebase (Hono.js, D1, timezone WITA).

## Tasks

- [x] 1. Database Migration
  - [x] 1.1 Create migration-v12.sql with new columns and table
    - Add verified_status, verified_by, verified_at, edited_by_admin columns to production table
    - Create production_edit_history table with indexes
    - _Requirements: 2.1, 2.3, 3.2, 3.3_

- [x] 2. Backend API - Core Endpoints
  - [x] 2.1 Create production-audit.ts with list endpoint
    - Implement GET /list with month, outlet_id, user_id, verified filters
    - Join with users and outlets tables
    - Add timestamp_wita formatting
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Implement summary endpoint
    - Implement GET /summary with same filters
    - Calculate total_weight, total_qty, verified/unverified notas count
    - Add per-user breakdown
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 2.3 Write property test for API response structure
    - **Property 1: API Response Structure Completeness**
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 2.4 Write property test for summary accuracy
    - **Property 8: Summary Statistics Accuracy**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 3. Backend API - Edit Functionality
  - [x] 3.1 Implement edit endpoint
    - Implement PUT /:id for editing production entry
    - Validate all fields (weight >= 0, qty > 0, nota not empty, etc.)
    - Set edited_by_admin on successful edit
    - _Requirements: 3.1, 3.2_

  - [x] 3.2 Implement edit history creation
    - Create history record for each changed field
    - Store admin_id, field_changed, old_value, new_value
    - _Requirements: 3.3_

  - [x] 3.3 Implement history retrieval endpoint
    - Implement GET /history/:id
    - Join with users table for admin_name
    - Add timestamp_wita formatting
    - _Requirements: 4.1, 4.2_

  - [ ]* 3.4 Write property test for edit creates history
    - **Property 3: Edit Creates History Record**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 3.5 Write property test for invalid edit rejection
    - **Property 4: Invalid Edit Rejection**
    - **Validates: Requirements 3.4**

- [x] 4. Backend API - Verification
  - [x] 4.1 Implement verify endpoint
    - Implement POST /verify with nota_number and outlet_id
    - Update all entries with matching nota to verified
    - Set verified_by and verified_at
    - _Requirements: 2.1, 2.3_

  - [x] 4.2 Implement unverify endpoint
    - Implement POST /unverify with nota_number and outlet_id
    - Update all entries with matching nota to unverified
    - Update verified_by and verified_at
    - _Requirements: 2.2, 2.3_

  - [ ]* 4.3 Write property test for verify/unverify round-trip
    - **Property 2: Verify/Unverify Round-Trip Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 5. Backend API - Export
  - [x] 5.1 Implement CSV export endpoint
    - Implement GET /export with same filters as list
    - Generate CSV with semicolon separator
    - Include all required columns
    - Set proper Content-Disposition header with filename
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 5.2 Write property test for CSV format
    - **Property 7: CSV Export Format Validity**
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [x] 6. Backend - Staff Edit Lock
  - [x] 6.1 Modify staff production edit endpoint
    - Update functions/api/production/index.ts PUT /:id
    - Check if edited_by_admin is set, reject if so
    - _Requirements: 3.5_

  - [ ]* 6.2 Write property test for admin edit locks staff
    - **Property 5: Admin Edit Locks Staff Edit**
    - **Validates: Requirements 3.5**

- [x] 7. Checkpoint - Backend Complete
  - Ensure all API tests pass
  - Run migration on local database
  - Test endpoints manually with curl/Postman

- [x] 8. Frontend - Audit Page
  - [x] 8.1 Create audit-produksi.html with filter form
    - Month picker (default current month)
    - Outlet dropdown
    - User dropdown
    - Verification status dropdown
    - Search button
    - _Requirements: 1.1, 1.5_

  - [x] 8.2 Implement summary cards
    - Display total weight, qty, verified/unverified counts
    - Progress bar for verification
    - _Requirements: 6.1_

  - [x] 8.3 Implement data table with grouping
    - Group rows by nota_number
    - Show subtotals per nota
    - Visual distinction for verified/unverified
    - Action buttons: Edit, History, Verify/Unverify
    - _Requirements: 1.2, 1.3, 1.4, 2.4_

  - [x] 8.4 Implement edit modal
    - Form with all editable fields
    - Validation before submit
    - _Requirements: 3.1_

  - [x] 8.5 Implement history modal
    - Table showing edit history
    - "Belum ada perubahan" for empty history
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 8.6 Implement export button
    - Trigger CSV download with current filters
    - _Requirements: 5.1_

- [x] 9. Integration - Wire Everything
  - [x] 9.1 Register API routes in functions/index.ts
    - Import and mount production-audit routes
    - _Requirements: All_

  - [x] 9.2 Add navigation link
    - Add "Audit Produksi" link to admin nav in public/shared/nav.js
    - _Requirements: 1.1_

- [x] 10. Final Checkpoint
  - Ensure all tests pass
  - Test full workflow: filter → view → edit → verify → export
  - Verify staff cannot edit admin-edited entries

## Notes

- Tasks marked with `*` are optional property-based tests
- Migration must be run before testing API endpoints
- Use existing timezone utilities from `_utils/timezone.ts`
- Follow existing patterns in `attendance_all.ts` for filter handling
