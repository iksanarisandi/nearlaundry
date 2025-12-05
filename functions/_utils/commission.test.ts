import { describe, it, expect } from 'vitest';
import {
  calculateCommission,
  calculateCommissions,
  calculateTotalCommission,
  isValidProcess,
  isWeightRequired,
  VALID_PROCESSES,
  WEIGHT_OPTIONAL_PROCESSES
} from './commission';

describe('calculateCommission', () => {
  it('returns 0 for 0 kg', () => {
    expect(calculateCommission(0, 500)).toBe(0);
  });

  it('returns 0 for 0 rate', () => {
    expect(calculateCommission(10, 0)).toBe(0);
  });

  it('calculates correctly for whole numbers', () => {
    expect(calculateCommission(10, 500)).toBe(5000);
    expect(calculateCommission(25, 400)).toBe(10000);
  });

  it('rounds decimal results', () => {
    expect(calculateCommission(10.5, 500)).toBe(5250);
    expect(calculateCommission(7.3, 300)).toBe(2190);
  });
});

describe('calculateCommissions', () => {
  const rates = [
    { process: 'cuci', rate_per_kg: 500 },
    { process: 'kering', rate_per_kg: 400 },
    { process: 'setrika', rate_per_kg: 600 }
  ];

  it('returns empty array for empty productions', () => {
    expect(calculateCommissions([], rates)).toEqual([]);
  });

  it('calculates commissions for multiple processes', () => {
    const productions = [
      { process: 'cuci', total_kg: 10 },
      { process: 'kering', total_kg: 8 }
    ];

    const result = calculateCommissions(productions, rates);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      process: 'cuci',
      total_kg: 10,
      rate_per_kg: 500,
      total: 5000
    });
    expect(result[1]).toEqual({
      process: 'kering',
      total_kg: 8,
      rate_per_kg: 400,
      total: 3200
    });
  });

  it('uses 0 rate for unknown process', () => {
    const productions = [{ process: 'unknown', total_kg: 10 }];
    const result = calculateCommissions(productions, rates);
    
    expect(result[0].rate_per_kg).toBe(0);
    expect(result[0].total).toBe(0);
  });

  it('handles null/undefined total_kg', () => {
    const productions = [{ process: 'cuci', total_kg: null as any }];
    const result = calculateCommissions(productions, rates);
    
    expect(result[0].total).toBe(0);
  });
});

describe('calculateTotalCommission', () => {
  it('returns 0 for empty array', () => {
    expect(calculateTotalCommission([])).toBe(0);
  });

  it('sums all commission totals', () => {
    const commissions = [
      { process: 'cuci', total_kg: 10, rate_per_kg: 500, total: 5000 },
      { process: 'kering', total_kg: 8, rate_per_kg: 400, total: 3200 },
      { process: 'setrika', total_kg: 5, rate_per_kg: 600, total: 3000 }
    ];

    expect(calculateTotalCommission(commissions)).toBe(11200);
  });
});

describe('isValidProcess', () => {
  it('returns true for valid processes', () => {
    VALID_PROCESSES.forEach(process => {
      expect(isValidProcess(process)).toBe(true);
    });
  });

  it('returns false for invalid processes', () => {
    expect(isValidProcess('invalid')).toBe(false);
    expect(isValidProcess('')).toBe(false);
    expect(isValidProcess('CUCI')).toBe(false); // case sensitive
  });
});

describe('isWeightRequired', () => {
  it('returns false for cuci_satuan and cuci_sepatu', () => {
    expect(isWeightRequired('cuci_satuan')).toBe(false);
    expect(isWeightRequired('cuci_sepatu')).toBe(false);
  });

  it('returns true for other processes', () => {
    expect(isWeightRequired('cuci')).toBe(true);
    expect(isWeightRequired('kering')).toBe(true);
    expect(isWeightRequired('setrika')).toBe(true);
    expect(isWeightRequired('packing')).toBe(true);
  });
});
