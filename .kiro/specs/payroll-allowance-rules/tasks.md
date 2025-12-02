# Implementation Plan

- [x] 1. Database Migration




  - [x] 1.1 Add join_date column to users table


    - Create migration file `db/migration-v3.sql`
    - Add `ALTER TABLE users ADD COLUMN join_date TEXT;`
    - _Requirements: 1.1_

- [x] 2. Backend API Implementation





  - [x] 2.1 Create allowance calculation helper functions


    - Add `calculateMasaKerja(joinDate, month, year)` function
    - Add `calculateTunjanganJabatan(masaKerjaBulan)` function
    - Add `calculateUangMakanRate(masaKerjaBulan)` function
    - Add `isLate(clockInTime, shift)` function with shift config (pagi: 07:00, sore: 14:00)
    - Add `calculateDenda(lateCount)` function (Rp 25.000 per keterlambatan)
    - Define SHIFT_CONFIG, LATE_TOLERANCE_MINUTES (15), and DENDA_PER_LATE (25000) constants
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.2 Create GET /api/payroll-v2/allowances/:user_id endpoint


    - Query user join_date from database
    - Query attendance count for the period
    - Query late count based on shift and tolerance (>15 menit dari jam masuk)
    - Calculate masa kerja, tunjangan jabatan, uang makan, and denda keterlambatan
    - Return calculation result with formula breakdown including late_count and denda_total
    - Handle error when join_date is not set
    - _Requirements: 4.1, 4.2, 4.3, 5.6, 5.7_


  - [x] 2.3 Update GET /api/payroll-v2 endpoint

    - Include join_date and masa_kerja_bulan in response
    - _Requirements: 1.2, 1.3_

- [x] 3. Frontend UI Updates






  - [x] 3.1 Update payroll-v2.html form

    - Add "Auto" button next to tunjangan_jabatan and uang_makan fields
    - Add denda_terlambat field (readonly, auto-calculated)
    - Add info text elements to show calculation formula for all fields
    - Implement `calcAllowances()` function to call API and populate fields including denda
    - Display masa kerja, attendance count, late count, and formula breakdown
    - _Requirements: 2.5, 3.5, 4.1, 5.7, 5.8_

- [x] 4. Testing





  - [x] 4.1 Test allowance calculation functions






    - Test tunjangan jabatan for various masa kerja values
    - Test uang makan rate threshold at 12 months
    - Test isLate function for both shifts (pagi 07:00, sore 14:00) with 15 minute tolerance
    - Test denda calculation (Rp 25.000 per late)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5_
