import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['produksi']));

app.post('/', async (c) => {
  const { customer_name, nota_number, process, qty } = await c.req.json();
  const user = c.get('user');

  if (!process || !['cuci','kering','setrika','packing'].includes(process)) {
    return c.json({ message: 'Proses tidak valid' }, 400);
  }

  if (!qty || qty <= 0) {
    return c.json({ message: 'Qty harus lebih dari 0' }, 400);
  }

  await c.env.DB.prepare(
    'INSERT INTO production (user_id, outlet_id, customer_name, nota_number, process, qty) VALUES (?, ?, ?, ?, ?, ?)' 
  )
    .bind(user.sub, user.outlet_id, customer_name ?? null, nota_number ?? null, process, qty)
    .run();

  return c.json({ message: 'Produksi tersimpan' });
});

export default app;
