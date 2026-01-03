# Implementation Plan: WIB Timezone Handling

## Overview

This implementation plan converts the timezone handling design into discrete coding tasks. Each task builds incrementally, starting with core utility functions, then integrating into existing attendance APIs, and finally updating client-side code. Testing is integrated throughout to validate correctness early.

## Tasks

- [x] 1. Create timezone utility module with core conversion functions
  - Create `functions/_utils/timezone.ts` file
  - Implement `utcToWib()` function using `toLocaleString()` with Asia/Jakarta timezone
  - Implement `wibToUtc()` function for reverse conversion
  - Implement `isValidTimestamp()` function to validate date ranges (2020-01-01 to 1 year future)
  - Implement `parseIsoToWib()` function to parse ISO strings and convert to WIB
  - _Requirements: 3.1, 3.2, 5.1, 5.2, 7.3_

- [ ]* 1.1 Write property test for UTC to WIB conversion
  - **Property 3: UTC to WIB conversion adds 7 hours**
  - **Validates: Requirements 3.1, 5.1**
  - Generate random UTC dates and verify WIB conversion adds exactly 7 hours
  - Use fast-check library with minimum 100 iterations

- [ ]* 1.2 Write property test for WIB to UTC conversion
  - **Property 4: WIB to UTC conversion subtracts 7 hours**
  - **Validates: Requirements 3.2, 5.2**
  - Generate random WIB dates and verify UTC conversion subtracts exactly 7 hours
  - Use fast-check library with minimum 100 iterations

- [ ]* 1.3 Write property test for round-trip conversion
  - **Property 5: Round-trip conversion preserves time**
  - **Validates: Requirements 3.1, 3.2**
  - Generate random dates, convert UTC → WIB → UTC and verify equality
  - Use fast-check library with minimum 100 iterations

- [ ]* 1.4 Write property test for timestamp validation
  - **Property 9: Timestamp range validation**
  - **Validates: Requirements 7.3**
  - Generate dates within and outside valid range, verify validation logic
  - Use fast-check library with minimum 100 iterations

- [x] 2. Add date boundary and formatting functions
  - Implement `getWibDateBoundaries()` function to calculate UTC boundaries for WIB dates
  - Implement `formatWib()` function using Indonesian locale formatting
  - Add helper function to validate ISO 8601 format
  - _Requirements: 4.1, 5.3, 2.1_

- [ ]* 2.1 Write property test for date boundaries calculation
  - **Property 6: WIB date boundaries calculation**
  - **Validates: Requirements 4.1**
  - Generate random date strings, verify boundaries start at 17:00 previous day UTC
  - Use fast-check library with minimum 100 iterations

- [ ]* 2.2 Write unit test for specific date boundary example
  - Test date "2025-01-02" produces startUtc: "2025-01-01T17:00:00Z", endUtc: "2025-01-02T16:59:59Z"
  - Test month boundaries (last/first day of month)
  - Test year boundaries (Dec 31, Jan 1)
  - _Requirements: 4.2_

- [ ]* 2.3 Write property test for Indonesian locale formatting
  - **Property 7: Indonesian locale formatting contains expected elements**
  - **Validates: Requirements 5.3**
  - Generate random dates, verify formatted strings contain Indonesian month names
  - Use fast-check library with minimum 100 iterations

- [x] 3. Add error handling and validation
  - Implement error handling for invalid timestamps in utility functions
  - Add descriptive error messages for validation failures
  - Implement support for multiple ISO 8601 timestamp formats
  - _Requirements: 3.4, 5.5, 7.1, 6.4_

- [ ]* 3.1 Write property test for invalid input error handling
  - **Property 8: Invalid input error handling**
  - **Validates: Requirements 3.4, 5.5, 7.1**
  - Generate invalid inputs (null, undefined, malformed strings), verify errors thrown
  - Use fast-check library with minimum 100 iterations

