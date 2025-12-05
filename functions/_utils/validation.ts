/**
 * Validation Helper Functions
 * Common validation utilities for the ERP system
 */

/**
 * Check if a string is non-empty after trimming
 * @param value - String to validate
 * @returns true if valid (non-empty)
 */
export function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a number is positive
 * @param value - Number to validate
 * @returns true if positive (> 0)
 */
export function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && value > 0;
}

/**
 * Check if a number is non-negative
 * @param value - Number to validate
 * @returns true if non-negative (>= 0)
 */
export function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && value >= 0;
}

/**
 * Valid delivery types
 */
export const VALID_DELIVERY_TYPES = ['antar', 'jemput'] as const;
export type DeliveryType = typeof VALID_DELIVERY_TYPES[number];

/**
 * Check if delivery type is valid
 * @param type - Delivery type to validate
 * @returns true if valid
 */
export function isValidDeliveryType(type: unknown): type is DeliveryType {
  return typeof type === 'string' && VALID_DELIVERY_TYPES.includes(type as DeliveryType);
}

/**
 * Valid delivery statuses
 */
export const VALID_DELIVERY_STATUSES = ['berhasil', 'gagal', 'pending'] as const;
export type DeliveryStatus = typeof VALID_DELIVERY_STATUSES[number];

/**
 * Check if delivery status is valid
 * @param status - Status to validate
 * @returns true if valid
 */
export function isValidDeliveryStatus(status: unknown): status is DeliveryStatus {
  return typeof status === 'string' && VALID_DELIVERY_STATUSES.includes(status as DeliveryStatus);
}

/**
 * Valid user roles
 */
export const VALID_ROLES = ['admin', 'gudang', 'produksi', 'kurir'] as const;
export type UserRole = typeof VALID_ROLES[number];

/**
 * Check if role is valid
 * @param role - Role to validate
 * @returns true if valid
 */
export function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_ROLES.includes(role as UserRole);
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param dateStr - Date string to validate
 * @returns true if valid format
 */
export function isValidDateFormat(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate month (1-12)
 * @param month - Month number
 * @returns true if valid
 */
export function isValidMonth(month: unknown): boolean {
  return typeof month === 'number' && month >= 1 && month <= 12;
}

/**
 * Validate year (reasonable range)
 * @param year - Year number
 * @returns true if valid (2020-2100)
 */
export function isValidYear(year: unknown): boolean {
  return typeof year === 'number' && year >= 2020 && year <= 2100;
}
