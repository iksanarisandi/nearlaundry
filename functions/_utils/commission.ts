/**
 * Commission Calculation Helper Functions
 * For calculating komisi based on production weight and rates
 */

export interface CommissionRate {
  process: string;
  rate_per_kg: number;
}

export interface ProductionSummary {
  process: string;
  total_kg: number;
}

export interface CommissionResult {
  process: string;
  total_kg: number;
  rate_per_kg: number;
  total: number;
}

/**
 * Calculate commission for a single process
 * @param totalKg - Total weight in kg
 * @param ratePerKg - Rate per kg in Rupiah
 * @returns Commission amount (rounded)
 */
export function calculateCommission(totalKg: number, ratePerKg: number): number {
  return Math.round(totalKg * ratePerKg);
}

/**
 * Calculate commissions for multiple processes
 * @param productions - Array of production summaries
 * @param rates - Array of commission rates
 * @returns Array of commission results with totals
 */
export function calculateCommissions(
  productions: ProductionSummary[],
  rates: CommissionRate[]
): CommissionResult[] {
  const rateMap: Record<string, number> = {};
  rates.forEach(r => { rateMap[r.process] = r.rate_per_kg; });

  return productions.map(p => ({
    process: p.process,
    total_kg: p.total_kg,
    rate_per_kg: rateMap[p.process] || 0,
    total: calculateCommission(p.total_kg || 0, rateMap[p.process] || 0)
  }));
}

/**
 * Calculate total commission from commission results
 * @param commissions - Array of commission results
 * @returns Total commission amount
 */
export function calculateTotalCommission(commissions: CommissionResult[]): number {
  return commissions.reduce((sum, c) => sum + c.total, 0);
}

/**
 * Valid production processes
 */
export const VALID_PROCESSES = ['cuci', 'kering', 'setrika', 'packing', 'cuci_sepatu', 'cuci_satuan'] as const;
export type ProductionProcess = typeof VALID_PROCESSES[number];

/**
 * Check if a process is valid
 * @param process - Process name to validate
 * @returns true if valid
 */
export function isValidProcess(process: string): process is ProductionProcess {
  return VALID_PROCESSES.includes(process as ProductionProcess);
}

/**
 * Processes that don't require weight
 */
export const WEIGHT_OPTIONAL_PROCESSES: ProductionProcess[] = ['cuci_satuan', 'cuci_sepatu'];

/**
 * Check if weight is required for a process
 * @param process - Process name
 * @returns true if weight is required
 */
export function isWeightRequired(process: string): boolean {
  return !WEIGHT_OPTIONAL_PROCESSES.includes(process as ProductionProcess);
}
