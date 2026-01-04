# Requirements Document

## Introduction

Fitur auto-generate nomor nota untuk input produksi dengan format standar yang mencakup kode outlet, bulan/tahun, dan sequence number. Format: `{KODE_OUTLET}.{BULAN}{TAHUN}.{SEQUENCE}` contoh: `U2.JAN26.001`.

Fitur ini memudahkan staff produksi dalam input nota dengan format yang konsisten dan mudah dilacak berdasarkan outlet dan periode waktu.

## Glossary

- **Nota_Number_Generator**: Sistem yang menghasilkan prefix nomor nota berdasarkan outlet dan waktu saat ini
- **Outlet_Code**: Kode singkat outlet yang terdiri dari huruf awal nama outlet dan nomor jika ada (contoh: "U2" untuk "Uluwatu 2")
- **Nota_Prefix**: Bagian awal nomor nota yang di-generate otomatis (`U2.JAN26.`)
- **Sequence**: Nomor urut yang diinput manual oleh user (`001`, `002`, dst)
- **Production_Form**: Form input produksi di halaman staff produksi

## Requirements

### Requirement 1: Outlet Code Management

**User Story:** As an admin, I want to assign unique codes to each outlet, so that the codes can be used in nota number generation.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display a new "Kode" column in the outlet list
2. WHEN an admin creates a new outlet, THE System SHALL auto-generate a suggested code based on the outlet name (first letter + number if present)
3. WHEN an admin edits an outlet, THE System SHALL allow modification of the outlet code
4. THE System SHALL validate that outlet codes are unique across all outlets
5. THE System SHALL validate that outlet codes contain only uppercase letters and numbers (max 5 characters)
6. IF an outlet code is empty, THEN THE System SHALL prevent saving and display an error message

### Requirement 2: Nota Prefix Generation

**User Story:** As a production staff, I want the nota number prefix to be auto-generated, so that I only need to input the sequence number.

#### Acceptance Criteria

1. WHEN a staff opens the production form, THE Nota_Number_Generator SHALL generate a prefix based on current outlet code and current month/year in WITA timezone
2. THE Nota_Prefix SHALL follow the format `{OUTLET_CODE}.{MMM}{YY}.` where MMM is 3-letter month abbreviation in Indonesian (JAN, FEB, MAR, APR, MEI, JUN, JUL, AGU, SEP, OKT, NOV, DES) and YY is 2-digit year
3. THE Production_Form SHALL display the prefix as readonly text before the sequence input field
4. WHEN the month changes (in WITA timezone), THE Nota_Number_Generator SHALL update the prefix accordingly

### Requirement 3: Sequence Input

**User Story:** As a production staff, I want to input only the sequence number, so that data entry is faster and more consistent.

#### Acceptance Criteria

1. THE Production_Form SHALL provide an input field for sequence number only
2. THE System SHALL accept sequence numbers of 1-4 digits
3. WHEN a sequence number is submitted, THE System SHALL combine prefix and sequence to form the complete nota number
4. THE System SHALL preserve leading zeros in sequence numbers (e.g., "001" stays as "001")

### Requirement 3.1: Last Sequence Display

**User Story:** As a production staff, I want to see the last used sequence number, so that I can input the next sequence correctly without duplicates.

#### Acceptance Criteria

1. WHEN a staff opens the production form, THE System SHALL display the last used sequence number for the current prefix (outlet + month/year)
2. THE System SHALL show "Terakhir: {SEQUENCE}" below the sequence input field
3. IF no previous sequence exists for the current prefix, THEN THE System SHALL display "Terakhir: -"
4. WHEN a new production entry is saved successfully, THE System SHALL update the last sequence display

### Requirement 4: Nota Number Validation

**User Story:** As a system administrator, I want nota numbers to be validated, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN a nota number is submitted, THE System SHALL validate the complete format matches `{CODE}.{MMM}{YY}.{SEQ}` pattern
2. IF the nota number format is invalid, THEN THE System SHALL reject the submission with a descriptive error
3. THE System SHALL continue to enforce uniqueness of nota_number + process combination per outlet (existing behavior)

### Requirement 5: Database Migration Safety

**User Story:** As a system administrator, I want the migration to be safe, so that existing data is not affected.

#### Acceptance Criteria

1. THE Migration SHALL add a new `code` column to the outlets table with nullable constraint initially
2. THE Migration SHALL NOT modify or delete any existing data
3. WHEN the migration runs, THE System SHALL auto-populate code for existing outlets based on their names
4. THE Admin SHALL be able to manually adjust auto-generated codes after migration

### Requirement 6: Backward Compatibility

**User Story:** As a system user, I want existing nota numbers to remain valid, so that historical data is preserved.

#### Acceptance Criteria

1. THE System SHALL accept both old format (free text) and new format nota numbers during a transition period
2. WHEN searching/tracking by nota number, THE System SHALL match both old and new formats
3. THE System SHALL NOT require re-entry of existing production records
