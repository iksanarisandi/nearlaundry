import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['produksi']));

app.post('/', async (c) => {
  const { category, amount } = await c.req.json();
  const user = c.get('user');

  if (!category || typeof category !== 'string') {
    return c.json({ message: 'Kategori wajib diisi' }, 400);
  }

  if (!amount || amount <= 0) {
    return c.json({ message: 'Nominal harus lebih dari 0' }, 400);
  }

  await c.env.DB.prepare(
    'INSERT INTO expenses (user_id, outlet_id, category, amount) VALUES (?, ?, ?, ?)' 
  )
    .bind(user.sub, user.outlet_id, category, amount)
    .run();

  return c.json({ message: 'Pengeluaran tersimpan' });
});

export default app;
