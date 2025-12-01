import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['produksi']));

app.get('/', async (c) => {
  const { date } = c.req.query();
  if (!date) {
    return c.json({ message: 'Parameter date wajib (YYYY-MM-DD)' }, 400);
  }
  const user = c.get('user');
  const db = c.env.DB;

  const production = await db.prepare(
    'SELECT customer_name, nota_number, process, weight, qty FROM production WHERE user_id = ? AND substr(timestamp, 1, 10) = ? ORDER BY id DESC'
  ).bind(user.sub, date).all();

  const expenses = await db.prepare(
    'SELECT category, amount FROM expenses WHERE user_id = ? AND substr(timestamp, 1, 10) = ? ORDER BY id DESC'
  ).bind(user.sub, date).all();

  return c.json({
    production: production.results ?? [],
    expenses: expenses.results ?? []
  });
});

export default app;
