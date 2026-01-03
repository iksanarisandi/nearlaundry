# Requirements Document

## Introduction

Sistem ini memerlukan penanganan timezone yang konsisten untuk memastikan semua data waktu (terutama absensi) disimpan dalam UTC di Cloudflare D1 database, namun ditampilkan dan diproses dalam zona waktu WIB (UTC+7) untuk pengguna di Indonesia. Ini mencegah masalah seperti absensi yang bergeser karena serverless environment selalu menggunakan UTC.

## Glossary

- **UTC**: Coordinated Universal Time, standar waktu internasional tanpa offset timezone
- **WIB**: Waktu Indonesia Barat (UTC+7), zona waktu yang digunakan di Jawa, Sumatera, dan Kalimantan Barat
- **Attendance_System**: Sistem absensi yang mencatat waktu masuk/keluar karyawan
- **Workers**: Cloudflare Workers, serverless environment yang menjalankan aplikasi
- **D1_Database**: Cloudflare D1, SQLite database yang menyimpan data aplikasi
- **Client**: Browser atau aplikasi frontend yang digunakan pengguna
- **Timestamp**: Representasi waktu dalam format ISO 8601 atau UNIX epoch

## Requirements

### Requirement 1: Database Storage in UTC

**User Story:** As a system administrator, I want all timestamps stored in UTC format in the database, so that data remains consistent regardless of server location or timezone changes.

#### Acceptance Criteria

1. WHEN a timestamp is inserted into the database, THE D1_Database SHALL store it in UTC format
2. THE D1_Database SHALL use DATETIME columns with DEFAULT CURRENT_TIMESTAMP for automatic UTC timestamps
3. WHEN querying timestamps, THE D1_Database SHALL return values in UTC format
4. THE Attendance_System SHALL NOT store timezone offsets in timestamp columns

### Requirement 2: Client-Side Timezone Handling

**User Story:** As a user, I want to submit attendance with my local time (WIB), so that my attendance records reflect the correct local time when I clock in/out.

#### Acceptance Criteria

1. WHEN a user submits attendance from the Client, THE Client SHALL send the timestamp in ISO 8601 format
2. WHEN the Client captures current time, THE Client SHALL use JavaScript Date with timezone awareness
3. THE Client SHALL include timezone information in the request payload or headers
4. WHEN displaying timestamps, THE Client SHALL convert UTC to WIB (UTC+7) for user interface

### Requirement 3: Server-Side Timezone Conversion

**User Story:** As a developer, I want the Workers to handle timezone conversion consistently, so that all attendance data is correctly stored and retrieved regardless of client timezone settings.

#### Acceptance Criteria

1. WHEN receiving a timestamp from the Client, THE Workers SHALL convert it to UTC before database insertion
2. WHEN querying timestamps from the database, THE Workers SHALL convert UTC to WIB before sending to Client
3. THE Workers SHALL use a consistent timezone conversion utility function
4. WHEN timezone conversion fails, THE Workers SHALL log the error and return a descriptive error message
5. THE Workers SHALL support WIB (Asia/Jakarta) timezone conversion

### Requirement 4: Attendance Query with WIB Filtering

**User Story:** As an administrator, I want to query attendance records by WIB date, so that I can view daily attendance reports according to local business hours.

#### Acceptance Criteria

1. WHEN querying attendance by date, THE Attendance_System SHALL filter using WIB date boundaries
2. WHEN a date filter is "2025-01-02", THE Attendance_System SHALL return records from 2025-01-01 17:00:00 UTC to 2025-01-02 16:59:59 UTC
3. THE Attendance_System SHALL provide SQL helper functions for WIB date conversion
4. WHEN displaying attendance lists, THE Attendance_System SHALL show timestamps in WIB format

### Requirement 5: Timezone Utility Functions

**User Story:** As a developer, I want reusable timezone utility functions, so that I can consistently handle WIB conversions throughout the application.

#### Acceptance Criteria

1. THE Workers SHALL provide a function to convert UTC to WIB
2. THE Workers SHALL provide a function to convert WIB to UTC
3. THE Workers SHALL provide a function to format timestamps in Indonesian locale
4. THE Workers SHALL provide a function to get WIB date boundaries for filtering
5. WHEN utility functions receive invalid input, THEN THE Workers SHALL throw descriptive errors

### Requirement 6: Backward Compatibility

**User Story:** As a system administrator, I want existing attendance records to be correctly interpreted, so that historical data remains accurate after timezone handling implementation.

#### Acceptance Criteria

1. WHEN querying existing attendance records, THE Attendance_System SHALL interpret stored UTC timestamps correctly
2. THE Attendance_System SHALL NOT require data migration for existing timestamps
3. WHEN displaying historical data, THE Attendance_System SHALL apply WIB conversion consistently
4. THE Attendance_System SHALL handle both old and new timestamp formats gracefully

### Requirement 7: Error Handling and Validation

**User Story:** As a user, I want clear error messages when timezone-related issues occur, so that I can understand and resolve problems with my attendance submissions.

#### Acceptance Criteria

1. WHEN an invalid timestamp is submitted, THE Workers SHALL return a 400 error with descriptive message
2. WHEN timezone conversion fails, THE Workers SHALL log the error details for debugging
3. THE Workers SHALL validate that converted timestamps are within reasonable ranges
4. WHEN database operations fail, THE Workers SHALL return appropriate error responses
