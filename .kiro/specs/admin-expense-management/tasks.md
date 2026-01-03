# Implementation Plan: Admin Expense Management

## Overview

Implementasi fitur manajemen pengeluaran untuk admin dengan API endpoints dan halaman frontend baru.

## Tasks

- [x] 1. Buat API endpoint admin expenses
  - [x] 1.1 Buat file `functions/api/admin/expenses.ts` dengan GET endpoint untuk list expenses dengan filter (date, outlet_id, month, year)
    - Join dengan users dan outlets table untuk mendapatkan nama
    - Gunakan `getWitaDateBoundaries()` untuk filter tanggal
    - Return `timestamp_wita` menggunakan `formatTimestampWita()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 1.2 Tambahkan POST endpoint untuk create expense baru
    - Validasi: outlet_id required, category non-empty, amount > 0
    - Gunakan admin user_id sebagai pencatat
    - Support optional date parameter
    - _Requirements: 2.1, 2.5, 2.6_
  - [x] 1.3 Tambahkan PUT endpoint untuk update expense
    - Validasi: category non-empty, amount > 0
    - Preserve original timestamp
    - _Requirements: 3.2, 3.3, 3.4_
  - [x] 1.4 Tambahkan DELETE endpoint untuk hapus expense
    - _Requirements: 4.2_
  - [x] 1.5 Register route di `functions/index.ts`
    - _Requirements: 5.1_

- [x] 2. Checkpoint - Pastikan API berfungsi
  - Test manual dengan curl atau Postman
  - Pastikan semua endpoint return response yang benar

- [x] 3. Buat halaman admin pengeluaran
  - [x] 3.1 Buat file `public/admin/pengeluaran.html` dengan struktur dasar
    - Header dengan nav admin
    - Form input pengeluaran baru (outlet, kategori, subcategory/keterangan, nominal, tanggal)
    - Filter section (outlet, bulan/tahun)
    - Tabel pengeluaran dengan kolom: Tanggal, Outlet, Staff, Kategori, Nominal, Aksi
    - _Requirements: 1.1, 2.1_
  - [x] 3.2 Implementasi JavaScript untuk load data
    - Load outlets untuk dropdown
    - Load BHP items untuk subcategory
    - Load expenses dengan filter
    - Format timestamp dengan timezone WITA
    - _Requirements: 1.2, 1.3, 1.5_
  - [x] 3.3 Implementasi form submit untuk create expense
    - Handle kategori BHP dengan subcategory dan auto-calculate
    - Handle kategori DLL dengan keterangan
    - Handle kategori GAS
    - _Requirements: 2.2, 2.3, 2.4_
  - [x] 3.4 Implementasi edit dan delete functionality
    - Modal edit dengan pre-filled data
    - Konfirmasi sebelum delete
    - _Requirements: 3.1, 4.1, 4.3_

- [-] 4. Update navigasi admin
  - [x] 4.1 Tambahkan link "Pengeluaran" di nav admin (`public/shared/nav.js`)
    - _Requirements: 1.1_

- [x] 5. Checkpoint - Test end-to-end
  - Pastikan semua fitur berfungsi dari UI
  - Test create, edit, delete expense
  - Test filter by outlet dan tanggal

- [ ]* 6. Property-based tests (opsional)
  - [ ]* 6.1 Write property test untuk create expense round-trip
    - **Property 1: Create expense round-trip**
    - **Validates: Requirements 2.1**
  - [ ]* 6.2 Write property test untuk invalid input rejection
    - **Property 5: Invalid input rejection**
    - **Validates: Requirements 2.5, 3.3**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Menggunakan pattern yang sama dengan halaman kasbon untuk konsistensi
- Timezone handling menggunakan utility functions dari `_utils/timezone.ts`
