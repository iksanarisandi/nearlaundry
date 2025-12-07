import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';
import { isValidAnnulmentReason } from '../../_utils/attendance';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// POST /api/admin/attendance/annul
app.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { attendance_id, reason } = body;

  // Validate attendance_id
  if (!attendance_id || typeof attendance_id !== 'number') {
    return c.json({ success: false, message: 'ID absensi wajib diisi' }, 400);
  }

  // Validate reason using utility function
  if (!isValidAnnulmentReason(reason)) {
    return c.json({ success: false, message: 'Alasan anulir wajib diisi' }, 400);
  }

  const db = c.env.DB;

  // Check if attendance record exists and get original data for audit
  const attendance = await db.prepare(
    'SELECT id, user_id, type, timestamp, lat, lng, status FROM attendance WHERE id = ?'
  ).bind(attendance_id).first() as { 
    id: number; 
    user_id: number;
    type: string;
    timestamp: string;
    lat: number | null;
    lng: number | null;
    status: string;
  } | null;

  if (!attendance) {
    return c.json({ success: false, message: 'Record absensi tidak ditemukan' }, 404);
  }

  // Check if already annulled
  if (attendance.status === 'annulled') {
    return c.json({ success: false, message: 'Record sudah dianulir sebelumnya' }, 400);
  }

  // Get current timestamp
  const annulled_at = new Date().toISOString();

  // Update attendance record with annulment data
  await db.prepare(
    `UPDATE attendance 
     SET status = 'annulled', 
         annulled_by = ?, 
         annulled_at = ?, 
         annulled_reason = ?
     WHERE id = ?`
  ).bind(user.sub, annulled_at, reason.trim(), attendance_id).run();

  // Create audit log entry with original attendance data (Requirements 4.1, 4.2)
  const auditDetail = JSON.stringify({
    attendance_id,
    admin_id: user.sub,
    reason: reason.trim(),
    annulled_at,
    original_data: {
      user_id: attendance.user_id,
      type: attendance.type,
      timestamp: attendance.timestamp,
      lat: attendance.lat,
      lng: attendance.lng
    }
  });

  await db.prepare(
    `INSERT INTO audit_logs (user_id, action, detail) VALUES (?, 'ATTENDANCE_ANNULLED', ?)`
  ).bind(user.sub, auditDetail).run();

  return c.json({ success: true, message: 'Absensi berhasil dianulir' });
});

export default app;
