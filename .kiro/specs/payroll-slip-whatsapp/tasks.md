# Implementation Plan

- [x] 1. Database Migration





  - [x] 1.1 Create migration-v9.sql to add phone column to users table


    - Use ALTER TABLE ADD COLUMN (no DROP or DELETE)
    - Column: phone TEXT (nullable)
    - _Requirements: 1.1, 1.4_

- [x] 2. Phone Validation Utility





  - [x] 2.1 Create phone validation and normalization functions in functions/_utils/phone.ts


    - validateAndNormalizePhone(phone: string): PhoneValidation
    - Accept formats: 08xxx, +62xxx, 62xxx
    - Normalize to 62xxxxxxxxxx format
    - _Requirements: 1.2, 1.3_

  - [x] 2.2 Write property tests for phone validation

    - **Property 1: Phone validation accepts valid Indonesian formats**
    - **Property 2: Phone normalization produces consistent format**
    - **Property 3: Phone validation round-trip consistency**
    - **Validates: Requirements 1.2, 1.3**

- [x] 3. Backend API Updates





  - [x] 3.1 Update users API to handle phone field


    - Modify POST /api/admin/users to accept and validate phone
    - Modify PUT /api/admin/users/:id to update phone
    - Modify GET /api/admin/users to return phone
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 3.2 Update payroll API to include phone in response


    - Modify GET /api/payroll-v2 to join users.phone
    - _Requirements: 3.2_

- [x] 4. Checkpoint - Backend Complete





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Frontend - User Management






  - [x] 5.1 Add phone input field to users.html form

    - Add input field with Indonesian phone format hint
    - Display phone in user list table
    - Include phone in edit form population
    - _Requirements: 1.1_

- [x] 6. Frontend - Slip Generation Utilities






  - [x] 6.1 Create slip generation utilities

    - generateSlipFilename(name, month, year): string
    - generateWhatsAppLink(phone, name, period): string
    - generateSlipHTML(data: SlipData): string
    - _Requirements: 2.3, 3.2, 3.3, 4.2_

  - [x] 6.2 Write property tests for slip utilities

    - **Property 4: Filename generation follows pattern**
    - **Property 5: WhatsApp URL contains phone number**
    - **Property 6: WhatsApp message contains employee info**
    - **Property 7: Slip HTML contains required elements**
    - **Validates: Requirements 2.3, 3.2, 3.3, 4.2**

- [x] 7. Frontend - Payroll WhatsApp Integration





  - [x] 7.1 Add html2canvas library to payroll-v2.html


    - Include CDN script for html2canvas
    - _Requirements: 2.2_
  - [x] 7.2 Create slip preview modal in payroll-v2.html


    - Modal container with slip HTML preview
    - Download button
    - "Buka WhatsApp" button (disabled if no phone)
    - Close button
    - _Requirements: 2.1, 2.4, 3.1, 3.4_
  - [x] 7.3 Implement sendToWhatsApp function


    - Generate slip HTML and render in modal
    - Convert to PNG using html2canvas
    - Auto-download image
    - Generate and open WhatsApp link
    - Handle missing phone number error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_
  - [x] 7.4 Add "Kirim WA" button to payroll table rows


    - Button next to existing "Slip PDF" button
    - Pass payroll data to sendToWhatsApp function
    - _Requirements: 2.1_

- [x] 8. Final Checkpoint





  - Ensure all tests pass, ask the user if questions arise.
