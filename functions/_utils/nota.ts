/**
 * Nota Number Utility Functions
 * 
 * Format: {OUTLET_CODE}.{MMM}{YY}.{SEQUENCE}
 * Example: U2.JAN26.001
 */

// Indonesian month abbreviations
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

// Valid month abbreviations for validation
const VALID_MONTHS = new Set(MONTH_ABBR);

export interface NotaParts {
  code: string;      // Outlet code (e.g., "U2")
  month: string;     // Month abbreviation (e.g., "JAN")
  year: string;      // 2-digit year (e.g., "26")
  sequence: string;  // Sequence number (e.g., "001")
}

/**
 * Generate outlet code from outlet name
 * Rules: First letter uppercase + any numbers present in the name
 * Examples: 
 *   "Uluwatu 2" -> "U2"
 *   "Outlet Pusat" -> "OP" 
 *   "Cabang 1" -> "C1"
 *   "Denpasar" -> "D"
 */
export function generateOutletCode(outletName: string): string {
  if (!outletName || typeof outletName !== 'string') {
    return '';
  }

  const trimmed = outletName.trim();
  if (!trimmed) {
    return '';
  }

  // Get first letter (uppercase)
  const firstLetter = trimmed.charAt(0).toUpperCase();
  
  // Extract all numbers from the name
  const numbers = trimmed.match(/\d+/g);
  const numberPart = numbers ? numbers.join('') : '';

  // Combine: first letter + numbers (max 5 chars total)
  const code = (firstLetter + numberPart).slice(0, 5);
  
  return code;
}

/**
 * Get month abbreviation in Indonesian
 * @param monthIndex 0-based month index (0 = January, 11 = December)
 */
export function getMonthAbbreviation(monthIndex: number): string {
  if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(monthIndex)) {
    return '';
  }
  return MONTH_ABBR[monthIndex];
}

/**
 * Generate nota prefix from outlet code and date
 * Format: {CODE}.{MMM}{YY}.
 * Example: generateNotaPrefix("U2", new Date("2026-01-15")) -> "U2.JAN26."
 */
export function generateNotaPrefix(outletCode: string, date: Date): string {
  if (!outletCode || typeof outletCode !== 'string') {
    return '';
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const code = outletCode.toUpperCase().trim();
  const month = getMonthAbbreviation(date.getMonth());
  const year = String(date.getFullYear()).slice(-2); // Last 2 digits

  if (!month) {
    return '';
  }

  return `${code}.${month}${year}.`;
}

/**
 * Parse nota number into components
 * Example: parseNotaNumber("U2.JAN26.001") -> { code: "U2", month: "JAN", year: "26", sequence: "001" }
 * Returns null if format is invalid
 */
export function parseNotaNumber(notaNumber: string): NotaParts | null {
  if (!notaNumber || typeof notaNumber !== 'string') {
    return null;
  }

  // Pattern: {CODE}.{MMM}{YY}.{SEQ}
  // CODE: 1-5 uppercase letters/digits
  // MMM: 3-letter month
  // YY: 2-digit year
  // SEQ: 1-4 digits
  const pattern = /^([A-Z0-9]{1,5})\.([A-Z]{3})(\d{2})\.(\d{1,4})$/;
  const match = notaNumber.trim().toUpperCase().match(pattern);

  if (!match) {
    return null;
  }

  const [, code, month, year, sequence] = match;

  // Validate month is a valid Indonesian abbreviation
  if (!VALID_MONTHS.has(month)) {
    return null;
  }

  return {
    code,
    month,
    year,
    sequence
  };
}

/**
 * Validate nota number format
 * Returns true if format matches {CODE}.{MMM}{YY}.{SEQ}
 */
export function isValidNotaFormat(notaNumber: string): boolean {
  return parseNotaNumber(notaNumber) !== null;
}

/**
 * Combine prefix and sequence to form complete nota number
 * Preserves leading zeros in sequence
 * Example: combineNotaNumber("U2.JAN26.", "001") -> "U2.JAN26.001"
 */
export function combineNotaNumber(prefix: string, sequence: string): string {
  if (!prefix || typeof prefix !== 'string') {
    return '';
  }

  if (!sequence || typeof sequence !== 'string') {
    return '';
  }

  // Validate sequence is 1-4 digits
  const seqTrimmed = sequence.trim();
  if (!/^\d{1,4}$/.test(seqTrimmed)) {
    return '';
  }

  // Ensure prefix ends with dot
  const prefixTrimmed = prefix.trim();
  const normalizedPrefix = prefixTrimmed.endsWith('.') ? prefixTrimmed : prefixTrimmed + '.';

  return normalizedPrefix + seqTrimmed;
}

/**
 * Validate outlet code format
 * Must be 1-5 characters, uppercase letters and digits only
 */
export function isValidOutletCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  return /^[A-Z0-9]{1,5}$/.test(code.trim().toUpperCase());
}

/**
 * Validate sequence format
 * Must be 1-4 digits
 */
export function isValidSequence(sequence: string): boolean {
  if (!sequence || typeof sequence !== 'string') {
    return false;
  }
  return /^\d{1,4}$/.test(sequence.trim());
}

/**
 * Extract sequence from a full nota number
 * Example: extractSequence("U2.JAN26.001") -> "001"
 */
export function extractSequence(notaNumber: string): string | null {
  const parts = parseNotaNumber(notaNumber);
  return parts ? parts.sequence : null;
}

/**
 * Reconstruct nota number from parts
 */
export function reconstructNotaNumber(parts: NotaParts): string {
  return `${parts.code}.${parts.month}${parts.year}.${parts.sequence}`;
}
