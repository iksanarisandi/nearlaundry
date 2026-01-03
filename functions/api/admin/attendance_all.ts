import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';
import { getWibDateBoundaries, formatTimestampWib } from '../../_utils/timezone';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// GET /api/attendance/all?date=YYYY-MM-DD&include_annulled=true|false
app.get('/', async (c) => {
  const { date, include_annulled } = c.req.query();
  if (!date) {
    return c.json({ message: 'Parameter date wajib (YYYY-MM-DD)' }, 400);
  }
  const db = c.env.DB;

  // Default: include all records (include_annulled=true)
  const showAnnulled = include_annulled !== 'false';

  // Get WIB date boundaries for proper timezone filtering
  let boundaries;
  try {
    boundaries = getWibDateBoundaries(date);
  } catch (e) {
    return c.json({ message: 'Format tanggal tidak valid (YYYY-MM-DD)' }, 400);
  }

  let query = `
    SELECT 
      a.id, 
      a.user_id, 
      u.name, 
      u.role, 
      a.type, 
      a.timestamp, 
      a.lat, 
      a.lng,
      a.status,
      a.annulled_by,
      admin.name as annulled_by_name,
      a.annulled_at,
      a.annulled_reason
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN users admin ON a.annulled_by = admin.id
    WHERE a.timestamp >= ? AND a.timestamp <= ?
  `;

  const params: string[] = [boundaries.startUtc, boundaries.endUtc];

  if (!showAnnulled) {
    query += ` AND (a.status = 'active' OR a.status IS NULL)`;
  }

  query += ` ORDER BY u.name, a.type, a.timestamp`;

  const rows = await db.prepare(query).bind(...params).all();

  // Add WIB formatted timestamp to each record
  const results = (rows.results ?? []).map((row: any) => ({
    ...row,
    timestamp_wib: formatTimestampWib(row.timestamp),
    annulled_at_wib: row.annulled_at ? formatTimestampWib(row.annulled_at) : null
  }));

  return c.json(results);
});

export default app;
