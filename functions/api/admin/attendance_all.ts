import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// GET /api/attendance/all?date=YYYY-MM-DD
app.get('/', async (c) => {
  const { date } = c.req.query();
  if (!date) {
    return c.json({ message: 'Parameter date wajib (YYYY-MM-DD)' }, 400);
  }
  const db = c.env.DB;

  const rows = await db.prepare(
    `SELECT a.id, a.user_id, u.name, u.role, a.type, a.timestamp, a.lat, a.lng
       FROM attendance a
       JOIN users u ON a.user_id = u.id
      WHERE substr(a.timestamp, 1, 10) = ?
      ORDER BY u.name, a.timestamp`
  ).bind(date).all();

  return c.json(rows.results ?? []);
});

export default app;
