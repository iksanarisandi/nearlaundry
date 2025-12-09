/**
 * Phone Number Validation and Normalization Utilities
 * For Indonesian phone numbers (08xxx, +62xxx, 62xxx)
 * 
 * Feature: payroll-slip-whatsapp
 * Requirements: 1.2, 1.3
 */

/**
 * Result of phone validation
 */
export interface PhoneValidation {
  isValid: boolean;
  normalized: string | null;  // Format: 62xxxxxxxxxx (without +)
  error?: string;
}

/**
 * Validates and normalizes Indonesian phone numbers
 * 
 * Accepted formats:
 * - 08xxxxxxxxxx (local format)
 * - +62xxxxxxxxxx (international with +)
 * - 62xxxxxxxxxx (international without +)
 * 
 * Output format: 62xxxxxxxxxx (10-13 digits after country code)
 * 
 * @param phone - Phone number string to validate
 * @returns PhoneValidation object with isValid, normalized, and optional error
 */
export function validateAndNormalizePhone(phone: string): PhoneValidation {
  // Handle null/undefined/empty
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      normalized: null,
      error: 'Nomor telepon tidak boleh kosong'
    };
  }

  // Remove all whitespace and dashes
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check if empty after cleaning
  if (cleaned.length === 0) {
    return {
      isValid: false,
      normalized: null,
      error: 'Nomor telepon tidak boleh kosong'
    };
  }

  let normalized: string;

  // Handle different formats
  if (cleaned.startsWith('+62')) {
    // +62xxxxxxxxxx format
    normalized = cleaned.substring(1); // Remove the +
  } else if (cleaned.startsWith('62')) {
    // 62xxxxxxxxxx format (already normalized)
    normalized = cleaned;
  } else if (cleaned.startsWith('08')) {
    // 08xxxxxxxxxx format - convert to 62
    normalized = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    // 8xxxxxxxxxx format (missing leading 0) - convert to 62
    normalized = '62' + cleaned;
  } else {
    return {
      isValid: false,
      normalized: null,
      error: 'Format nomor telepon tidak valid. Gunakan format 08xxx, +62xxx, atau 62xxx'
    };
  }

  // Validate that the rest are digits
  if (!/^\d+$/.test(normalized)) {
    return {
      isValid: false,
      normalized: null,
      error: 'Nomor telepon hanya boleh berisi angka'
    };
  }

  // Check length: 62 + 9-12 digits = 11-14 total characters
  // Indonesian mobile numbers are typically 10-13 digits including country code
  // e.g., 628123456789 (12 digits) to 6281234567890123 (max 14)
  const digitCount = normalized.length;
  if (digitCount < 11 || digitCount > 15) {
    return {
      isValid: false,
      normalized: null,
      error: `Panjang nomor telepon tidak valid (${digitCount} digit). Harus 11-15 digit termasuk kode negara`
    };
  }

  // Validate that it starts with valid Indonesian mobile prefixes after 62
  // Valid prefixes: 81x, 82x, 83x, 85x, 87x, 88x, 89x
  const afterCountryCode = normalized.substring(2);
  const validPrefixes = ['81', '82', '83', '85', '87', '88', '89'];
  const prefix = afterCountryCode.substring(0, 2);
  
  if (!validPrefixes.includes(prefix)) {
    return {
      isValid: false,
      normalized: null,
      error: `Prefix nomor telepon tidak valid (${prefix}). Gunakan nomor HP Indonesia yang valid`
    };
  }

  return {
    isValid: true,
    normalized: normalized
  };
}
