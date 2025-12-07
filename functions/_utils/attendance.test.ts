import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  AttendanceRecord,
  AnnulmentData,
  applyAnnulment,
  isValidAnnulmentReason,
  canAnnul,
  filterActiveRecords,
  countActiveAttendance,
  isAuthorizedToAnnul,
  ANNULMENT_ALLOWED_ROLES,
  createAnnulmentAuditLog,
  parseAnnulmentAuditDetail,
  validateAnnulmentAuditLog,
  AnnulmentAuditLogEntry
} from './attendance';

// Helper to generate ISO timestamp strings
const isoTimestampArb = fc.tuple(
  fc.integer({ min: 2020, max: 2030 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 }),
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 }),
  fc.integer({ min: 0, max: 59 })
).map(([year, month, day, hour, min, sec]) => {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const h = String(hour).padStart(2, '0');
  const mi = String(min).padStart(2, '0');
  const s = String(sec).padStart(2, '0');
  return `${year}-${m}-${d}T${h}:${mi}:${s}Z`;
});

// Arbitrary for generating valid attendance records
const attendanceRecordArb = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  user_id: fc.integer({ min: 1, max: 10000 }),
  type: fc.constantFrom('in' as const, 'out' as const),
  timestamp: isoTimestampArb,
  lat: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
  lng: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
  status: fc.constant('active' as const),
  annulled_by: fc.constant(null as number | null),
  annulled_at: fc.constant(null as string | null),
  annulled_reason: fc.constant(null as string | null)
});

// Arbitrary for generating annulment data
const annulmentDataArb = fc.record({
  admin_id: fc.integer({ min: 1, max: 10000 }),
  reason: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  annulled_at: isoTimestampArb
});

