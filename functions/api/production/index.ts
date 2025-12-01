import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['produksi']));

app.post('/', async (c) => {
  const { customer_name, nota_number, process, weight, qty } = await c.req.json();
  const user = c.get('user');

  if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
    return c.json({ message: 'Nama pelanggan wajib diisi' }, 400);
  }

  if (!nota_number || typeof nota_number !== 'string' || !nota_number.trim()) {
    return c.json({ message: 'Nomor nota wajib diisi' }, 400);
  }

  if (!process || !['cuci','kering','setrika','packing','cuci_sepatu','cuci_satuan'].includes(process)) {
    return c.json({ message: 'Proses tidak valid' }, 400);
  }

  if (!weight || weight <= 0) {
    return c.json({ message: 'Berat cucian harus lebih dari 0' }, 400);
  }

  if (!qty || qty <= 0) {
    return c.json({ message: 'Qty harus lebih dari 0' }, 400);
  }

  await c.env.DB.prepare(
    'INSERT INTO production (user_id, outlet_id, customer_name, nota_number, process, weight, qty) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(user.sub, user.outlet_id, customer_name.trim(), nota_number.trim(), process, weight, qty)
    .run();

  return c.json({ message: 'Produksi tersimpan' });
});

export default app;
