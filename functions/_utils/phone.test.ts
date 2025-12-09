import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateAndNormalizePhone, PhoneValidation } from './phone';

/**
 * Phone Validation Property-Based Tests
 * Feature: payroll-slip-whatsapp
 */

// Valid Indonesian mobile prefixes (after 62)
const VALID_PREFIXES = ['81', '82', '83', '85', '87', '88', '89'];

/**
 * Generator for digit strings of specified length
 */
const digitString = (minLen: number, maxLen: number) => 
  fc.integer({ min: minLen, max: maxLen }).chain(len =>
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: len, maxLength: len })
      .map(digits => digits.join(''))
  );

/**
 * Generator for valid Indonesian phone numbers in 08xxx format
 */
const validPhone08Format = fc.tuple(
  fc.constantFrom(...VALID_PREFIXES),
  digitString(7, 11)
).map(([prefix, rest]) => `0${prefix}${rest}`);

/**
 * Generator for valid Indonesian phone numbers in +62xxx format
 */
const validPhonePlus62Format = fc.tuple(
  fc.constantFrom(...VALID_PREFIXES),
  digitString(7, 11)
).map(([prefix, rest]) => `+62${prefix}${rest}`);

/**
 * Generator for valid Indonesian phone numbers in 62xxx format
 */
const validPhone62Format = fc.tuple(
  fc.constantFrom(...VALID_PREFIXES),
  digitString(7, 11)
).map(([prefix, rest]) => `62${prefix}${rest}`);

/**
 * Generator for any valid Indonesian phone number format
 */
const validPhoneAnyFormat = fc.oneof(
  validPhone08Format,
  validPhonePlus62Format,
  validPhone62Format
);

describe('Phone Validation - Property-Based Tests', () => {
  /**
   * **Feature: payroll-slip-whatsapp, Property 1: Phone validation accepts valid Indonesian formats**
   * **Validates: Requirements 1.2**
   * 
   * For any string that matches Indonesian phone patterns (08xxxxxxxxxx, +62xxxxxxxxxx, 62xxxxxxxxxx 
   * with valid prefixes and 10-13 digits), the validation function SHALL return isValid: true.
   */
  it('Property 1: Phone validation accepts valid Indonesian formats', () => {
    fc.assert(
      fc.property(validPhoneAnyFormat, (phone) => {
        const result = validateAndNormalizePhone(phone);
        return result.isValid === true && result.normalized !== null;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: payroll-slip-whatsapp, Property 2: Phone normalization produces consistent format**
   * **Validates: Requirements 1.3**
   * 
   * For any valid Indonesian phone number input, the normalization function SHALL produce 
   * output in format 62xxxxxxxxxx (without + prefix, starting with 62).
   */
  it('Property 2: Phone normalization produces consistent format', () => {
    fc.assert(
      fc.property(validPhoneAnyFormat, (phone) => {
        const result = validateAndNormalizePhone(phone);
        if (!result.isValid || !result.normalized) return false;
        
        // Must start with 62 (not +62)
        const startsWithCorrectPrefix = result.normalized.startsWith('62');
        // Must not contain + sign
        const noPlus = !result.normalized.includes('+');
        // Must be all digits
        const allDigits = /^\d+$/.test(result.normalized);
        // Must have valid length (11-15 digits)
        const validLength = result.normalized.length >= 11 && result.normalized.length <= 15;
        
        return startsWithCorrectPrefix && noPlus && allDigits && validLength;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: payroll-slip-whatsapp, Property 3: Phone validation round-trip consistency**
   * **Validates: Requirements 1.2, 1.3**
   * 
   * For any valid phone number, normalizing it and then validating the normalized result 
   * SHALL return isValid: true.
   */
  it('Property 3: Phone validation round-trip consistency', () => {
    fc.assert(
      fc.property(validPhoneAnyFormat, (phone) => {
        const firstResult = validateAndNormalizePhone(phone);
        if (!firstResult.isValid || !firstResult.normalized) return false;
        
        // Validate the normalized result
        const secondResult = validateAndNormalizePhone(firstResult.normalized);
        
        // Should still be valid
        if (!secondResult.isValid) return false;
        
        // Normalized value should be the same (idempotent)
        return secondResult.normalized === firstResult.normalized;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Phone Validation - Unit Tests', () => {
  describe('validateAndNormalizePhone', () => {
    it('accepts 08xxx format and normalizes to 62xxx', () => {
      const result = validateAndNormalizePhone('081234567890');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('6281234567890');
    });

    it('accepts +62xxx format and normalizes to 62xxx', () => {
      const result = validateAndNormalizePhone('+6281234567890');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('6281234567890');
    });

    it('accepts 62xxx format (already normalized)', () => {
      const result = validateAndNormalizePhone('6281234567890');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('6281234567890');
    });

    it('handles phone with spaces and dashes', () => {
      const result = validateAndNormalizePhone('0812-3456-7890');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('6281234567890');
    });

    it('rejects empty string', () => {
      const result = validateAndNormalizePhone('');
      expect(result.isValid).toBe(false);
      expect(result.normalized).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('rejects invalid prefix', () => {
      const result = validateAndNormalizePhone('0712345678901');
      expect(result.isValid).toBe(false);
      expect(result.normalized).toBeNull();
    });

    it('rejects too short number', () => {
      const result = validateAndNormalizePhone('08123456');
      expect(result.isValid).toBe(false);
      expect(result.normalized).toBeNull();
    });

    it('rejects non-numeric characters', () => {
      const result = validateAndNormalizePhone('0812abc7890');
      expect(result.isValid).toBe(false);
      expect(result.normalized).toBeNull();
    });

    it('rejects invalid format starting with other digits', () => {
      const result = validateAndNormalizePhone('1234567890123');
      expect(result.isValid).toBe(false);
      expect(result.normalized).toBeNull();
    });
  });
});