- [ ]* 3.2 Write property test for multiple timestamp format support
  - **Property 10: Multiple timestamp format support**
  - **Validates: Requirements 6.4**
  - Generate timestamps in various ISO 8601 formats, verify all are parsed correctly
  - Use fast-check library with minimum 100 iterations

- [ ]* 3.3 Write unit tests for edge cases
  - Test null, undefined, empty string inputs
  - Test malformed date strings
  - Test dates outside valid range
  - Test midnight boundaries (00:00:00 WIB)
  - Test end of day (23:59:59 WIB)
  - _Requirements: 7.1, 7.3_

- [x] 4. Checkpoint - Ensure all timezone utility tests pass
  - Run all property-based tests and unit tests
  - Verify all 10 correctness properties are validated
  - Ensure all tests pass, ask the user if questions arise

- [x] 5. Update attendance submission endpoint
  - Modify `functions/api/production/attendance.ts` to accept ISO 8601 timestamp from client
  - Add timestamp validation using `isValidTimestamp()`
  - Convert client timestamp to UTC using timezone utilities before database insertion
  - Return WIB-formatted confirmation using `formatWib()`
  - Add error handling for invalid timestamps (400 Bad Request)
  - _Requirements: 1.1, 3.1, 7.1_

- [ ]* 5.1 Write integration test for attendance submission
  - Test valid timestamp submission flow
  - Test invalid timestamp rejection
  - Test UTC storage in database
  - Test WIB-formatted response
  - _Requirements: 1.1, 3.1, 7.1_

- [x] 6. Update attendance query endpoint
  - Modify `functions/api/admin/attendance_all.ts` to accept date filter in YYYY-MM-DD format
  - Use `getWibDateBoundaries()` to calculate UTC boundaries for querying
  - Convert all returned timestamps to WIB using `formatWib()` before sending to client
  - Add `waktu_wib` field to response objects
  - _Requirements: 4.1, 4.2, 3.2_

- [ ]* 6.1 Write integration test for attendance query
  - Test date filtering with WIB boundaries
  - Test UTC to WIB conversion in results
  - Test specific date "2025-01-02" returns correct UTC range
  - _Requirements: 4.1, 4.2_

- [x] 7. Update client-side attendance submission
  - Modify `public/produksi/absen.html` to capture current time using `new Date().toISOString()`
  - Update fetch request to send ISO 8601 timestamp in request body
  - Update success message to display WIB-formatted confirmation from server
  - _Requirements: 2.1, 2.4_

- [ ] 8. Update client-side attendance submission for kurir
  - Modify `public/kurir/absen.html` with same changes as produksi
  - Capture current time using `new Date().toISOString()`
  - Send ISO 8601 timestamp to server
  - Display WIB-formatted confirmation
  - _Requirements: 2.1, 2.4_

- [x] 9. Update admin attendance display
  - Modify `public/admin/absensi.html` to display `waktu_wib` field from API response
  - Ensure timestamps are shown in Indonesian locale format
  - Update table columns to show WIB timezone indicator
  - _Requirements: 2.4, 4.4_

- [ ] 10. Add UTC storage property test
  - **Property 1: UTC storage round-trip**
  - **Validates: Requirements 1.1, 1.3**
  - Generate random dates, store in database, retrieve and verify UTC format preserved
  - Use fast-check library with minimum 100 iterations
  - _Requirements: 1.1, 1.3_

- [ ] 11. Add ISO 8601 format validation property test
  - **Property 2: ISO 8601 format validation**
  - **Validates: Requirements 2.1**
  - Generate random dates, convert to ISO string, verify format matches pattern
  - Use fast-check library with minimum 100 iterations
  - _Requirements: 2.1_

- [x] 12. Final checkpoint - End-to-end testing
  - Test complete attendance submission flow (client → workers → database → query → display)
  - Test date filtering with various WIB dates
  - Verify backward compatibility with existing attendance records
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: 6.1, 6.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each property test references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use fast-check library with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end flows
- All timezone conversions use native JavaScript Date API with `toLocaleString()`
- No external dependencies required beyond fast-check for property testing
