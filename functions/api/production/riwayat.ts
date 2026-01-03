import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';
import { getWibDateBoundaries } from '../../_utils/timezone';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['produksi', 'kurir']));

app.get('/', async (c) => {
  const { date } = c.req.query();
  if (!date) {
    return c.json({ message: 'Parameter date wajib (YYYY-MM-DD)' }, 400);
  }
  const user = c.get('user');
  const db = c.env.DB;

  // Get WIB date boundaries for proper timezone filtering
  let boundaries;
  try {
    boundaries = getWibDateBoundaries(date);
  } catch (e) {
    return c.json({ message: 'Format tanggal tidak valid (YYYY-MM-DD)' }, 400);
  }

  const production = await db.prepare(
    'SELECT id, customer_name, nota_number, process, weight, qty FROM production WHERE user_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY id DESC'
  ).bind(user.sub, boundaries.startUtc, boundaries.endUtc).all();

  const expenses = await db.prepare(
    'SELECT category, amount FROM expenses WHERE user_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY id DESC'
  ).bind(user.sub, boundaries.startUtc, boundaries.endUtc).all();

  return c.json({
    production: production.results ?? [],
    expenses: expenses.results ?? []
  });
});

export default app;
