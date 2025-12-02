import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// Get all settings
app.get('/', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT key, value, description FROM app_settings').all();
  return c.json(result.results ?? []);
});

// Update a setting
app.put('/:key', async (c) => {
  const key = c.req.param('key');
  const { value } = await c.req.json();

  if (!value) {
    return c.json({ message: 'Value wajib diisi' }, 400);
  }

  const db = c.env.DB;
  await db.prepare('UPDATE app_settings SET value = ? WHERE key = ?').bind(value, key).run();

  return c.json({ message: 'Setting berhasil diubah' });
});

// Get all BHP items
app.get('/bhp', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT id, name, category, price, unit FROM bhp_items ORDER BY category, name').all();
  return c.json(result.results ?? []);
});

// Update BHP item price
app.put('/bhp/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { price } = await c.req.json();

  if (price === undefined || price < 0) {
    return c.json({ message: 'Harga tidak valid' }, 400);
  }

  const db = c.env.DB;
  await db.prepare('UPDATE bhp_items SET price = ? WHERE id = ?').bind(price, id).run();

  return c.json({ message: 'Harga BHP berhasil diubah' });
});

// Add new BHP item
app.post('/bhp', async (c) => {
  const { name, category, price, unit } = await c.req.json();

  if (!name || !category) {
    return c.json({ message: 'Nama dan kategori wajib diisi' }, 400);
  }

  const db = c.env.DB;
  
  try {
    await db.prepare('INSERT INTO bhp_items (name, category, price, unit) VALUES (?, ?, ?, ?)')
      .bind(name.toLowerCase(), category, price || 0, unit || 'pcs').run();
    return c.json({ message: 'Item BHP berhasil ditambahkan' });
  } catch {
    return c.json({ message: 'Item dengan nama tersebut sudah ada' }, 400);
  }
});

// Delete BHP item
app.delete('/bhp/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = c.env.DB;
  await db.prepare('DELETE FROM bhp_items WHERE id = ?').bind(id).run();
  return c.json({ message: 'Item BHP berhasil dihapus' });
});

export default app;
