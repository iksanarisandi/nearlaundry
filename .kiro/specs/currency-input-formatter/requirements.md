# Requirements Document

## Introduction

Fitur auto-format input nominal uang dengan pemisah ribuan (titik) di frontend untuk memudahkan user saat menginput angka besar. Format ini hanya untuk tampilan - nilai yang dikirim ke backend tetap berupa integer tanpa format.

## Glossary

- **Currency_Input**: Input field HTML yang menerima nilai nominal uang (Rupiah)
- **Thousand_Separator**: Karakter titik (.) yang digunakan sebagai pemisah ribuan dalam format Indonesia
- **Raw_Value**: Nilai integer murni tanpa formatting (contoh: 1500000)
- **Formatted_Value**: Nilai dengan pemisah ribuan untuk display (contoh: 1.500.000)
- **Formatter**: Utility JavaScript yang mengkonversi antara raw dan formatted value

## Requirements

### Requirement 1: Auto-format saat mengetik

**User Story:** As a user, I want nominal inputs to automatically format with thousand separators as I type, so that I can easily read and verify large numbers.

#### Acceptance Criteria

1. WHEN a user types digits in a currency input field, THE Formatter SHALL display the value with thousand separators (dots)
2. WHEN a user types "1500000", THE Currency_Input SHALL display "1.500.000"
3. WHEN a user deletes characters, THE Formatter SHALL re-format the remaining digits correctly
4. WHEN a user pastes a number, THE Formatter SHALL format the pasted value with thousand separators

### Requirement 2: Hanya menerima angka

**User Story:** As a user, I want the input to only accept numeric characters, so that I cannot accidentally enter invalid data.

#### Acceptance Criteria

1. WHEN a user types non-numeric characters (letters, symbols except dot), THE Currency_Input SHALL ignore the input
2. WHEN a user pastes text containing non-numeric characters, THE Formatter SHALL strip non-numeric characters and format the remaining digits
3. THE Currency_Input SHALL allow only digits 0-9 as valid input characters

### Requirement 3: Submit nilai raw ke backend

**User Story:** As a developer, I want the form to submit raw integer values without formatting, so that the backend receives clean numeric data.

#### Acceptance Criteria

1. WHEN a form is submitted, THE Currency_Input SHALL send the raw integer value without thousand separators
2. WHEN the displayed value is "1.500.000", THE submitted value SHALL be 1500000
3. THE Formatter SHALL provide a method to get raw value from any currency input

### Requirement 4: Load existing value dengan format

**User Story:** As a user, I want existing values to be displayed with thousand separators when editing, so that I can easily read the current value.

#### Acceptance Criteria

1. WHEN a currency input is populated with an existing value, THE Formatter SHALL display it with thousand separators
2. WHEN the input value attribute is "1500000", THE display SHALL show "1.500.000"

### Requirement 5: Reusable utility

**User Story:** As a developer, I want a single reusable utility for currency formatting, so that I can easily apply it to any input field across the application.

#### Acceptance Criteria

1. THE Formatter SHALL be implemented as a shared JavaScript utility in `public/shared/`
2. WHEN a developer adds `data-currency` attribute to an input, THE Formatter SHALL automatically apply formatting
3. THE Formatter SHALL expose functions: `formatCurrency(number)`, `parseCurrency(string)`, and `initCurrencyInputs()`

### Requirement 6: Accessibility

**User Story:** As a user with assistive technology, I want the currency input to be accessible, so that I can use it effectively.

#### Acceptance Criteria

1. THE Currency_Input SHALL maintain proper input type for numeric keyboard on mobile
2. THE Currency_Input SHALL preserve cursor position appropriately after formatting
