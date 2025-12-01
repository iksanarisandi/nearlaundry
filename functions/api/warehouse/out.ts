import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['gudang']));

app.post('/', async (c) => {
  const { item_id, qty_out, outlet_id } = await c.req.json();

  if (!item_id || !qty_out || !outlet_id || qty_out <= 0) {
    return c.json({ message: 'Data tidak lengkap' }, 400);
  }

  const db = c.env.DB;

  const item = await db.prepare('SELECT qty FROM warehouse_items WHERE id = ?').bind(item_id).first();
  if (!item) {
    return c.json({ message: 'Item tidak ditemukan' }, 404);
  }

  const currentQty = (item as any).qty as number;
  if (currentQty < qty_out) {
    return c.json({ message: 'Stok tidak mencukupi' }, 400);
  }

  await db.batch([
    db.prepare('UPDATE warehouse_items SET qty = qty - ? WHERE id = ?').bind(qty_out, item_id),
    db.prepare('INSERT INTO warehouse_logs (item_id, qty_out, outlet_id) VALUES (?, ?, ?)').bind(item_id, qty_out, outlet_id)
  ]);

  return c.json({ message: 'Stok keluar tercatat' });
});

export default app;
