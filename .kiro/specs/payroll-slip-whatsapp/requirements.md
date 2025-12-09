# Requirements Document

## Introduction

Fitur untuk mengirim slip gaji karyawan dalam bentuk gambar melalui WhatsApp. Admin dapat mengkonversi slip gaji menjadi gambar PNG dan mengirimkannya langsung ke nomor WhatsApp karyawan dengan satu klik. Implementasi menggunakan pendekatan client-side dengan html2canvas untuk konversi gambar dan WhatsApp Web API (wa.me link) untuk pengiriman.

## Glossary

- **Slip Gaji**: Dokumen yang berisi rincian gaji karyawan termasuk pendapatan dan potongan
- **html2canvas**: Library JavaScript untuk mengkonversi elemen HTML menjadi gambar canvas
- **WhatsApp Web API**: URL scheme `wa.me` yang membuka WhatsApp dengan nomor dan pesan yang sudah terisi
- **Payroll System**: Sistem penggajian yang sudah ada di aplikasi NearMe Laundry

## Requirements

### Requirement 1

**User Story:** As an admin, I want to store employee phone numbers, so that I can send payslips directly to their WhatsApp.

#### Acceptance Criteria

1. WHEN an admin creates or edits a user THEN the Payroll System SHALL provide a phone number input field
2. WHEN a phone number is entered THEN the Payroll System SHALL validate the format as Indonesian phone number (starting with 08 or +62)
3. WHEN a phone number is saved THEN the Payroll System SHALL store it in normalized format (62xxxxxxxxxx)
4. WHEN adding phone column to database THEN the Payroll System SHALL use ALTER TABLE ADD COLUMN without dropping tables or deleting existing data

### Requirement 2

**User Story:** As an admin, I want to convert a payslip to an image, so that I can share it via WhatsApp.

#### Acceptance Criteria

1. WHEN an admin clicks the "Kirim WA" button on a payroll row THEN the Payroll System SHALL generate a slip gaji preview in HTML format
2. WHEN the slip preview is generated THEN the Payroll System SHALL convert the HTML element to PNG image using html2canvas
3. WHEN the image is generated THEN the Payroll System SHALL automatically download the image with filename format `slip_gaji_{nama}_{bulan}_{tahun}.png`
4. WHEN the image download completes THEN the Payroll System SHALL display the slip preview in a modal for verification

### Requirement 3

**User Story:** As an admin, I want to open WhatsApp with the employee's number pre-filled, so that I can quickly send the payslip image.

#### Acceptance Criteria

1. WHEN the slip image is ready THEN the Payroll System SHALL display a "Buka WhatsApp" button
2. WHEN an admin clicks "Buka WhatsApp" THEN the Payroll System SHALL open WhatsApp Web/App with the employee's phone number pre-filled
3. WHEN WhatsApp opens THEN the Payroll System SHALL include a pre-filled message template with employee name and period
4. IF the employee has no phone number stored THEN the Payroll System SHALL display an error message and prevent WhatsApp action

### Requirement 4

**User Story:** As an admin, I want the slip image to be visually clear and professional, so that employees can easily read their salary details.

#### Acceptance Criteria

1. WHEN generating the slip image THEN the Payroll System SHALL render the slip with minimum width of 400 pixels
2. WHEN generating the slip image THEN the Payroll System SHALL include company logo, employee name, period, and all salary components
3. WHEN generating the slip image THEN the Payroll System SHALL use readable font sizes (minimum 12px for body text)
4. WHEN generating the slip image THEN the Payroll System SHALL clearly separate income and deduction sections with visual dividers
