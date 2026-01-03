/**
 * Timezone Utility Module
 * Handles conversion between UTC and WITA (UTC+8) timezones
 * for Cloudflare Workers application with D1 database
 * 
 * BEST PRACTICES:
 * 1. Database stores timestamps in UTC (with 'Z' suffix)
 * 2. Use getWitaDateBoundaries() for date-based queries
 * 3. Use getTodayWita() for "today" checks
 * 4. Use formatTimestampWita() for display
 * 5. Frontend must use timeZone: 'Asia/Makassar' in toLocaleString()
 * 
 * @see .kiro/steering/timezone-wita-best-practices.md
 */

const WITA_OFFSET_HOURS = 8;
const WITA_OFFSET_MS = WITA_OFFSET_HOURS * 60 * 60 * 1000;

// Legacy aliases for backward compatibility
const WIB_OFFSET_HOURS = WITA_OFFSET_HOURS;
const WIB_OFFSET_MS = WITA_OFFSET_MS;

/**
 * Get current date in WITA timezone as YYYY-MM-DD string
 * This is the primary function for getting "today" in WITA
 */
export function getTodayWita(): string {
  const now = new Date();
  // Add 8 hours to get WITA time
  const witaTime = new Date(now.getTime() + WITA_OFFSET_MS);
  return witaTime.toISOString().split('T')[0];
}

// Legacy alias
export const getTodayWib = getTodayWita;

/**
 * Get current datetime in WITA timezone as ISO string
 */
export function getNowWita(): Date {
  const now = new Date();
  return new Date(now.getTime() + WITA_OFFSET_MS);
}

// Legacy alias
export const getNowWib = getNowWita;

/**
 * Convert UTC Date to WITA timezone
 * @param utcDate - Date object in UTC
 * @returns Date object adjusted to WITA (UTC+8)
 */
export function utcToWita(utcDate: Date): Date {
  return new Date(utcDate.getTime() + WITA_OFFSET_MS);
}

// Legacy alias
export const utcToWib = utcToWita;

/**
 * Convert WITA Date to UTC timezone
 * @param witaDate - Date object in WITA
 * @returns Date object adjusted to UTC
 */
export function witaToUtc(witaDate: Date): Date {
  return new Date(witaDate.getTime() - WITA_OFFSET_MS);
}

// Legacy alias
export const wibToUtc = witaToUtc;

/**
 * Validate timestamp is within reasonable range
 * @param date - Date object to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimestamp(date: Date): boolean {
  if (isNaN(date.getTime())) {
    return false;
  }
  
  const minDate = new Date('2020-01-01T00:00:00Z');
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  
  return date >= minDate && date <= maxDate;
}

/**
 * Parse ISO string and convert to WIB Date
 * @param isoString - ISO 8601 timestamp string
 * @returns Date object in WIB timezone
 * @throws Error if ISO string is invalid
 */
export function parseIsoToWib(isoString: string): Date {
  if (!isoString || typeof isoString !== 'string') {
    throw new Error('Invalid ISO string: input must be a non-empty string');
  }
  
  const utcDate = new Date(isoString);
  
  if (isNaN(utcDate.getTime())) {
    throw new Error(`Invalid ISO string format: ${isoString}`);
  }
  
  return utcToWib(utcDate);
}

/**
 * Format Date to Indonesian locale string in WIB timezone
 * @param date - Date object to format (assumed to be UTC)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted string in Indonesian locale
 */
export function formatWib(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatOptions = options ? { ...options, timeZone: 'Asia/Jakarta' } : defaultOptions;
  
  return date.toLocaleString('id-ID', formatOptions);
}

/**
 * Format timestamp string to WIB display format
 * @param timestamp - ISO timestamp string from database
 * @returns Formatted string in Indonesian locale with WIB timezone
 */
export function formatTimestampWib(timestamp: string): string {
  const date = new Date(timestamp);
  return formatWib(date);
}

/**
 * Get WIB date boundaries for a given date string
 * Used for querying database with WIB date filter
 * @param dateString - Date in YYYY-MM-DD format (WIB date)
 * @returns Object with startUtc and endUtc ISO strings
 * @throws Error if date string format is invalid
 */
export function getWibDateBoundaries(dateString: string): {
  startUtc: string;
  endUtc: string;
} {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date values: ${dateString}`);
  }
  
  // WIB 00:00:00 = UTC 17:00:00 previous day
  // WIB 23:59:59 = UTC 16:59:59 same day
  const wibStart = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`);
  const wibEnd = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59+07:00`);
  
  if (isNaN(wibStart.getTime()) || isNaN(wibEnd.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  
  return {
    startUtc: wibStart.toISOString(),
    endUtc: wibEnd.toISOString()
  };
}

/**
 * Check if a UTC timestamp falls within a WIB date
 * @param timestamp - UTC timestamp string
 * @param wibDate - WIB date string (YYYY-MM-DD)
 * @returns true if timestamp is within the WIB date
 */
export function isTimestampInWibDate(timestamp: string, wibDate: string): boolean {
  const boundaries = getWibDateBoundaries(wibDate);
  const ts = new Date(timestamp).getTime();
  const start = new Date(boundaries.startUtc).getTime();
  const end = new Date(boundaries.endUtc).getTime();
  
  return ts >= start && ts <= end;
}

/**
 * Get WIB date string from a UTC timestamp
 * @param timestamp - UTC timestamp string
 * @returns WIB date string (YYYY-MM-DD)
 */
export function getWibDateFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const wibDate = utcToWib(date);
  return wibDate.toISOString().split('T')[0];
}


/**
 * Ensure timestamp has 'Z' suffix for proper UTC parsing
 * D1 SQLite may return timestamps without 'Z' suffix
 * @param timestamp - Timestamp string from database
 * @returns Timestamp with 'Z' suffix
 */
export function ensureUtcSuffix(timestamp: string): string {
  if (!timestamp) return timestamp;
  return timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
}

/**
 * Get current month and year in WIB timezone
 * Useful for payroll and monthly reports
 * @returns Object with month (1-12) and year
 */
export function getCurrentMonthWib(): { month: number; year: number } {
  const wibNow = getNowWib();
  return {
    month: wibNow.getMonth() + 1,
    year: wibNow.getFullYear()
  };
}

/**
 * Get WIB month boundaries for a given month/year
 * Used for monthly reports and payroll queries
 * @param month - Month number (1-12)
 * @param year - Year (e.g., 2025)
 * @returns Object with startUtc and endUtc ISO strings
 */
export function getWibMonthBoundaries(month: number, year: number): {
  startUtc: string;
  endUtc: string;
} {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Expected 1-12`);
  }
  
  // First day of month at 00:00:00 WIB
  const startWib = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+07:00`);
  
  // Last day of month at 23:59:59 WIB
  const lastDay = new Date(year, month, 0).getDate(); // Get last day of month
  const endWib = new Date(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59+07:00`);
  
  return {
    startUtc: startWib.toISOString(),
    endUtc: endWib.toISOString()
  };
}

/**
 * Format time only (HH:MM:SS) in WIB
 * @param timestamp - UTC timestamp string from database
 * @returns Time string in WIB (e.g., "14:30:00")
 */
export function formatTimeWib(timestamp: string): string {
  const date = new Date(ensureUtcSuffix(timestamp));
  return date.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Format date only (DD/MM/YYYY) in WIB
 * @param timestamp - UTC timestamp string from database
 * @returns Date string in WIB (e.g., "03/01/2025")
 */
export function formatDateWib(timestamp: string): string {
  const date = new Date(ensureUtcSuffix(timestamp));
  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
