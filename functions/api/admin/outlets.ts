import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// List outlets
app.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT id, name, address, latitude, longitude FROM outlets ORDER BY id').all();
  return c.json(result.results ?? []);
});

// Create outlet
app.post('/', async (c) => {
  const { name, address, latitude, longitude } = await c.req.json();
  if (!name || !name.trim()) {
    return c.json({ message: 'Nama outlet wajib diisi' }, 400);
  }
  await c.env.DB.prepare('INSERT INTO outlets (name, address, latitude, longitude) VALUES (?, ?, ?, ?)')
    .bind(name.trim(), address?.trim() || null, latitude || null, longitude || null)
    .run();
  return c.json({ message: 'Outlet berhasil ditambahkan' });
});

// Update outlet
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { name, address, latitude, longitude } = await c.req.json();
  if (!name || !name.trim()) {
    return c.json({ message: 'Nama outlet wajib diisi' }, 400);
  }
  await c.env.DB.prepare('UPDATE outlets SET name = ?, address = ?, latitude = ?, longitude = ? WHERE id = ?')
    .bind(name.trim(), address?.trim() || null, latitude || null, longitude || null, id)
    .run();
  return c.json({ message: 'Outlet berhasil diupdate' });
});

// Delete outlet
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM outlets WHERE id = ?').bind(id).run();
  return c.json({ message: 'Outlet berhasil dihapus' });
});

export default app;
