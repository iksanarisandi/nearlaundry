# Implementation Plan: Currency Input Formatter

## Overview

Implementasi utility JavaScript untuk auto-format input nominal uang dengan pemisah ribuan (titik). Utility akan dibuat sebagai shared module dan diterapkan ke semua halaman yang memiliki input nominal.

## Tasks

- [x] 1. Buat currency.js utility module
  - [x] 1.1 Implementasi fungsi formatCurrency dan parseCurrency
    - Buat file `public/shared/currency.js`
    - Implementasi `formatCurrency(number)` yang mengkonversi angka ke string dengan pemisah ribuan
    - Implementasi `parseCurrency(string)` yang mengkonversi string berformat ke integer
    - Handle edge cases: 0, empty string, non-numeric input
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2_

  - [ ]* 1.2 Write property test untuk round-trip consistency
    - **Property 1: Round-trip consistency**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 1.3 Write property test untuk format validity
    - **Property 2: Format produces valid thousand-separated string**
    - **Validates: Requirements 1.1, 1.2, 4.1, 4.2**

  - [ ]* 1.4 Write property test untuk parse filtering
    - **Property 3: Parse filters non-digits**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 1.5 Implementasi attachToInput dan initCurrencyInputs
    - Implementasi `attachToInput(input)` yang menambahkan event listener untuk formatting real-time
    - Implementasi `initCurrencyInputs()` yang mencari semua input dengan `data-currency` attribute
    - Auto-call `initCurrencyInputs()` pada DOMContentLoaded
    - Handle input event untuk format saat mengetik
    - Handle paste event untuk format saat paste
    - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3_

- [x] 2. Checkpoint - Pastikan utility berfungsi
  - Pastikan semua tests pass, tanya user jika ada pertanyaan

- [x] 3. Update halaman admin kasbon
  - [x] 3.1 Update public/admin/kasbon.html
    - Include script `currency.js`
    - Ubah input amount dari `type="number"` ke `type="text" inputmode="numeric" data-currency`
    - Update form submit handler untuk menggunakan `parseCurrency()`
    - _Requirements: 1.1, 3.1, 5.2_

- [x] 4. Update halaman admin pengeluaran
  - [x] 4.1 Update public/admin/pengeluaran.html
    - Include script `currency.js`
    - Ubah input amount dan edit-amount dari `type="number"` ke `type="text" inputmode="numeric" data-currency`
    - Update form submit handler untuk menggunakan `parseCurrency()`
    - Update edit modal untuk format existing value saat dibuka
    - _Requirements: 1.1, 3.1, 4.1, 5.2_

- [x] 5. Update halaman produksi pengeluaran
  - [x] 5.1 Update public/produksi/pengeluaran.html
    - Include script `currency.js`
    - Ubah input amount dari `type="number"` ke `type="text" inputmode="numeric" data-currency`
    - Update form submit handler untuk menggunakan `parseCurrency()`
    - _Requirements: 1.1, 3.1, 5.2_

- [x] 6. Update halaman admin payroll
  - [x] 6.1 Update public/admin/payroll.html
    - Include script `currency.js`
    - Ubah semua input nominal gaji dari `type="number"` ke `type="text" inputmode="numeric" data-currency`
    - Update form submit handler untuk menggunakan `parseCurrency()` pada semua field nominal
    - _Requirements: 1.1, 3.1, 5.2_

  - [x] 6.2 Update public/admin/payroll-v2.html (jika berbeda dari payroll.html)
    - Include script `currency.js`
    - Ubah semua input nominal gaji dari `type="number"` ke `type="text" inputmode="numeric" data-currency`
    - Update form submit handler untuk menggunakan `parseCurrency()` pada semua field nominal
    - _Requirements: 1.1, 3.1, 5.2_

- [x] 7. Final checkpoint
  - Pastikan semua halaman berfungsi dengan benar
  - Test manual: ketik angka, paste, hapus karakter
  - Pastikan form submission mengirim nilai integer yang benar

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests menggunakan fast-check library
- Setiap halaman yang diupdate perlu ditest manual untuk memastikan UX berjalan baik
- Input `type="text"` dengan `inputmode="numeric"` akan menampilkan keyboard numerik di mobile
