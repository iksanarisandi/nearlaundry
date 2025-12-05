/**
 * Payroll Calculation Helper Functions
 * For calculating gaji bersih, pendapatan, and potongan
 */

export interface PayrollData {
  gaji_pokok: number;
  uang_makan: number;
  uang_transport: number;
  lembur_jam: number;
  lembur_jam_rate: number;
  lembur_libur: number;
  lembur_libur_rate: number;
  tunjangan_jabatan: number;
  thr: number;
  komisi_total: number;
  denda_terlambat: number;
  denda: number;
  kasbon: number;
}

export interface PayrollSummary {
  lembur_jam_total: number;
  lembur_libur_total: number;
  pendapatan: number;
  potongan: number;
  gaji_bersih: number;
}

export const DEFAULT_LEMBUR_JAM_RATE = 7000;
export const DEFAULT_LEMBUR_LIBUR_RATE = 35000;

/**
 * Calculate lembur jam total
 * @param jam - Overtime hours
 * @param rate - Rate per hour (default 7000)
 * @returns Total lembur jam amount
 */
export function calculateLemburJamTotal(jam: number, rate: number = DEFAULT_LEMBUR_JAM_RATE): number {
  return (jam || 0) * (rate || DEFAULT_LEMBUR_JAM_RATE);
}

/**
 * Calculate lembur libur total
 * @param jam - Holiday overtime hours
 * @param rate - Rate per hour (default 35000)
 * @returns Total lembur libur amount
 */
export function calculateLemburLiburTotal(jam: number, rate: number = DEFAULT_LEMBUR_LIBUR_RATE): number {
  return (jam || 0) * (rate || DEFAULT_LEMBUR_LIBUR_RATE);
}

/**
 * Calculate total pendapatan (income)
 * @param data - Payroll data
 * @returns Total pendapatan
 */
export function calculatePendapatan(data: Partial<PayrollData>): number {
  const lemburJamTotal = calculateLemburJamTotal(data.lembur_jam || 0, data.lembur_jam_rate);
  const lemburLiburTotal = calculateLemburLiburTotal(data.lembur_libur || 0, data.lembur_libur_rate);
  
  return (data.gaji_pokok || 0) +
         (data.uang_makan || 0) +
         (data.uang_transport || 0) +
         lemburJamTotal +
         lemburLiburTotal +
         (data.tunjangan_jabatan || 0) +
         (data.thr || 0) +
         (data.komisi_total || 0);
}

/**
 * Calculate total potongan (deductions)
 * @param data - Payroll data
 * @returns Total potongan
 */
export function calculatePotongan(data: Partial<PayrollData>): number {
  return (data.denda_terlambat || 0) +
         (data.denda || 0) +
         (data.kasbon || 0);
}

/**
 * Calculate gaji bersih (net salary)
 * @param data - Payroll data
 * @returns Gaji bersih
 */
export function calculateGajiBersih(data: Partial<PayrollData>): number {
  return calculatePendapatan(data) - calculatePotongan(data);
}

/**
 * Calculate full payroll summary
 * @param data - Payroll data
 * @returns PayrollSummary with all calculated values
 */
export function calculatePayrollSummary(data: Partial<PayrollData>): PayrollSummary {
  const lembur_jam_total = calculateLemburJamTotal(data.lembur_jam || 0, data.lembur_jam_rate);
  const lembur_libur_total = calculateLemburLiburTotal(data.lembur_libur || 0, data.lembur_libur_rate);
  const pendapatan = calculatePendapatan(data);
  const potongan = calculatePotongan(data);
  const gaji_bersih = pendapatan - potongan;

  return {
    lembur_jam_total,
    lembur_libur_total,
    pendapatan,
    potongan,
    gaji_bersih
  };
}
