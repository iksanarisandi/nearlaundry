import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// GET /api/payroll?month=..&year=..
app.get('/', async (c) => {
  const { month, year } = c.req.query();
  if (!month || !year) {
    return c.json({ message: 'Parameter month dan year wajib' }, 400);
  }
  const ym = `${year}-${month.toString().padStart(2, '0')}`;
  const db = c.env.DB;

  const rows = await db.prepare(
    `SELECT u.id as user_id, u.name, u.role,
            pm.base_salary, pm.adjustment,
            (pm.base_salary + pm.adjustment) as total_salary
       FROM payroll_matrix pm
       JOIN users u ON pm.user_id = u.id
      WHERE pm.month = ? AND pm.year = ?
      ORDER BY u.name`
  ).bind(Number(month), Number(year)).all();

  return c.json(rows.results ?? []);
});

// POST /api/payroll/update
app.post('/update', async (c) => {
  const body = await c.req.json();
  // body: { user_id, month, year, base_salary, adjustment }
  const { user_id, month, year, base_salary, adjustment } = body;

  if (!user_id || !month || !year || base_salary == null) {
    return c.json({ message: 'user_id, month, year, dan base_salary wajib diisi' }, 400);
  }

  const adj = adjustment ?? 0;
  const db = c.env.DB;

  await db.prepare(
    `INSERT INTO payroll_matrix (user_id, month, year, base_salary, adjustment)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, month, year) DO UPDATE SET base_salary = excluded.base_salary, adjustment = excluded.adjustment`
  ).bind(user_id, month, year, base_salary, adj).run().catch(async () => {
    // Jika D1 tidak mendukung ON CONFLICT, fallback ke manual upsert
    const exist = await db.prepare('SELECT id FROM payroll_matrix WHERE user_id = ? AND month = ? AND year = ?')
      .bind(user_id, month, year)
      .first();
    if (exist) {
      await db.prepare('UPDATE payroll_matrix SET base_salary = ?, adjustment = ? WHERE user_id = ? AND month = ? AND year = ?')
        .bind(base_salary, adj, user_id, month, year)
        .run();
    } else {
      await db.prepare('INSERT INTO payroll_matrix (user_id, month, year, base_salary, adjustment) VALUES (?, ?, ?, ?, ?)')
        .bind(user_id, month, year, base_salary, adj)
        .run();
    }
  });

  return c.json({ message: 'Payroll tersimpan' });
});

export default app;
