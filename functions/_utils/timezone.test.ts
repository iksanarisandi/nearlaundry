import { describe, it, expect } from 'vitest';
import {
  utcToWib,
  wibToUtc,
  isValidTimestamp,
  parseIsoToWib,
  formatWib,
  getWibDateBoundaries,
  getTodayWib,
  getWibDateFromTimestamp,
  isTimestampInWibDate
} from './timezone';

describe('Timezone Utility Functions', () => {
  describe('utcToWib', () => {
    it('should convert UTC to WIB (add 7 hours)', () => {
      const utc = new Date('2025-01-02T10:00:00Z');
      const wib = utcToWib(utc);
      
      // WIB should be 7 hours ahead
      expect(wib.getUTCHours()).toBe(17);
      expect(wib.getUTCDate()).toBe(2);
    });

    it('should handle midnight UTC correctly', () => {
      const utc = new Date('2025-01-02T00:00:00Z');
      const wib = utcToWib(utc);
      
      // 00:00 UTC = 07:00 WIB same day
      expect(wib.getUTCHours()).toBe(7);
      expect(wib.getUTCDate()).toBe(2);
    });

    it('should handle date boundary crossing', () => {
      const utc = new Date('2025-01-01T20:00:00Z');
      const wib = utcToWib(utc);
      
      // 20:00 UTC Jan 1 = 03:00 WIB Jan 2
      expect(wib.getUTCHours()).toBe(3);
      expect(wib.getUTCDate()).toBe(2);
    });
  });

  describe('wibToUtc', () => {
    it('should convert WIB to UTC (subtract 7 hours)', () => {
      // Create a date representing 17:00 WIB
      const wib = new Date('2025-01-02T17:00:00+07:00');
      const utc = wibToUtc(wib);
      
      // Verify the conversion subtracts 7 hours
      const expectedUtc = new Date(wib.getTime() - (7 * 60 * 60 * 1000));
      expect(utc.getTime()).toBe(expectedUtc.getTime());
    });

    it('should handle midnight WIB correctly', () => {
      // 00:00 WIB = 17:00 UTC previous day
      const wib = new Date('2025-01-02T00:00:00+07:00');
      const utc = wibToUtc(wib);
      
      const expectedUtc = new Date(wib.getTime() - (7 * 60 * 60 * 1000));
      expect(utc.getTime()).toBe(expectedUtc.getTime());
      expect(utc.getUTCDate()).toBe(1); // Should be previous day
    });
  });

  describe('isValidTimestamp', () => {
    it('should accept valid dates within range', () => {
      const validDate = new Date('2024-06-15T10:00:00Z');
      expect(isValidTimestamp(validDate)).toBe(true);
    });

    it('should reject dates before 2020', () => {
      const oldDate = new Date('2019-12-31T23:59:59Z');
      expect(isValidTimestamp(oldDate)).toBe(false);
    });

    it('should reject dates more than 1 year in future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      expect(isValidTimestamp(futureDate)).toBe(false);
    });

    it('should reject invalid dates', () => {
      const invalidDate = new Date('invalid');
      expect(isValidTimestamp(invalidDate)).toBe(false);
    });

    it('should accept current date', () => {
      const now = new Date();
      expect(isValidTimestamp(now)).toBe(true);
    });
  });

  describe('parseIsoToWib', () => {
    it('should parse valid ISO string and convert to WIB', () => {
      const isoString = '2025-01-02T10:00:00Z';
      const wib = parseIsoToWib(isoString);
      
      expect(wib.getUTCHours()).toBe(17);
      expect(wib.getUTCDate()).toBe(2);
    });

    it('should throw error for invalid ISO string', () => {
      expect(() => parseIsoToWib('invalid-date')).toThrow('Invalid ISO string format');
    });

    it('should throw error for empty string', () => {
      expect(() => parseIsoToWib('')).toThrow('Invalid ISO string: input must be a non-empty string');
    });

    it('should throw error for non-string input', () => {
      expect(() => parseIsoToWib(null as any)).toThrow('Invalid ISO string: input must be a non-empty string');
      expect(() => parseIsoToWib(undefined as any)).toThrow('Invalid ISO string: input must be a non-empty string');
    });

    it('should handle ISO string with timezone offset', () => {
      const isoString = '2025-01-02T17:00:00+07:00';
      const wib = parseIsoToWib(isoString);
      
      expect(wib).toBeInstanceOf(Date);
      expect(isNaN(wib.getTime())).toBe(false);
    });
  });

  describe('formatWib', () => {
    it('should format date in Indonesian locale with WIB timezone', () => {
      const date = new Date('2025-01-02T10:00:00Z');
      const formatted = formatWib(date);
      
      // Should contain Indonesian month name
      expect(formatted).toContain('Januari');
      // Should contain year
      expect(formatted).toContain('2025');
    });

    it('should handle different months correctly', () => {
      const dates = [
        { date: new Date('2025-02-15T10:00:00Z'), month: 'Februari' },
        { date: new Date('2025-03-15T10:00:00Z'), month: 'Maret' },
        { date: new Date('2025-12-15T10:00:00Z'), month: 'Desember' }
      ];

      dates.forEach(({ date, month }) => {
        const formatted = formatWib(date);
        expect(formatted).toContain(month);
      });
    });
  });

  describe('getWibDateBoundaries', () => {
    it('should calculate correct UTC boundaries for WIB date', () => {
      const boundaries = getWibDateBoundaries('2025-01-02');
      
      // Start: 2025-01-02 00:00:00 WIB = 2025-01-01 17:00:00 UTC
      expect(boundaries.startUtc).toBe('2025-01-01T17:00:00.000Z');
      
      // End: 2025-01-02 23:59:59 WIB = 2025-01-02 16:59:59 UTC
      expect(boundaries.endUtc).toBe('2025-01-02T16:59:59.000Z');
    });

    it('should handle month boundaries', () => {
      // Last day of month
      const lastDay = getWibDateBoundaries('2025-01-31');
      expect(lastDay.startUtc).toBe('2025-01-30T17:00:00.000Z');
      expect(lastDay.endUtc).toBe('2025-01-31T16:59:59.000Z');
      
      // First day of month
      const firstDay = getWibDateBoundaries('2025-02-01');
      expect(firstDay.startUtc).toBe('2025-01-31T17:00:00.000Z');
      expect(firstDay.endUtc).toBe('2025-02-01T16:59:59.000Z');
    });

    it('should handle year boundaries', () => {
      // Last day of year
      const lastDay = getWibDateBoundaries('2024-12-31');
      expect(lastDay.startUtc).toBe('2024-12-30T17:00:00.000Z');
      expect(lastDay.endUtc).toBe('2024-12-31T16:59:59.000Z');
      
      // First day of year
      const firstDay = getWibDateBoundaries('2025-01-01');
      expect(firstDay.startUtc).toBe('2024-12-31T17:00:00.000Z');
      expect(firstDay.endUtc).toBe('2025-01-01T16:59:59.000Z');
    });

    it('should throw error for invalid date format', () => {
      expect(() => getWibDateBoundaries('2025/01/02')).toThrow('Invalid date format');
      expect(() => getWibDateBoundaries('01-02-2025')).toThrow('Invalid date format');
      expect(() => getWibDateBoundaries('invalid')).toThrow('Invalid date format');
    });

    it('should throw error for invalid date values', () => {
      expect(() => getWibDateBoundaries('2025-13-01')).toThrow('Invalid date values');
      expect(() => getWibDateBoundaries('2025-01-32')).toThrow('Invalid date values');
      expect(() => getWibDateBoundaries('2025-00-15')).toThrow('Invalid date values');
    });
  });

  describe('getTodayWib', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const today = getTodayWib();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getWibDateFromTimestamp', () => {
    it('should extract WIB date from UTC timestamp', () => {
      // 2025-01-01 20:00 UTC = 2025-01-02 03:00 WIB
      const timestamp = '2025-01-01T20:00:00Z';
      const wibDate = getWibDateFromTimestamp(timestamp);
      expect(wibDate).toBe('2025-01-02');
    });

    it('should handle timestamps that stay in same day', () => {
      // 2025-01-02 10:00 UTC = 2025-01-02 17:00 WIB
      const timestamp = '2025-01-02T10:00:00Z';
      const wibDate = getWibDateFromTimestamp(timestamp);
      expect(wibDate).toBe('2025-01-02');
    });
  });

  describe('isTimestampInWibDate', () => {
    it('should return true for timestamp within WIB date', () => {
      // 2025-01-02 10:00 UTC = 2025-01-02 17:00 WIB (within Jan 2 WIB)
      expect(isTimestampInWibDate('2025-01-02T10:00:00Z', '2025-01-02')).toBe(true);
    });

    it('should return false for timestamp outside WIB date', () => {
      // 2025-01-01 10:00 UTC = 2025-01-01 17:00 WIB (not Jan 2 WIB)
      expect(isTimestampInWibDate('2025-01-01T10:00:00Z', '2025-01-02')).toBe(false);
    });

    it('should handle boundary cases correctly', () => {
      // 2025-01-01 17:00 UTC = 2025-01-02 00:00 WIB (start of Jan 2 WIB)
      expect(isTimestampInWibDate('2025-01-01T17:00:00Z', '2025-01-02')).toBe(true);
      
      // 2025-01-02 16:59:59 UTC = 2025-01-02 23:59:59 WIB (end of Jan 2 WIB)
      expect(isTimestampInWibDate('2025-01-02T16:59:59Z', '2025-01-02')).toBe(true);
      
      // 2025-01-02 17:00:00 UTC = 2025-01-03 00:00:00 WIB (start of Jan 3 WIB)
      expect(isTimestampInWibDate('2025-01-02T17:00:00Z', '2025-01-02')).toBe(false);
    });
  });

  describe('Round-trip conversions', () => {
    it('should preserve time when converting UTC -> WIB -> UTC', () => {
      const original = new Date('2025-01-02T10:30:45Z');
      const wib = utcToWib(original);
      const backToUtc = wibToUtc(wib);
      
      expect(backToUtc.getTime()).toBe(original.getTime());
    });

    it('should preserve time when converting WIB -> UTC -> WIB', () => {
      const original = new Date('2025-01-02T17:30:45+07:00');
      const utc = wibToUtc(original);
      const backToWib = utcToWib(utc);
      
      expect(backToWib.getTime()).toBe(original.getTime());
    });
  });
});
