import { describe, it, expect } from 'vitest';
import {
  isNonEmptyString,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidDeliveryType,
  isValidDeliveryStatus,
  isValidRole,
  isValidDateFormat,
  isValidMonth,
  isValidYear,
  VALID_DELIVERY_TYPES,
  VALID_DELIVERY_STATUSES,
  VALID_ROLES
} from './validation';

describe('isNonEmptyString', () => {
  it('returns true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('  hello  ')).toBe(true);
  });

  it('returns false for empty or whitespace strings', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString('\t\n')).toBe(false);
  });

  it('returns false for non-strings', () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString({})).toBe(false);
  });
});

describe('isPositiveNumber', () => {
  it('returns true for positive numbers', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(0.5)).toBe(true);
    expect(isPositiveNumber(1000000)).toBe(true);
  });

  it('returns false for zero and negative numbers', () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(-0.5)).toBe(false);
  });

  it('returns false for non-numbers', () => {
    expect(isPositiveNumber('1')).toBe(false);
    expect(isPositiveNumber(null)).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
  });
});

describe('isNonNegativeNumber', () => {
  it('returns true for zero and positive numbers', () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(1)).toBe(true);
    expect(isNonNegativeNumber(0.5)).toBe(true);
  });

  it('returns false for negative numbers', () => {
    expect(isNonNegativeNumber(-1)).toBe(false);
    expect(isNonNegativeNumber(-0.001)).toBe(false);
  });
});

describe('isValidDeliveryType', () => {
  it('returns true for valid types', () => {
    VALID_DELIVERY_TYPES.forEach(type => {
      expect(isValidDeliveryType(type)).toBe(true);
    });
  });

  it('returns false for invalid types', () => {
    expect(isValidDeliveryType('pickup')).toBe(false);
    expect(isValidDeliveryType('ANTAR')).toBe(false);
    expect(isValidDeliveryType('')).toBe(false);
    expect(isValidDeliveryType(null)).toBe(false);
  });
});

describe('isValidDeliveryStatus', () => {
  it('returns true for valid statuses', () => {
    VALID_DELIVERY_STATUSES.forEach(status => {
      expect(isValidDeliveryStatus(status)).toBe(true);
    });
  });

  it('returns false for invalid statuses', () => {
    expect(isValidDeliveryStatus('success')).toBe(false);
    expect(isValidDeliveryStatus('BERHASIL')).toBe(false);
    expect(isValidDeliveryStatus(null)).toBe(false);
  });
});

describe('isValidRole', () => {
  it('returns true for valid roles', () => {
    VALID_ROLES.forEach(role => {
      expect(isValidRole(role)).toBe(true);
    });
  });

  it('returns false for invalid roles', () => {
    expect(isValidRole('superadmin')).toBe(false);
    expect(isValidRole('ADMIN')).toBe(false);
    expect(isValidRole('')).toBe(false);
    expect(isValidRole(null)).toBe(false);
  });
});

describe('isValidDateFormat', () => {
  it('returns true for valid YYYY-MM-DD format', () => {
    expect(isValidDateFormat('2025-01-15')).toBe(true);
    expect(isValidDateFormat('2024-12-31')).toBe(true);
    expect(isValidDateFormat('2025-06-01')).toBe(true);
  });

  it('returns false for invalid formats', () => {
    expect(isValidDateFormat('15-01-2025')).toBe(false);
    expect(isValidDateFormat('2025/01/15')).toBe(false);
    expect(isValidDateFormat('01-15-2025')).toBe(false);
    expect(isValidDateFormat('2025-1-15')).toBe(false);
  });

  it('returns false for invalid dates', () => {
    expect(isValidDateFormat('2025-13-01')).toBe(false);
    expect(isValidDateFormat('2025-00-15')).toBe(false);
    expect(isValidDateFormat('invalid')).toBe(false);
  });

  it('returns false for non-strings', () => {
    expect(isValidDateFormat(null)).toBe(false);
    expect(isValidDateFormat(20250115)).toBe(false);
  });
});

describe('isValidMonth', () => {
  it('returns true for months 1-12', () => {
    for (let m = 1; m <= 12; m++) {
      expect(isValidMonth(m)).toBe(true);
    }
  });

  it('returns false for out of range', () => {
    expect(isValidMonth(0)).toBe(false);
    expect(isValidMonth(13)).toBe(false);
    expect(isValidMonth(-1)).toBe(false);
  });

  it('returns false for non-numbers', () => {
    expect(isValidMonth('1')).toBe(false);
    expect(isValidMonth(null)).toBe(false);
  });
});

describe('isValidYear', () => {
  it('returns true for years 2020-2100', () => {
    expect(isValidYear(2020)).toBe(true);
    expect(isValidYear(2025)).toBe(true);
    expect(isValidYear(2100)).toBe(true);
  });

  it('returns false for out of range', () => {
    expect(isValidYear(2019)).toBe(false);
    expect(isValidYear(2101)).toBe(false);
    expect(isValidYear(1999)).toBe(false);
  });

  it('returns false for non-numbers', () => {
    expect(isValidYear('2025')).toBe(false);
    expect(isValidYear(null)).toBe(false);
  });
});
