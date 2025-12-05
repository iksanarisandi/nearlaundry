import { describe, it, expect } from 'vitest';
import {
  calculateLemburJamTotal,
  calculateLemburLiburTotal,
  calculatePendapatan,
  calculatePotongan,
  calculateGajiBersih,
  calculatePayrollSummary,
  DEFAULT_LEMBUR_JAM_RATE,
  DEFAULT_LEMBUR_LIBUR_RATE
} from './payroll';

describe('calculateLemburJamTotal', () => {
  it('returns 0 for 0 hours', () => {
    expect(calculateLemburJamTotal(0)).toBe(0);
  });

  it('uses default rate of 7000', () => {
    expect(calculateLemburJamTotal(3)).toBe(21000);
    expect(calculateLemburJamTotal(5)).toBe(35000);
  });

  it('uses custom rate when provided', () => {
    expect(calculateLemburJamTotal(3, 10000)).toBe(30000);
  });

  it('handles null/undefined values', () => {
    expect(calculateLemburJamTotal(null as any)).toBe(0);
    expect(calculateLemburJamTotal(undefined as any)).toBe(0);
  });
});

describe('calculateLemburLiburTotal', () => {
  it('returns 0 for 0 hours', () => {
    expect(calculateLemburLiburTotal(0)).toBe(0);
  });

  it('uses default rate of 35000', () => {
    expect(calculateLemburLiburTotal(2)).toBe(70000);
    expect(calculateLemburLiburTotal(4)).toBe(140000);
  });

  it('uses custom rate when provided', () => {
    expect(calculateLemburLiburTotal(2, 50000)).toBe(100000);
  });
});

describe('calculatePendapatan', () => {
  it('returns 0 for empty data', () => {
    expect(calculatePendapatan({})).toBe(0);
  });

  it('sums all income components', () => {
    const data = {
      gaji_pokok: 2000000,
      uang_makan: 400000,
      uang_transport: 200000,
      lembur_jam: 5,
      lembur_jam_rate: 7000,
      lembur_libur: 2,
      lembur_libur_rate: 35000,
      tunjangan_jabatan: 150000,
      thr: 0,
      komisi_total: 100000
    };

    // 2000000 + 400000 + 200000 + 35000 + 70000 + 150000 + 0 + 100000 = 2955000
    expect(calculatePendapatan(data)).toBe(2955000);
  });

  it('handles partial data', () => {
    const data = {
      gaji_pokok: 2000000,
      uang_makan: 400000
    };

    expect(calculatePendapatan(data)).toBe(2400000);
  });
});

describe('calculatePotongan', () => {
  it('returns 0 for empty data', () => {
    expect(calculatePotongan({})).toBe(0);
  });

  it('sums all deduction components', () => {
    const data = {
      denda_terlambat: 50000,
      denda: 25000,
      kasbon: 500000
    };

    expect(calculatePotongan(data)).toBe(575000);
  });

  it('handles partial data', () => {
    const data = {
      kasbon: 300000
    };

    expect(calculatePotongan(data)).toBe(300000);
  });
});

describe('calculateGajiBersih', () => {
  it('returns pendapatan when no potongan', () => {
    const data = {
      gaji_pokok: 2000000,
      uang_makan: 400000
    };

    expect(calculateGajiBersih(data)).toBe(2400000);
  });

  it('subtracts potongan from pendapatan', () => {
    const data = {
      gaji_pokok: 2000000,
      uang_makan: 400000,
      kasbon: 500000,
      denda_terlambat: 50000
    };

    // 2400000 - 550000 = 1850000
    expect(calculateGajiBersih(data)).toBe(1850000);
  });

  it('can return negative value', () => {
    const data = {
      gaji_pokok: 100000,
      kasbon: 500000
    };

    expect(calculateGajiBersih(data)).toBe(-400000);
  });
});

describe('calculatePayrollSummary', () => {
  it('returns all calculated values', () => {
    const data = {
      gaji_pokok: 2000000,
      uang_makan: 400000,
      uang_transport: 200000,
      lembur_jam: 5,
      lembur_jam_rate: 7000,
      lembur_libur: 2,
      lembur_libur_rate: 35000,
      tunjangan_jabatan: 150000,
      thr: 0,
      komisi_total: 100000,
      denda_terlambat: 50000,
      denda: 0,
      kasbon: 300000
    };

    const summary = calculatePayrollSummary(data);

    expect(summary.lembur_jam_total).toBe(35000);
    expect(summary.lembur_libur_total).toBe(70000);
    expect(summary.pendapatan).toBe(2955000);
    expect(summary.potongan).toBe(350000);
    expect(summary.gaji_bersih).toBe(2605000);
  });

  it('handles empty data', () => {
    const summary = calculatePayrollSummary({});

    expect(summary.lembur_jam_total).toBe(0);
    expect(summary.lembur_libur_total).toBe(0);
    expect(summary.pendapatan).toBe(0);
    expect(summary.potongan).toBe(0);
    expect(summary.gaji_bersih).toBe(0);
  });
});
