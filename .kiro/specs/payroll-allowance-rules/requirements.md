# Requirements Document

## Introduction

Fitur ini menambahkan ketentuan otomatis untuk perhitungan tunjangan jabatan dan uang makan pada sistem payroll berdasarkan masa kerja karyawan. Sistem akan menghitung masa kerja dari tanggal bergabung (join_date) dan menerapkan rate yang sesuai untuk tunjangan jabatan serta uang makan berdasarkan jumlah kehadiran.

## Glossary

- **Payroll_System**: Modul sistem ERP yang mengelola perhitungan gaji karyawan
- **Join_Date**: Tanggal mulai kerja karyawan yang disimpan di tabel users
- **Masa_Kerja**: Durasi kerja karyawan dalam bulan, dihitung dari join_date sampai periode payroll
- **Tunjangan_Jabatan**: Komponen gaji berdasarkan lama masa kerja
- **Uang_Makan**: Komponen gaji berdasarkan jumlah kehadiran dan masa kerja
- **Kehadiran**: Jumlah hari karyawan melakukan absen masuk dalam periode payroll
- **Denda_Keterlambatan**: Potongan gaji yang dikenakan jika karyawan absen masuk lebih dari 15 menit dari jam masuk shift
- **Shift_Pagi**: Shift kerja dengan jam masuk 07:00 WITA
- **Shift_Sore**: Shift kerja dengan jam masuk 14:00 WITA
- **Toleransi_Keterlambatan**: Batas waktu 15 menit setelah jam masuk shift sebelum denda dikenakan

## Requirements

### Requirement 1: Penyimpanan Tanggal Bergabung Karyawan

**User Story:** As an admin, I want to store employee join date, so that the system can calculate tenure-based allowances automatically.

#### Acceptance Criteria

1. THE Payroll_System SHALL store join_date field in the users table as a date value.
2. WHEN an admin views payroll data, THE Payroll_System SHALL display the calculated masa_kerja in months for each employee.
3. THE Payroll_System SHALL calculate masa_kerja as the difference in months between join_date and the payroll period (month/year).

### Requirement 2: Perhitungan Tunjangan Jabatan Otomatis

**User Story:** As an admin, I want the system to calculate position allowance based on tenure, so that employees receive correct allowances automatically.

#### Acceptance Criteria

1. WHILE masa_kerja is less than or equal to 12 months, THE Payroll_System SHALL set tunjangan_jabatan to Rp 0.
2. WHILE masa_kerja is greater than 12 months and less than or equal to 24 months, THE Payroll_System SHALL set tunjangan_jabatan to Rp 150,000.
3. WHILE masa_kerja is greater than 24 months, THE Payroll_System SHALL calculate tunjangan_jabatan as Rp 150,000 plus Rp 100,000 for each additional 12-month period completed after the first 12 months.
4. WHEN calculating tunjangan_jabatan for masa_kerja of 26 months, THE Payroll_System SHALL return Rp 250,000.
5. THE Payroll_System SHALL allow admin to override the calculated tunjangan_jabatan value manually.

### Requirement 3: Perhitungan Uang Makan Berdasarkan Kehadiran

**User Story:** As an admin, I want the system to calculate meal allowance based on attendance and tenure, so that employees receive correct meal allowances.

#### Acceptance Criteria

1. WHILE masa_kerja is less than or equal to 12 months, THE Payroll_System SHALL apply uang_makan rate of Rp 17,000 per attendance day.
2. WHILE masa_kerja is greater than 12 months, THE Payroll_System SHALL apply uang_makan rate of Rp 20,000 per attendance day.
3. THE Payroll_System SHALL calculate total uang_makan as the rate multiplied by the number of attendance days in the payroll period.
4. WHEN an admin requests payroll calculation, THE Payroll_System SHALL retrieve attendance count from the attendance table for the specified user and period.
5. THE Payroll_System SHALL allow admin to override the calculated uang_makan value manually.

### Requirement 4: Endpoint Perhitungan Otomatis

**User Story:** As an admin, I want an API endpoint to auto-calculate allowances, so that I can quickly populate payroll data with correct values.

#### Acceptance Criteria

1. WHEN an admin calls the auto-calculate endpoint with user_id, month, and year, THE Payroll_System SHALL return calculated tunjangan_jabatan and uang_makan values.
2. THE Payroll_System SHALL include masa_kerja, attendance_count, uang_makan_rate, and calculation breakdown in the response.
3. IF join_date is not set for a user, THEN THE Payroll_System SHALL return an error message indicating join_date is required.

### Requirement 5: Perhitungan Denda Keterlambatan Otomatis

**User Story:** As an admin, I want the system to calculate late penalties automatically based on attendance time, so that employees are penalized correctly for tardiness.

#### Acceptance Criteria

1. THE Payroll_System SHALL define Shift_Pagi with start time of 07:00 WITA.
2. THE Payroll_System SHALL define Shift_Sore with start time of 14:00 WITA.
3. WHEN an employee clocks in more than 15 minutes after their shift start time, THE Payroll_System SHALL apply a Denda_Keterlambatan of Rp 25,000 for that day.
4. WHEN an employee clocks in within 15 minutes of their shift start time, THE Payroll_System SHALL NOT apply any Denda_Keterlambatan.
5. THE Payroll_System SHALL calculate total Denda_Keterlambatan as the sum of all late penalties in the payroll period.
6. WHEN an admin requests payroll calculation, THE Payroll_System SHALL retrieve attendance timestamps and calculate late penalties for the specified user and period.
7. THE Payroll_System SHALL include late_count and total_denda in the allowance calculation response.
8. THE Payroll_System SHALL allow admin to override the calculated denda value manually.
