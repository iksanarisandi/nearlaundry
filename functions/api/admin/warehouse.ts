import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// Get all items
app.get('/items', async (c) => {
  const result = await c.env.DB.prepare('SELECT id, name, qty FROM warehouse_items ORDER BY name').all();
  return c.json(result.results ?? []);
});

// Create new item
app.post('/items', async (c) => {
  const { name, qty } = await c.req.json();
  if (!name || !name.trim()) {
    return c.json({ message: 'Nama barang wajib diisi' }, 400);
  }
  await c.env.DB.prepare('INSERT INTO warehouse_items (name, qty) VALUES (?, ?)')
    .bind(name.trim(), qty || 0)
    .run();
  return c.json({ message: 'Barang berhasil ditambahkan' });
});

// Update item
app.put('/items/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { name, qty } = await c.req.json();
  if (!name || !name.trim()) {
    return c.json({ message: 'Nama barang wajib diisi' }, 400);
  }
  await c.env.DB.prepare('UPDATE warehouse_items SET name = ?, qty = ? WHERE id = ?')
    .bind(name.trim(), qty || 0, id)
    .run();
  return c.json({ message: 'Barang berhasil diupdate' });
});

// Delete item
app.delete('/items/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM warehouse_items WHERE id = ?').bind(id).run();
  return c.json({ message: 'Barang berhasil dihapus' });
});

// Add stock (stok masuk)
app.post('/stock-in', async (c) => {
  const { item_id, qty } = await c.req.json();
  if (!item_id || !qty || qty <= 0) {
    return c.json({ message: 'Item dan qty wajib diisi' }, 400);
  }
  
  await c.env.DB.prepare('UPDATE warehouse_items SET qty = qty + ? WHERE id = ?')
    .bind(qty, item_id)
    .run();
  
  return c.json({ message: 'Stok masuk berhasil dicatat' });
});

export default app;
