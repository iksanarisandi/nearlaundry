import { describe, it, expect } from 'vitest';
import {
  utcToWita,
  witaToUtc,
  isValidTimestamp,
  parseIsoToWita,
  formatWita,
  getWitaDateBoundaries,
  getTodayWita,
  getWitaDateFromTimestamp,
  isTimestampInWitaDate,
  // Legacy aliases
  utcToWib,
  wibToUtc,
  parseIsoToWib,
  formatWib,
  getWibDateBoundaries,
  getTodayWib,
  getWibDateFromTimestamp,
  isTimestampInWibDate
} from './timezone';

describe('Timezone Utility Functions (WITA - UTC+8)', () => {
  describe('utcToWita', () => {
    it('should convert UTC to WITA (add 8 hours)', () => {
      const utc = new Date('2025-01-02T10:00:00Z');
      const wita = utcToWita(utc);
      
      // WITA should be 8 hours ahead
      expect(wita.getUTCHours()).toBe(18);
      expect(wita.getUTCDate()).toBe(2);
    });

    it('should handle midnight UTC correctly', () => {
      const utc = new Date('2025-01-02T00:00:00Z');
      const wita = utcToWita(utc);
      
      // 00:00 UTC = 08:00 WITA same day
      expect(wita.getUTCHours()).toBe(8);
      expect(wita.getUTCDate()).toBe(2);
    });

    it('should handle date boundary crossing', () => {
      const utc = new Date('2025-01-01T20:00:00Z');
      const wita = utcToWita(utc);
      
      // 20:00 UTC Jan 1 = 04:00 WITA Jan 2
      expect(wita.getUTCHours()).toBe(4);
      expect(wita.getUTCDate()).toBe(2);
    });
  });

  describe('witaToUtc', () => {
    it('should convert WITA to UTC (subtract 8 hours)', () => {
      // Create a date representing 18:00 WITA
      const wita = new Date('2025-01-02T18:00:00+08:00');
      const utc = witaToUtc(wita);
      
      // Verify the conversion subtracts 8 hours
      const expectedUtc = new Date(wita.getTime() - (8 * 60 * 60 * 1000));
      expect(utc.getTime()).toBe(expectedUtc.getTime());
    });

    it('should handle midnight WITA correctly', () => {
      // 00:00 WITA = 16:00 UTC previous day
      const wita = new Date('2025-01-02T00:00:00+08:00');
      const utc = witaToUtc(wita);
      
      const expectedUtc = new Date(wita.getTime() - (8 * 60 * 60 * 1000));
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

  describe('parseIsoToWita', () => {
    it('should parse valid ISO string and convert to WITA', () => {
      const isoString = '2025-01-02T10:00:00Z';
      const wita = parseIsoToWita(isoString);
      
      expect(wita.getUTCHours()).toBe(18);
      expect(wita.getUTCDate()).toBe(2);
    });

    it('should throw error for invalid ISO string', () => {
      expect(() => parseIsoToWita('invalid-date')).toThrow('Invalid ISO string format');
    });

    it('should throw error for empty string', () => {
      expect(() => parseIsoToWita('')).toThrow('Invalid ISO string: input must be a non-empty string');
    });

    it('should throw error for non-string input', () => {
      expect(() => parseIsoToWita(null as any)).toThrow('Invalid ISO string: input must be a non-empty string');
      expect(() => parseIsoToWita(undefined as any)).toThrow('Invalid ISO string: input must be a non-empty string');
    });

    it('should handle ISO string with timezone offset', () => {
      const isoString = '2025-01-02T18:00:00+08:00';
      const wita = parseIsoToWita(isoString);
      
      expect(wita).toBeInstanceOf(Date);
      expect(isNaN(wita.getTime())).toBe(false);
    });
  });

  describe('formatWita', () => {
    it('should format date in Indonesian locale with WITA timezone', () => {
      const date = new Date('2025-01-02T10:00:00Z');
      const formatted = formatWita(date);
      
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
        const formatted = formatWita(date);
        expect(formatted).toContain(month);
      });
    });
  });

  describe('getWitaDateBoundaries', () => {
    it('should calculate correct UTC boundaries for WITA date', () => {
      const boundaries = getWitaDateBoundaries('2025-01-02');
      
      // Start: 2025-01-02 00:00:00 WITA = 2025-01-01 16:00:00 UTC
      expect(boundaries.startUtc).toBe('2025-01-01T16:00:00.000Z');
      
      // End: 2025-01-02 23:59:59 WITA = 2025-01-02 15:59:59 UTC
      expect(boundaries.endUtc).toBe('2025-01-02T15:59:59.000Z');
    });

    it('should handle month boundaries', () => {
      // Last day of month
      const lastDay = getWitaDateBoundaries('2025-01-31');
      expect(lastDay.startUtc).toBe('2025-01-30T16:00:00.000Z');
      expect(lastDay.endUtc).toBe('2025-01-31T15:59:59.000Z');
      
      // First day of month
      const firstDay = getWitaDateBoundaries('2025-02-01');
      expect(firstDay.startUtc).toBe('2025-01-31T16:00:00.000Z');
      expect(firstDay.endUtc).toBe('2025-02-01T15:59:59.000Z');
    });

    it('should handle year boundaries', () => {
      // Last day of year
      const lastDay = getWitaDateBoundaries('2024-12-31');
      expect(lastDay.startUtc).toBe('2024-12-30T16:00:00.000Z');
      expect(lastDay.endUtc).toBe('2024-12-31T15:59:59.000Z');
      
      // First day of year
      const firstDay = getWitaDateBoundaries('2025-01-01');
      expect(firstDay.startUtc).toBe('2024-12-31T16:00:00.000Z');
      expect(firstDay.endUtc).toBe('2025-01-01T15:59:59.000Z');
    });

    it('should throw error for invalid date format', () => {
      expect(() => getWitaDateBoundaries('2025/01/02')).toThrow('Invalid date format');
      expect(() => getWitaDateBoundaries('01-02-2025')).toThrow('Invalid date format');
      expect(() => getWitaDateBoundaries('invalid')).toThrow('Invalid date format');
    });

    it('should throw error for invalid date values', () => {
      expect(() => getWitaDateBoundaries('2025-13-01')).toThrow('Invalid date values');
      expect(() => getWitaDateBoundaries('2025-01-32')).toThrow('Invalid date values');
      expect(() => getWitaDateBoundaries('2025-00-15')).toThrow('Invalid date values');
    });
  });

  describe('getTodayWita', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const today = getTodayWita();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getWitaDateFromTimestamp', () => {
    it('should extract WITA date from UTC timestamp', () => {
      // 2025-01-01 20:00 UTC = 2025-01-02 04:00 WITA
      const timestamp = '2025-01-01T20:00:00Z';
      const witaDate = getWitaDateFromTimestamp(timestamp);
      expect(witaDate).toBe('2025-01-02');
    });

    it('should handle timestamps that stay in same day', () => {
      // 2025-01-02 10:00 UTC = 2025-01-02 18:00 WITA
      const timestamp = '2025-01-02T10:00:00Z';
      const witaDate = getWitaDateFromTimestamp(timestamp);
      expect(witaDate).toBe('2025-01-02');
    });
  });

  describe('isTimestampInWitaDate', () => {
    it('should return true for timestamp within WITA date', () => {
      // 2025-01-02 10:00 UTC = 2025-01-02 18:00 WITA (within Jan 2 WITA)
      expect(isTimestampInWitaDate('2025-01-02T10:00:00Z', '2025-01-02')).toBe(true);
    });

    it('should return false for timestamp outside WITA date', () => {
      // 2025-01-01 10:00 UTC = 2025-01-01 18:00 WITA (not Jan 2 WITA)
      expect(isTimestampInWitaDate('2025-01-01T10:00:00Z', '2025-01-02')).toBe(false);
    });

    it('should handle boundary cases correctly', () => {
      // 2025-01-01 16:00 UTC = 2025-01-02 00:00 WITA (start of Jan 2 WITA)
      expect(isTimestampInWitaDate('2025-01-01T16:00:00Z', '2025-01-02')).toBe(true);
      
      // 2025-01-02 15:59:59 UTC = 2025-01-02 23:59:59 WITA (end of Jan 2 WITA)
      expect(isTimestampInWitaDate('2025-01-02T15:59:59Z', '2025-01-02')).toBe(true);
      
      // 2025-01-02 16:00:00 UTC = 2025-01-03 00:00:00 WITA (start of Jan 3 WITA)
      expect(isTimestampInWitaDate('2025-01-02T16:00:00Z', '2025-01-02')).toBe(false);
    });
  });

  describe('Round-trip conversions', () => {
    it('should preserve time when converting UTC -> WITA -> UTC', () => {
      const original = new Date('2025-01-02T10:30:45Z');
      const wita = utcToWita(original);
      const backToUtc = witaToUtc(wita);
      
      expect(backToUtc.getTime()).toBe(original.getTime());
    });

    it('should preserve time when converting WITA -> UTC -> WITA', () => {
      const original = new Date('2025-01-02T18:30:45+08:00');
      const utc = witaToUtc(original);
      const backToWita = utcToWita(utc);
      
      expect(backToWita.getTime()).toBe(original.getTime());
    });
  });

  describe('Legacy aliases (backward compatibility)', () => {
    it('utcToWib should be alias for utcToWita', () => {
      const utc = new Date('2025-01-02T10:00:00Z');
      expect(utcToWib(utc).getTime()).toBe(utcToWita(utc).getTime());
    });

    it('wibToUtc should be alias for witaToUtc', () => {
      const wita = new Date('2025-01-02T18:00:00+08:00');
      expect(wibToUtc(wita).getTime()).toBe(witaToUtc(wita).getTime());
    });

    it('getTodayWib should be alias for getTodayWita', () => {
      expect(getTodayWib()).toBe(getTodayWita());
    });

    it('getWibDateBoundaries should be alias for getWitaDateBoundaries', () => {
      const wib = getWibDateBoundaries('2025-01-02');
      const wita = getWitaDateBoundaries('2025-01-02');
      expect(wib.startUtc).toBe(wita.startUtc);
      expect(wib.endUtc).toBe(wita.endUtc);
    });
  });
});
