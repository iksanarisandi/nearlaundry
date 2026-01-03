# Requirements Document

## Introduction

Fitur Audit Produksi Bulanan memungkinkan admin untuk melihat, memverifikasi, dan mengedit data produksi per orang per outlet sebelum proses penggajian. Tujuan utama adalah mencegah manipulasi data kiloan yang melebihi nota asli, dengan menyediakan tools untuk cross-check dan audit trail.

## Glossary

- **Admin**: Pengguna dengan role admin yang memiliki akses penuh ke fitur audit
- **Production_Entry**: Satu record produksi di tabel production (cuci, kering, setrika, packing, dll)
- **Nota**: Nomor nota yang mengelompokkan beberapa Production_Entry
- **Verification_Status**: Status verifikasi nota (verified/unverified)
- **Edit_History**: Log perubahan data produksi oleh admin
- **Audit_Report**: Laporan agregasi produksi per user per outlet per bulan

## Requirements

### Requirement 1: Melihat Laporan Produksi Bulanan

**User Story:** As an admin, I want to view production data filtered by month, outlet, and user, so that I can audit production records before payroll processing.

#### Acceptance Criteria

1. WHEN an admin opens the audit page, THE System SHALL display a filter form with month picker, outlet dropdown, and user dropdown
2. WHEN an admin selects filters and submits, THE System SHALL display production entries grouped by nota_number
3. WHEN displaying production entries, THE System SHALL show nota_number, user_name, outlet_name, process, qty, weight, service_price, timestamp, and verification_status
4. WHEN displaying grouped data, THE System SHALL show subtotal weight and qty per nota
5. WHEN no filters are selected, THE System SHALL default to current month and all outlets/users

### Requirement 2: Verifikasi Nota

**User Story:** As an admin, I want to mark notas as verified or unverified, so that I can track which production records have been audited.

#### Acceptance Criteria

1. WHEN an admin clicks verify on an unverified nota, THE System SHALL update all Production_Entry with that nota_number to verified status
2. WHEN an admin clicks unverify on a verified nota, THE System SHALL update all Production_Entry with that nota_number to unverified status
3. WHEN verification status changes, THE System SHALL record the admin_id and timestamp of the change
4. WHEN displaying the audit list, THE System SHALL visually distinguish verified and unverified notas

### Requirement 3: Edit Data Produksi

**User Story:** As an admin, I want to edit production entry data, so that I can correct errors found during audit.

#### Acceptance Criteria

1. WHEN an admin clicks edit on a Production_Entry, THE System SHALL display an edit form with all editable fields (weight, qty, nota_number, process, customer_name, service_price)
2. WHEN an admin submits valid edit data, THE System SHALL update the Production_Entry and create an Edit_History record
3. WHEN creating Edit_History, THE System SHALL store admin_id, timestamp, field_changed, old_value, and new_value
4. IF an admin submits invalid data (negative weight, empty nota), THEN THE System SHALL reject the edit and display an error message
5. WHEN a Production_Entry has been edited by admin, THE Staff_Produksi SHALL NOT be able to edit that entry anymore

### Requirement 4: Melihat History Edit

**User Story:** As an admin, I want to view edit history for production entries, so that I can track all changes made during audit.

#### Acceptance Criteria

1. WHEN an admin clicks history on a Production_Entry, THE System SHALL display all Edit_History records for that entry
2. WHEN displaying Edit_History, THE System SHALL show admin_name, timestamp, field_changed, old_value, and new_value
3. WHEN a Production_Entry has no edit history, THE System SHALL display "Belum ada perubahan"

### Requirement 5: Export Laporan

**User Story:** As an admin, I want to export production audit data to CSV, so that I can cross-check with physical notas offline.

#### Acceptance Criteria

1. WHEN an admin clicks export with active filters, THE System SHALL generate a CSV file with the filtered data
2. WHEN generating CSV, THE System SHALL include columns: nota_number, user_name, outlet_name, process, qty, weight, service_price, timestamp_wita, verification_status
3. WHEN generating CSV, THE System SHALL format the filename as "audit-produksi-{outlet}-{month}-{year}.csv"
4. WHEN generating CSV, THE System SHALL use semicolon separator for Excel compatibility

### Requirement 6: Summary Statistics

**User Story:** As an admin, I want to see summary statistics of production data, so that I can quickly assess the audit progress.

#### Acceptance Criteria

1. WHEN displaying the audit page, THE System SHALL show total weight, total qty, total verified notas, and total unverified notas for the current filter
2. WHEN filters change, THE System SHALL update the summary statistics accordingly
3. WHEN displaying per-user summary, THE System SHALL show total weight and qty per user within the filtered period
