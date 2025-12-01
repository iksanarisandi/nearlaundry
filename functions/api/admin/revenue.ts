import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

app.post('/', async (c) => {
  const { outlet_id, date, amount } = await c.req.json();

  if (!outlet_id || !date || !amount || amount <= 0) {
    return c.json({ message: 'Data tidak lengkap' }, 400);
  }

  await c.env.DB.prepare(
    'INSERT INTO revenue (outlet_id, date, amount) VALUES (?, ?, ?)' 
  )
    .bind(outlet_id, date, amount)
    .run();

  return c.json({ message: 'Omzet harian tersimpan' });
});

export default app;
