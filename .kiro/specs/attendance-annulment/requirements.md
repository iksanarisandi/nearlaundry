# Requirements Document

## Introduction

Fitur Anulir Absensi memungkinkan admin untuk membatalkan record absensi staff yang sudah tercatat. Kasus penggunaan utama adalah ketika staff sudah absen masuk namun kemudian harus pulang karena sakit atau alasan darurat lainnya. Record absensi tidak dihapus secara permanen, melainkan ditandai sebagai "annulled" untuk keperluan audit trail. Absensi yang dianulir tidak akan dihitung dalam perhitungan kehadiran dan payroll.

## Glossary

- **Attendance System**: Sistem pencatatan kehadiran staff yang mencatat waktu masuk (in) dan pulang (out)
- **Annulment**: Proses pembatalan record absensi tanpa menghapus data secara permanen (soft delete)
- **Admin**: Pengguna dengan role admin yang memiliki wewenang untuk melakukan anulir absensi
- **Audit Trail**: Catatan historis yang menyimpan informasi siapa melakukan apa dan kapan

## Requirements

### Requirement 1

**User Story:** As an admin, I want to annul attendance records, so that I can handle cases where staff needs to leave early due to illness or emergency after checking in.

#### Acceptance Criteria

1. WHEN an admin clicks the annul button on an attendance record THEN the Attendance System SHALL display a confirmation modal with a reason input field
2. WHEN an admin submits the annulment with a valid reason THEN the Attendance System SHALL mark the attendance record as annulled and store the admin ID, timestamp, and reason
3. WHEN an admin attempts to annul without providing a reason THEN the Attendance System SHALL prevent the submission and display a validation message
4. WHEN an attendance record is annulled THEN the Attendance System SHALL retain the original data for audit purposes

### Requirement 2

**User Story:** As an admin, I want to see which attendance records have been annulled, so that I can track and review annulment history.

#### Acceptance Criteria

1. WHEN viewing the attendance list THEN the Attendance System SHALL visually distinguish annulled records from active records
2. WHEN an annulled record is displayed THEN the Attendance System SHALL show the annulment reason, admin name who performed it, and annulment timestamp
3. WHEN filtering attendance records THEN the Attendance System SHALL provide an option to show or hide annulled records

### Requirement 3

**User Story:** As a payroll administrator, I want annulled attendance records to be excluded from calculations, so that staff are not incorrectly compensated for invalid attendance.

#### Acceptance Criteria

1. WHEN calculating attendance count for payroll THEN the Attendance System SHALL exclude records with annulled status
2. WHEN generating attendance reports THEN the Attendance System SHALL clearly indicate which records were annulled and not counted

### Requirement 4

**User Story:** As a system administrator, I want annulment actions to be logged, so that I can maintain accountability and audit compliance.

#### Acceptance Criteria

1. WHEN an attendance record is annulled THEN the Attendance System SHALL create an entry in the audit log with action type, user details, and reason
2. WHEN reviewing audit logs THEN the Attendance System SHALL display annulment actions with complete context including original attendance data
