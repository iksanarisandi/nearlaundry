import { describe, it, expect } from 'vitest';
import {
  calculateMasaKerja,
  calculateTunjanganJabatan,
  calculateUangMakanRate,
  isLate,
  calculateDenda,
  SHIFT_CONFIG,
  LATE_TOLERANCE_MINUTES,
  DENDA_PER_LATE
} from './allowance';

describe('calculateMasaKerja', () => {
  it('returns 0 for same month as join date', () => {
    expect(calculateMasaKerja('2025-01-15', 1, 2025)).toBe(0);
  });

  it('calculates months correctly within same year', () => {
    expect(calculateMasaKerja('2025-01-01', 6, 2025)).toBe(5);
    expect(calculateMasaKerja('2025-01-01', 12, 2025)).toBe(11);
  });

  it('calculates months correctly across years', () => {
    expect(calculateMasaKerja('2024-01-01', 1, 2025)).toBe(12);
    expect(calculateMasaKerja('2023-06-01', 12, 2025)).toBe(30);
  });

  it('returns 0 for future join dates', () => {
    expect(calculateMasaKerja('2025-12-01', 1, 2025)).toBe(0);
  });
});

describe('calculateTunjanganJabatan', () => {
  it('returns 0 for masa kerja <= 12 months', () => {
    expect(calculateTunjanganJabatan(0)).toBe(0);
    expect(calculateTunjanganJabatan(6)).toBe(0);
    expect(calculateTunjanganJabatan(12)).toBe(0);
  });

  it('returns 150000 for masa kerja 13-24 months', () => {
    expect(calculateTunjanganJabatan(13)).toBe(150000);
    expect(calculateTunjanganJabatan(18)).toBe(150000);
    expect(calculateTunjanganJabatan(24)).toBe(150000);
  });

  it('returns 250000 for masa kerja 25-36 months', () => {
    expect(calculateTunjanganJabatan(25)).toBe(250000);
    expect(calculateTunjanganJabatan(26)).toBe(250000);
    expect(calculateTunjanganJabatan(36)).toBe(250000);
  });

  it('returns 350000 for masa kerja 37-48 months', () => {
    expect(calculateTunjanganJabatan(37)).toBe(350000);
    expect(calculateTunjanganJabatan(48)).toBe(350000);
  });
});

describe('calculateUangMakanRate', () => {
  it('returns 17000 for masa kerja <= 12 months', () => {
    expect(calculateUangMakanRate(0)).toBe(17000);
    expect(calculateUangMakanRate(12)).toBe(17000);
  });

  it('returns 20000 for masa kerja > 12 months', () => {
    expect(calculateUangMakanRate(13)).toBe(20000);
    expect(calculateUangMakanRate(24)).toBe(20000);
  });
});

describe('isLate', () => {
  it('shift pagi: not late if clock in at or before 07:15', () => {
    expect(isLate(new Date('2025-01-01T07:00:00'), 'pagi')).toBe(false);
    expect(isLate(new Date('2025-01-01T07:15:00'), 'pagi')).toBe(false);
  });

  it('shift pagi: late if clock in after 07:15', () => {
    expect(isLate(new Date('2025-01-01T07:16:00'), 'pagi')).toBe(true);
    expect(isLate(new Date('2025-01-01T08:00:00'), 'pagi')).toBe(true);
  });

  it('shift sore: not late if clock in at or before 14:15', () => {
    expect(isLate(new Date('2025-01-01T14:00:00'), 'sore')).toBe(false);
    expect(isLate(new Date('2025-01-01T14:15:00'), 'sore')).toBe(false);
  });

  it('shift sore: late if clock in after 14:15', () => {
    expect(isLate(new Date('2025-01-01T14:16:00'), 'sore')).toBe(true);
    expect(isLate(new Date('2025-01-01T15:00:00'), 'sore')).toBe(true);
  });
});

describe('calculateDenda', () => {
  it('returns 0 for no late days', () => {
    expect(calculateDenda(0)).toBe(0);
  });

  it('returns 25000 per late day', () => {
    expect(calculateDenda(1)).toBe(25000);
    expect(calculateDenda(3)).toBe(75000);
    expect(calculateDenda(5)).toBe(125000);
  });
});
