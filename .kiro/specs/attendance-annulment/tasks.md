# Implementation Plan

- [x] 1. Database migration untuk attendance annulment





  - [x] 1.1 Buat migration file untuk menambah kolom annulment di tabel attendance


    - Tambah kolom `status` TEXT DEFAULT 'active' CHECK (status IN ('active', 'annulled'))
    - Tambah kolom `annulled_by` INTEGER (nullable, FK ke users)
    - Tambah kolom `annulled_at` TEXT (nullable, timestamp)
    - Tambah kolom `annulled_reason` TEXT (nullable)
    - _Requirements: 1.2, 1.4_
  - [x] 1.2 Write property test untuk data preservation


    - **Property 1: Annulment preserves original data**
    - **Validates: Requirements 1.4**

- [x] 2. Implement annulment API endpoint





  - [x] 2.1 Buat endpoint POST /api/admin/attendance/annul


    - Validasi attendance_id dan reason
    - Update record dengan status, annulled_by, annulled_at, annulled_reason
    - Return success/error response
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.2 Write property test untuk reason validation


    - **Property 2: Annulment requires valid reason**
    - **Validates: Requirements 1.3**
  - [x] 2.3 Write property test untuk admin authorization


    - **Property 5: Only admin can annul**
    - **Validates: Requirements 1.1**

- [x] 3. Implement audit logging untuk annulment





  - [x] 3.1 Tambahkan audit log entry saat annulment berhasil


    - Log action 'ATTENDANCE_ANNULLED' dengan detail JSON (attendance_id, original data, reason)
    - _Requirements: 4.1, 4.2_
  - [x] 3.2 Write property test untuk audit trail creation


    - **Property 4: Annulment creates audit trail**
    - **Validates: Requirements 4.1**

- [x] 4. Checkpoint - Pastikan semua tests passing





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update attendance API untuk include annulment data






  - [x] 5.1 Modifikasi GET /api/attendance/all untuk return annulment fields

    - Tambah status, annulled_by (dengan nama admin), annulled_at, annulled_reason di response
    - Tambah query parameter `include_annulled` untuk filter
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.2 Write property test untuk payroll exclusion

    - **Property 3: Annulled records excluded from count**
    - **Validates: Requirements 3.1**

- [x] 6. Update admin attendance UI








  - [x] 6.1 Tambah kolom Aksi dengan tombol Anulir di tabel absensi


    - Tombol hanya muncul untuk record dengan status 'active'
    - _Requirements: 1.1, 2.1_
  - [x] 6.2 Buat modal konfirmasi anulir dengan input alasan

    - Input textarea untuk alasan (required)
    - Tombol Batal dan Konfirmasi
    - _Requirements: 1.1, 1.3_

  - [x] 6.3 Implementasi visual distinction untuk record annulled
    - Strikethrough text atau badge "Dianulir"
    - Tampilkan alasan, admin, dan waktu anulir

    - _Requirements: 2.1, 2.2_
  - [x] 6.4 Tambah filter toggle untuk show/hide annulled records
    - Checkbox atau toggle switch
    - Default: tampilkan semua
    - _Requirements: 2.3_

- [x] 7. Final Checkpoint - Pastikan semua tests passing





  - Ensure all tests pass, ask the user if questions arise.
