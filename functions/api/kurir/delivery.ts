import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['kurir']));

// Create delivery record
app.post('/', async (c) => {
  const { type, customer_name, address, nota_number, status } = await c.req.json();
  const user = c.get('user');

  if (!type || !['antar', 'jemput'].includes(type)) {
    return c.json({ message: 'Tipe harus antar atau jemput' }, 400);
  }

  if (!customer_name || !customer_name.trim()) {
    return c.json({ message: 'Nama pelanggan wajib diisi' }, 400);
  }

  if (!address || !address.trim()) {
    return c.json({ message: 'Alamat wajib diisi' }, 400);
  }

  await c.env.DB.prepare(
    'INSERT INTO deliveries (user_id, outlet_id, type, customer_name, address, nota_number, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(user.sub, user.outlet_id, type, customer_name.trim(), address.trim(), nota_number?.trim() || null, status || 'berhasil')
    .run();

  return c.json({ message: 'Pengiriman berhasil dicatat' });
});

// Get delivery history
app.get('/riwayat', async (c) => {
  const { date } = c.req.query();
  if (!date) {
    return c.json({ message: 'Parameter date wajib (YYYY-MM-DD)' }, 400);
  }
  const user = c.get('user');

  const deliveries = await c.env.DB.prepare(
    'SELECT id, type, customer_name, address, nota_number, status, timestamp FROM deliveries WHERE user_id = ? AND substr(timestamp, 1, 10) = ? ORDER BY id DESC'
  ).bind(user.sub, date).all();

  return c.json(deliveries.results ?? []);
});

export default app;
