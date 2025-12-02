/**
 * Allowance Calculation Helper Functions
 * For calculating tunjangan jabatan, uang makan, and denda keterlambatan
 */

// Shift configuration
export const SHIFT_CONFIG = {
  pagi: { startHour: 7, startMinute: 0 },   // 07:00 WITA
  sore: { startHour: 14, startMinute: 0 }   // 14:00 WITA
};

export const LATE_TOLERANCE_MINUTES = 15;
export const DENDA_PER_LATE = 25000;
export const UANG_TRANSPORT_PER_DAY = 10000;
export const LEMBUR_RATE_PER_HOUR = 7000;
export const LEMBUR_MIN_HOURS = 3;
export const JAM_KERJA_NORMAL = 8;

/**
 * Calculate masa kerja (tenure) in months
 * @param joinDate - Employee join date in YYYY-MM-DD format
 * @param month - Payroll month (1-12)
 * @param year - Payroll year
 * @returns Number of months worked
 */
export function calculateMasaKerja(joinDate: string, month: number, year: number): number {
  const join = new Date(joinDate);
  const payroll = new Date(year, month - 1, 1);
  
  const months = (payroll.getFullYear() - join.getFullYear()) * 12 
                 + (payroll.getMonth() - join.getMonth());
  
  return Math.max(0, months);
}

/**
 * Calculate tunjangan jabatan based on masa kerja
 * - 0-12 months: Rp 0
 * - 13-24 months: Rp 150,000
 * - 25-36 months: Rp 250,000
 * - 37-48 months: Rp 350,000
 * - etc.
 * @param masaKerjaBulan - Tenure in months
 * @returns Tunjangan jabatan amount in Rupiah
 */
export function calculateTunjanganJabatan(masaKerjaBulan: number): number {
  if (masaKerjaBulan <= 12) {
    return 0;
  }
  
  // After first 12 months, get 150rb
  // Every 12 months after that, +100rb
  const periodsAfterFirst = Math.floor((masaKerjaBulan - 1) / 12);
  
  if (periodsAfterFirst === 1) {
    return 150000; // 13-24 months
  }
  
  // 25+ months: 150rb + (periods - 1) * 100rb
  return 150000 + (periodsAfterFirst - 1) * 100000;
}


/**
 * Get uang makan rate based on masa kerja
 * - <= 12 months: Rp 17,000 per day
 * - > 12 months: Rp 20,000 per day
 * @param masaKerjaBulan - Tenure in months
 * @returns Rate per attendance day in Rupiah
 */
export function calculateUangMakanRate(masaKerjaBulan: number): number {
  return masaKerjaBulan > 12 ? 20000 : 17000;
}

/**
 * Check if an employee is late based on clock-in time and shift
 * @param clockInTime - Clock-in timestamp (Date object or string)
 * @param shift - Shift type ('pagi' or 'sore')
 * @returns true if late (more than 15 minutes after shift start)
 */
export function isLate(clockInTime: Date | string, shift: 'pagi' | 'sore'): boolean {
  const clockIn = typeof clockInTime === 'string' ? new Date(clockInTime) : clockInTime;
  const shiftStart = SHIFT_CONFIG[shift];
  
  const clockInMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
  const shiftStartMinutes = shiftStart.startHour * 60 + shiftStart.startMinute;
  const toleranceMinutes = shiftStartMinutes + LATE_TOLERANCE_MINUTES;
  
  return clockInMinutes > toleranceMinutes;
}

/**
 * Calculate denda (penalty) for late attendance
 * @param lateCount - Number of late days
 * @returns Total denda amount in Rupiah
 */
export function calculateDenda(lateCount: number): number {
  return lateCount * DENDA_PER_LATE;
}

/**
 * Generate formula description for tunjangan jabatan
 * @param masaKerjaBulan - Tenure in months
 * @param amount - Calculated amount
 * @returns Formula description string
 */
export function getTunjanganJabatanFormula(masaKerjaBulan: number, amount: number): string {
  if (masaKerjaBulan <= 12) {
    return `Masa kerja ${masaKerjaBulan} bulan (≤12 bulan): Rp 0`;
  }
  return `Masa kerja ${masaKerjaBulan} bulan (>12 bulan): Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Generate formula description for uang makan
 * @param attendanceCount - Number of attendance days
 * @param rate - Rate per day
 * @param masaKerjaBulan - Tenure in months
 * @returns Formula description string
 */
export function getUangMakanFormula(attendanceCount: number, rate: number, masaKerjaBulan: number): string {
  const rateDesc = masaKerjaBulan > 12 ? 'masa kerja >12 bulan' : 'masa kerja ≤12 bulan';
  return `${attendanceCount} hari x Rp ${rate.toLocaleString('id-ID')} (${rateDesc})`;
}

/**
 * Generate formula description for denda keterlambatan
 * @param lateCount - Number of late days
 * @returns Formula description string
 */
export function getDendaFormula(lateCount: number): string {
  if (lateCount === 0) {
    return 'Tidak ada keterlambatan';
  }
  return `${lateCount} hari terlambat x Rp ${DENDA_PER_LATE.toLocaleString('id-ID')}`;
}

/**
 * Calculate uang transport based on attendance count
 * @param attendanceCount - Number of attendance days
 * @returns Total uang transport in Rupiah
 */
export function calculateUangTransport(attendanceCount: number): number {
  return attendanceCount * UANG_TRANSPORT_PER_DAY;
}

/**
 * Calculate overtime hours from work duration
 * Normal work hours: 8 hours
 * Overtime only counted if >= 3 hours, otherwise 0
 * @param workHours - Total work hours (clock-in to clock-out)
 * @returns Overtime hours (0 if < 3 hours overtime)
 */
export function calculateLemburJam(workHours: number): number {
  const overtime = workHours - JAM_KERJA_NORMAL;
  if (overtime < LEMBUR_MIN_HOURS) {
    return 0;
  }
  return overtime;
}

/**
 * Calculate lembur amount
 * @param lemburJam - Overtime hours
 * @returns Total lembur amount in Rupiah
 */
export function calculateLemburAmount(lemburJam: number): number {
  return lemburJam * LEMBUR_RATE_PER_HOUR;
}

/**
 * Generate formula description for uang transport
 * @param attendanceCount - Number of attendance days
 * @returns Formula description string
 */
export function getUangTransportFormula(attendanceCount: number): string {
  return `${attendanceCount} hari x Rp ${UANG_TRANSPORT_PER_DAY.toLocaleString('id-ID')}`;
}

/**
 * Generate formula description for lembur
 * @param lemburJam - Overtime hours
 * @returns Formula description string
 */
export function getLemburFormula(lemburJam: number): string {
  if (lemburJam === 0) {
    return 'Tidak ada lembur (< 3 jam)';
  }
  return `${lemburJam} jam x Rp ${LEMBUR_RATE_PER_HOUR.toLocaleString('id-ID')}`;
}
