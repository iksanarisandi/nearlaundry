import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

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
    WHERE substr(a.timestamp, 1, 10) = ?
  `;

  if (!showAnnulled) {
    query += ` AND (a.status = 'active' OR a.status IS NULL)`;
  }

  query += ` ORDER BY u.name, a.timestamp`;

  const rows = await db.prepare(query).bind(date).all();

  return c.json(rows.results ?? []);
});

export default app;
