import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';
import bcrypt from 'bcryptjs';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// List user
app.get('/', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT id, name, email, role, outlet_id, created_at FROM users ORDER BY id DESC').all();
  return c.json(result.results ?? []);
});

// Tambah user
app.post('/', async (c) => {
  const { name, email, role, outlet_id, password } = await c.req.json();

  if (!name || !email || !role) {
    return c.json({ message: 'Nama, email, dan role wajib diisi' }, 400);
  }
  if (!['admin','gudang','produksi','kurir'].includes(role)) {
    return c.json({ message: 'Role tidak valid' }, 400);
  }

  const db = c.env.DB;

  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) {
    return c.json({ message: 'Email sudah terpakai' }, 400);
  }

  const pwd = password && password.length >= 6 ? password : 'laundry123';
  const hash = await bcrypt.hash(pwd, 10);

  await db.prepare(
    'INSERT INTO users (name, email, password_hash, role, outlet_id) VALUES (?, ?, ?, ?, ?)' 
  ).bind(name, email, hash, role, outlet_id ?? null).run();

  return c.json({ message: 'User berhasil dibuat', defaultPassword: pwd === 'laundry123' ? pwd : undefined });
});

// Update user (tanpa ubah password)
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { name, role, outlet_id } = await c.req.json();

  if (!id) {
    return c.json({ message: 'ID tidak valid' }, 400);
  }

  if (!name || !role) {
    return c.json({ message: 'Nama dan role wajib diisi' }, 400);
  }

  if (!['admin','gudang','produksi','kurir'].includes(role)) {
    return c.json({ message: 'Role tidak valid' }, 400);
  }

  const db = c.env.DB;
  await db.prepare('UPDATE users SET name = ?, role = ?, outlet_id = ? WHERE id = ?')
    .bind(name, role, outlet_id ?? null, id)
    .run();

  return c.json({ message: 'User berhasil diubah' });
});

// Reset password user
app.post('/:id/reset-password', async (c) => {
  const id = Number(c.req.param('id'));
  const { newPassword } = await c.req.json().catch(() => ({ newPassword: null }));

  if (!id) {
    return c.json({ message: 'ID tidak valid' }, 400);
  }

  const pwd = newPassword && newPassword.length >= 6 ? newPassword : 'laundry123';
  const hash = await bcrypt.hash(pwd, 10);

  const db = c.env.DB;
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, id).run();

  return c.json({ message: 'Password direset', defaultPassword: pwd === 'laundry123' ? pwd : undefined });
});

export default app;