describe('Attendance Annulment', () => {
  /**
   * **Feature: attendance-annulment, Property 1: Annulment preserves original data**
   * **Validates: Requirements 1.4**
   * 
   * For any attendance record that is annulled, the original attendance data 
   * (user_id, type, timestamp, lat, lng) SHALL remain unchanged after annulment.
   */
  describe('Property 1: Annulment preserves original data', () => {
    it('should preserve all original attendance data after annulment', () => {
      fc.assert(
        fc.property(
          attendanceRecordArb,
          annulmentDataArb,
          (record, annulmentData) => {
            const annulledRecord = applyAnnulment(record, annulmentData);
            
            // Original data must be preserved
            expect(annulledRecord.id).toBe(record.id);
            expect(annulledRecord.user_id).toBe(record.user_id);
            expect(annulledRecord.type).toBe(record.type);
            expect(annulledRecord.timestamp).toBe(record.timestamp);
            expect(annulledRecord.lat).toBe(record.lat);
            expect(annulledRecord.lng).toBe(record.lng);
            
            // Annulment metadata must be applied
            expect(annulledRecord.status).toBe('annulled');
            expect(annulledRecord.annulled_by).toBe(annulmentData.admin_id);
            expect(annulledRecord.annulled_at).toBe(annulmentData.annulled_at);
            expect(annulledRecord.annulled_reason).toBe(annulmentData.reason.trim());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: attendance-annulment, Property 2: Annulment requires valid reason**
   * **Validates: Requirements 1.3**
   * 
   * For any annulment request, if the reason is empty or whitespace-only, 
   * the system SHALL reject the request and the attendance record status SHALL remain unchanged.
   */
  describe('Property 2: Annulment requires valid reason', () => {
    // Arbitrary for generating invalid reasons (empty or whitespace-only strings)
    const whitespaceCharArb = fc.constantFrom(' ', '\t', '\n', '\r');
    const whitespaceOnlyArb = fc.array(whitespaceCharArb, { minLength: 1, maxLength: 20 })
      .map(chars => chars.join(''));
    const invalidReasonArb = fc.oneof(
      fc.constant(''),
      whitespaceOnlyArb
    );

    it('should reject empty or whitespace-only reasons', () => {
      fc.assert(
        fc.property(
          invalidReasonArb,
          (invalidReason) => {
            // isValidAnnulmentReason should return false for invalid reasons
            expect(isValidAnnulmentReason(invalidReason)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid non-empty reasons', () => {
      // Arbitrary for valid reasons (non-empty strings with at least one non-whitespace char)
      const validReasonArb = fc.string({ minLength: 1, maxLength: 500 })
        .filter(s => s.trim().length > 0);

      fc.assert(
        fc.property(
          validReasonArb,
          (validReason) => {
            // isValidAnnulmentReason should return true for valid reasons
            expect(isValidAnnulmentReason(validReason)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: attendance-annulment, Property 5: Only admin can annul**
   * **Validates: Requirements 1.1**
   * 
   * For any annulment request from a non-admin user, the system SHALL reject 
   * the request with 403 status and the attendance record SHALL remain unchanged.
   */
  describe('Property 5: Only admin can annul', () => {
    // All possible roles in the system
    const allRoles = ['admin', 'gudang', 'produksi', 'kurir'] as const;
    const nonAdminRoles = allRoles.filter(role => !ANNULMENT_ALLOWED_ROLES.includes(role as any));
    
    it('should authorize only admin role for annulment', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allRoles),
          (role) => {
            const isAuthorized = isAuthorizedToAnnul(role);
            const shouldBeAuthorized = ANNULMENT_ALLOWED_ROLES.includes(role as any);
            expect(isAuthorized).toBe(shouldBeAuthorized);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all non-admin roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...nonAdminRoles),
          (nonAdminRole) => {
            // Non-admin roles should not be authorized
            expect(isAuthorizedToAnnul(nonAdminRole)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject unknown roles', () => {
      // Arbitrary for generating random role strings that are not valid roles
      const unknownRoleArb = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => !allRoles.includes(s as any));

      fc.assert(
        fc.property(
          unknownRoleArb,
          (unknownRole) => {
            // Unknown roles should not be authorized
            expect(isAuthorizedToAnnul(unknownRole)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: attendance-annulment, Property 4: Annulment creates audit trail**
   * **Validates: Requirements 4.1**
   * 
   * For any successful annulment operation, there SHALL exist exactly one 
   * corresponding audit log entry containing the attendance_id, admin_id, and reason.
   */
  describe('Property 4: Annulment creates audit trail', () => {
    // Arbitrary for original attendance data
    const originalDataArb = fc.record({
      user_id: fc.integer({ min: 1, max: 10000 }),
      type: fc.constantFrom('in' as const, 'out' as const),
      timestamp: isoTimestampArb,
      lat: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
      lng: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null })
    });

    // Arbitrary for valid reason (non-empty, non-whitespace)
    const validReasonArb = fc.string({ minLength: 1, maxLength: 500 })
      .filter(s => s.trim().length > 0);

    it('should create audit log entry with all required fields', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // adminId
          fc.integer({ min: 1, max: 100000 }), // attendanceId
          validReasonArb,
          isoTimestampArb, // annulledAt
          originalDataArb,
          (adminId, attendanceId, reason, annulledAt, originalData) => {
            const auditLog = createAnnulmentAuditLog(
              adminId,
              attendanceId,
              reason,
              annulledAt,
              originalData
            );

            // Audit log must have correct action
            expect(auditLog.action).toBe('ATTENDANCE_ANNULLED');
            
            // Audit log must have admin ID as user_id
            expect(auditLog.user_id).toBe(adminId);
            
            // Detail must be valid JSON
            const detail = parseAnnulmentAuditDetail(auditLog.detail);
            expect(detail).not.toBeNull();
            
            // Detail must contain attendance_id
            expect(detail!.attendance_id).toBe(attendanceId);
            
            // Detail must contain admin_id
            expect(detail!.admin_id).toBe(adminId);
            
            // Detail must contain reason (trimmed)
            expect(detail!.reason).toBe(reason.trim());
            
            // Detail must contain annulled_at timestamp
            expect(detail!.annulled_at).toBe(annulledAt);
            
            // Detail must contain original data (compare individual fields to handle -0 vs 0)
            expect(detail!.original_data.user_id).toBe(originalData.user_id);
            expect(detail!.original_data.type).toBe(originalData.type);
            expect(detail!.original_data.timestamp).toBe(originalData.timestamp);
            // Use Object.is for lat/lng to handle -0 vs 0 edge case in JSON serialization
            expect(detail!.original_data.lat === originalData.lat || 
              (detail!.original_data.lat === 0 && originalData.lat === 0)).toBe(true);
            expect(detail!.original_data.lng === originalData.lng ||
              (detail!.original_data.lng === 0 && originalData.lng === 0)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate audit log entry correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // adminId
          fc.integer({ min: 1, max: 100000 }), // attendanceId
          validReasonArb,
          isoTimestampArb, // annulledAt
          originalDataArb,
          (adminId, attendanceId, reason, annulledAt, originalData) => {
            const auditLog = createAnnulmentAuditLog(
              adminId,
              attendanceId,
              reason,
              annulledAt,
              originalData
            );

            // Validation should pass with correct expected values
            expect(validateAnnulmentAuditLog(
              auditLog,
              attendanceId,
              adminId,
              reason
            )).toBe(true);
            
            // Validation should fail with wrong attendance_id
            expect(validateAnnulmentAuditLog(
              auditLog,
              attendanceId + 1,
              adminId,
              reason
            )).toBe(false);
            
            // Validation should fail with wrong admin_id
            expect(validateAnnulmentAuditLog(
              auditLog,
              attendanceId,
              adminId + 1,
              reason
            )).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid audit log entries', () => {
      // Test with invalid JSON
      const invalidEntry: AnnulmentAuditLogEntry = {
        user_id: 1,
        action: 'ATTENDANCE_ANNULLED',
        detail: 'not valid json'
      };
      expect(parseAnnulmentAuditDetail(invalidEntry.detail)).toBeNull();
      
      // Test with missing fields
      const incompleteEntry: AnnulmentAuditLogEntry = {
        user_id: 1,
        action: 'ATTENDANCE_ANNULLED',
        detail: JSON.stringify({ attendance_id: 1 }) // missing other fields
      };
      expect(parseAnnulmentAuditDetail(incompleteEntry.detail)).toBeNull();
    });
  });
});

// Unit tests for supporting functions
describe('isValidAnnulmentReason', () => {
  it('returns true for non-empty strings', () => {
    expect(isValidAnnulmentReason('Sakit')).toBe(true);
    expect(isValidAnnulmentReason('Pulang darurat')).toBe(true);
    expect(isValidAnnulmentReason('  Valid reason  ')).toBe(true);
  });

  it('returns false for empty or whitespace strings', () => {
    expect(isValidAnnulmentReason('')).toBe(false);
    expect(isValidAnnulmentReason('   ')).toBe(false);
    expect(isValidAnnulmentReason('\t\n')).toBe(false);
  });

  it('returns false for non-strings', () => {
    expect(isValidAnnulmentReason(null)).toBe(false);
    expect(isValidAnnulmentReason(undefined)).toBe(false);
    expect(isValidAnnulmentReason(123)).toBe(false);
    expect(isValidAnnulmentReason({})).toBe(false);
  });
});

describe('canAnnul', () => {
  it('returns true for active records', () => {
    const activeRecord: AttendanceRecord = {
      id: 1,
      user_id: 1,
      type: 'in',
      timestamp: '2025-01-01T08:00:00Z',
      lat: null,
      lng: null,
      status: 'active',
      annulled_by: null,
      annulled_at: null,
      annulled_reason: null
    };
    expect(canAnnul(activeRecord)).toBe(true);
  });

  it('returns false for already annulled records', () => {
    const annulledRecord: AttendanceRecord = {
      id: 1,
      user_id: 1,
      type: 'in',
      timestamp: '2025-01-01T08:00:00Z',
      lat: null,
      lng: null,
      status: 'annulled',
      annulled_by: 1,
      annulled_at: '2025-01-01T10:00:00Z',
      annulled_reason: 'Sakit'
    };
    expect(canAnnul(annulledRecord)).toBe(false);
  });
});

describe('filterActiveRecords', () => {
  it('filters out annulled records', () => {
    const records: AttendanceRecord[] = [
      {
        id: 1, user_id: 1, type: 'in', timestamp: '2025-01-01T08:00:00Z',
        lat: null, lng: null, status: 'active',
        annulled_by: null, annulled_at: null, annulled_reason: null
      },
      {
        id: 2, user_id: 1, type: 'out', timestamp: '2025-01-01T17:00:00Z',
        lat: null, lng: null, status: 'annulled',
        annulled_by: 1, annulled_at: '2025-01-01T18:00:00Z', annulled_reason: 'Sakit'
      },
      {
        id: 3, user_id: 2, type: 'in', timestamp: '2025-01-01T08:00:00Z',
        lat: null, lng: null, status: 'active',
        annulled_by: null, annulled_at: null, annulled_reason: null
      }
    ];
    
    const activeRecords = filterActiveRecords(records);
    expect(activeRecords).toHaveLength(2);
    expect(activeRecords.every(r => r.status === 'active')).toBe(true);
  });

  it('returns empty array when all records are annulled', () => {
    const records: AttendanceRecord[] = [
      {
        id: 1, user_id: 1, type: 'in', timestamp: '2025-01-01T08:00:00Z',
        lat: null, lng: null, status: 'annulled',
        annulled_by: 1, annulled_at: '2025-01-01T10:00:00Z', annulled_reason: 'Sakit'
      }
    ];
    
    expect(filterActiveRecords(records)).toHaveLength(0);
  });
});

describe('countActiveAttendance', () => {
  it('counts only active records', () => {
    const records: AttendanceRecord[] = [
      {
        id: 1, user_id: 1, type: 'in', timestamp: '2025-01-01T08:00:00Z',
        lat: null, lng: null, status: 'active',
        annulled_by: null, annulled_at: null, annulled_reason: null
      },
      {
        id: 2, user_id: 1, type: 'out', timestamp: '2025-01-01T17:00:00Z',
        lat: null, lng: null, status: 'annulled',
        annulled_by: 1, annulled_at: '2025-01-01T18:00:00Z', annulled_reason: 'Sakit'
      },
      {
        id: 3, user_id: 1, type: 'in', timestamp: '2025-01-02T08:00:00Z',
        lat: null, lng: null, status: 'active',
        annulled_by: null, annulled_at: null, annulled_reason: null
      }
    ];
    
    expect(countActiveAttendance(records)).toBe(2);
  });
});

/**
 * **Feature: attendance-annulment, Property 3: Annulled records excluded from count**
 * **Validates: Requirements 3.1**
 * 
 * For any payroll calculation, the count of attendance records SHALL equal 
 * the count of records where status is 'active', excluding all records 
 * where status is 'annulled'.
 */
describe('Property 3: Annulled records excluded from count', () => {
  // Arbitrary for generating active attendance records
  const activeRecordArb = fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    user_id: fc.integer({ min: 1, max: 10000 }),
    type: fc.constantFrom('in' as const, 'out' as const),
    timestamp: isoTimestampArb,
    lat: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
    lng: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
    status: fc.constant('active' as const),
    annulled_by: fc.constant(null as number | null),
    annulled_at: fc.constant(null as string | null),
    annulled_reason: fc.constant(null as string | null)
  });

  // Arbitrary for generating annulled attendance records
  const annulledRecordArb = fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    user_id: fc.integer({ min: 1, max: 10000 }),
    type: fc.constantFrom('in' as const, 'out' as const),
    timestamp: isoTimestampArb,
    lat: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
    lng: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
    status: fc.constant('annulled' as const),
    annulled_by: fc.integer({ min: 1, max: 10000 }),
    annulled_at: isoTimestampArb,
    annulled_reason: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
  });

  it('should count only active records and exclude all annulled records', () => {
    fc.assert(
      fc.property(
        fc.array(activeRecordArb, { minLength: 0, maxLength: 50 }),
        fc.array(annulledRecordArb, { minLength: 0, maxLength: 50 }),
        (activeRecords, annulledRecords) => {
          // Combine active and annulled records in random order
          const allRecords = [...activeRecords, ...annulledRecords];
          
          // Count using the function under test
          const count = countActiveAttendance(allRecords);
          
          // The count should equal exactly the number of active records
          expect(count).toBe(activeRecords.length);
          
          // Verify that no annulled records are counted
          const filteredRecords = filterActiveRecords(allRecords);
          expect(filteredRecords.length).toBe(activeRecords.length);
          expect(filteredRecords.every(r => r.status === 'active')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return zero when all records are annulled', () => {
    fc.assert(
      fc.property(
        fc.array(annulledRecordArb, { minLength: 1, maxLength: 50 }),
        (annulledRecords) => {
          const count = countActiveAttendance(annulledRecords);
          expect(count).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return total count when no records are annulled', () => {
    fc.assert(
      fc.property(
        fc.array(activeRecordArb, { minLength: 1, maxLength: 50 }),
        (activeRecords) => {
          const count = countActiveAttendance(activeRecords);
          expect(count).toBe(activeRecords.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty array', () => {
    expect(countActiveAttendance([])).toBe(0);
  });
});
