/**
 * Attendance utility functions for annulment feature
 */

export interface AttendanceRecord {
  id: number;
  user_id: number;
  type: 'in' | 'out';
  timestamp: string;
  lat: number | null;
  lng: number | null;
  status: 'active' | 'annulled';
  annulled_by: number | null;
  annulled_at: string | null;
  annulled_reason: string | null;
}

export interface AnnulmentData {
  admin_id: number;
  reason: string;
  annulled_at: string;
}

/**
 * Validates that the annulment reason is non-empty
 * @param reason - The reason for annulment
 * @returns true if reason is valid (non-empty, non-whitespace)
 */
export function isValidAnnulmentReason(reason: unknown): boolean {
  if (typeof reason !== 'string') {
    return false;
  }
  return reason.trim().length > 0;
}

/**
 * Applies annulment to an attendance record while preserving original data
 * @param record - The original attendance record
 * @param annulmentData - The annulment metadata
 * @returns A new attendance record with annulment applied
 */
export function applyAnnulment(
  record: AttendanceRecord,
  annulmentData: AnnulmentData
): AttendanceRecord {
  return {
    // Preserve original data - these fields MUST NOT change
    id: record.id,
    user_id: record.user_id,
    type: record.type,
    timestamp: record.timestamp,
    lat: record.lat,
    lng: record.lng,
    // Apply annulment metadata
    status: 'annulled',
    annulled_by: annulmentData.admin_id,
    annulled_at: annulmentData.annulled_at,
    annulled_reason: annulmentData.reason.trim()
  };
}

/**
 * Checks if an attendance record can be annulled
 * @param record - The attendance record to check
 * @returns true if the record can be annulled (status is 'active')
 */
export function canAnnul(record: AttendanceRecord): boolean {
  return record.status === 'active';
}

/**
 * Filters attendance records to only include active (non-annulled) records
 * Used for payroll calculations
 * @param records - Array of attendance records
 * @returns Array of active attendance records
 */
export function filterActiveRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  return records.filter(record => record.status === 'active');
}

/**
 * Counts active attendance records for a user
 * @param records - Array of attendance records
 * @returns Count of active records
 */
export function countActiveAttendance(records: AttendanceRecord[]): number {
  return filterActiveRecords(records).length;
}

/**
 * Valid roles that can perform annulment
 */
export const ANNULMENT_ALLOWED_ROLES = ['admin'] as const;
export type AnnulmentAllowedRole = typeof ANNULMENT_ALLOWED_ROLES[number];

/**
 * Checks if a user role is authorized to perform annulment
 * @param role - The user's role
 * @returns true if the role is authorized to annul attendance records
 */
export function isAuthorizedToAnnul(role: string): boolean {
  return ANNULMENT_ALLOWED_ROLES.includes(role as AnnulmentAllowedRole);
}

/**
 * Audit log entry structure for annulment
 */
export interface AnnulmentAuditLogEntry {
  user_id: number;
  action: 'ATTENDANCE_ANNULLED';
  detail: string;
}

/**
 * Parsed audit log detail for annulment
 */
export interface AnnulmentAuditDetail {
  attendance_id: number;
  admin_id: number;
  reason: string;
  annulled_at: string;
  original_data: {
    user_id: number;
    type: 'in' | 'out';
    timestamp: string;
    lat: number | null;
    lng: number | null;
  };
}

/**
 * Creates an audit log entry for attendance annulment
 * @param adminId - The ID of the admin performing the annulment
 * @param attendanceId - The ID of the attendance record being annulled
 * @param reason - The reason for annulment
 * @param annulledAt - The timestamp of annulment
 * @param originalData - The original attendance data before annulment
 * @returns An audit log entry object ready to be inserted
 */
export function createAnnulmentAuditLog(
  adminId: number,
  attendanceId: number,
  reason: string,
  annulledAt: string,
  originalData: {
    user_id: number;
    type: 'in' | 'out';
    timestamp: string;
    lat: number | null;
    lng: number | null;
  }
): AnnulmentAuditLogEntry {
  const detail: AnnulmentAuditDetail = {
    attendance_id: attendanceId,
    admin_id: adminId,
    reason: reason.trim(),
    annulled_at: annulledAt,
    original_data: originalData
  };

  return {
    user_id: adminId,
    action: 'ATTENDANCE_ANNULLED',
    detail: JSON.stringify(detail)
  };
}

/**
 * Parses an audit log detail string into structured data
 * @param detailJson - The JSON string from audit log detail field
 * @returns Parsed audit detail or null if invalid
 */
export function parseAnnulmentAuditDetail(detailJson: string): AnnulmentAuditDetail | null {
  try {
    const parsed = JSON.parse(detailJson);
    // Validate required fields
    if (
      typeof parsed.attendance_id !== 'number' ||
      typeof parsed.admin_id !== 'number' ||
      typeof parsed.reason !== 'string' ||
      typeof parsed.annulled_at !== 'string' ||
      !parsed.original_data
    ) {
      return null;
    }
    return parsed as AnnulmentAuditDetail;
  } catch {
    return null;
  }
}

/**
 * Validates that an audit log entry contains all required annulment data
 * @param entry - The audit log entry to validate
 * @param expectedAttendanceId - The expected attendance ID
 * @param expectedAdminId - The expected admin ID
 * @param expectedReason - The expected reason (will be trimmed for comparison)
 * @returns true if the audit log entry is valid and contains expected data
 */
export function validateAnnulmentAuditLog(
  entry: AnnulmentAuditLogEntry,
  expectedAttendanceId: number,
  expectedAdminId: number,
  expectedReason: string
): boolean {
  if (entry.action !== 'ATTENDANCE_ANNULLED') {
    return false;
  }
  if (entry.user_id !== expectedAdminId) {
    return false;
  }
  
  const detail = parseAnnulmentAuditDetail(entry.detail);
  if (!detail) {
    return false;
  }
  
  return (
    detail.attendance_id === expectedAttendanceId &&
    detail.admin_id === expectedAdminId &&
    detail.reason === expectedReason.trim()
  );
}
