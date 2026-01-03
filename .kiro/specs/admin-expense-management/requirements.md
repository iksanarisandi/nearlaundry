# Requirements Document

## Introduction

Fitur manajemen pengeluaran untuk admin yang memungkinkan admin melihat, menambah, mengedit, dan menghapus data pengeluaran dari semua outlet. Fitur ini diperlukan karena staff produksi sering salah input pengeluaran dan admin perlu kemampuan untuk mengoreksi data tersebut.

## Glossary

- **Admin**: User dengan role admin yang memiliki akses penuh ke sistem
- **Expense**: Data pengeluaran yang dicatat oleh staff produksi atau admin
- **Expense_Manager**: Komponen sistem yang mengelola operasi CRUD pengeluaran
- **BHP**: Bahan Habis Pakai - kategori pengeluaran untuk bahan operasional
- **DLL**: Dan Lain-Lain - kategori pengeluaran untuk keperluan lainnya
- **GAS**: Kategori pengeluaran untuk bahan bakar gas

## Requirements

### Requirement 1: Melihat Daftar Pengeluaran

**User Story:** As an admin, I want to view all expenses from all outlets, so that I can monitor and verify expense records.

#### Acceptance Criteria

1. WHEN an admin accesses the expense management page, THE Expense_Manager SHALL display a list of all expenses with columns: tanggal, outlet, staff, kategori, nominal
2. WHEN an admin selects a date filter, THE Expense_Manager SHALL display only expenses within the selected date range
3. WHEN an admin selects an outlet filter, THE Expense_Manager SHALL display only expenses from the selected outlet
4. THE Expense_Manager SHALL display expenses sorted by timestamp in descending order (newest first)
5. THE Expense_Manager SHALL display the total amount of filtered expenses

### Requirement 2: Menambah Pengeluaran Baru

**User Story:** As an admin, I want to add new expense records, so that I can record expenses on behalf of outlets when needed.

#### Acceptance Criteria

1. WHEN an admin submits a new expense with valid data, THE Expense_Manager SHALL create a new expense record with the provided outlet, category, and amount
2. WHEN an admin selects BHP category, THE Expense_Manager SHALL display a subcategory dropdown with BHP items and auto-calculate amount based on item price and quantity
3. WHEN an admin selects DLL category, THE Expense_Manager SHALL require a description field
4. WHEN an admin selects GAS category, THE Expense_Manager SHALL only require the amount field
5. IF an admin submits an expense with invalid data (empty category or amount <= 0), THEN THE Expense_Manager SHALL reject the submission and display an error message
6. WHEN an admin does not specify a date, THE Expense_Manager SHALL use the current timestamp

### Requirement 3: Mengedit Pengeluaran

**User Story:** As an admin, I want to edit existing expense records, so that I can correct mistakes made by staff.

#### Acceptance Criteria

1. WHEN an admin clicks edit on an expense, THE Expense_Manager SHALL display a form pre-filled with the current expense data
2. WHEN an admin submits edited expense data, THE Expense_Manager SHALL update the expense record with the new values
3. IF an admin submits edited expense with invalid data, THEN THE Expense_Manager SHALL reject the update and display an error message
4. THE Expense_Manager SHALL preserve the original timestamp when editing an expense

### Requirement 4: Menghapus Pengeluaran

**User Story:** As an admin, I want to delete incorrect expense records, so that I can remove erroneous data from the system.

#### Acceptance Criteria

1. WHEN an admin clicks delete on an expense, THE Expense_Manager SHALL display a confirmation dialog
2. WHEN an admin confirms deletion, THE Expense_Manager SHALL remove the expense record from the database
3. WHEN an admin cancels deletion, THE Expense_Manager SHALL keep the expense record unchanged

### Requirement 5: Akses dan Keamanan

**User Story:** As a system administrator, I want expense management to be restricted to admin users, so that only authorized personnel can modify expense data.

#### Acceptance Criteria

1. THE Expense_Manager SHALL only allow users with admin role to access the expense management API endpoints
2. IF a non-admin user attempts to access expense management endpoints, THEN THE Expense_Manager SHALL return a 403 Forbidden response
