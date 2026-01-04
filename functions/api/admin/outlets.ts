import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';
import { generateOutletCode, isValidOutletCode } from '../../_utils/nota';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// List outlets (now includes code)
app.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT id, name, code, address, latitude, longitude FROM outlets ORDER BY id').all();
  return c.json(result.results ?? []);
});

// Generate suggested code from outlet name
app.get('/suggest-code', async (c) => {
  const { name } = c.req.query();
  if (!name) {
    return c.json({ code: '' });
  }
  const suggestedCode = generateOutletCode(name);
  return c.json({ code: suggestedCode });
});

// Create outlet (now includes code)
app.post('/', async (c) => {
  const { name, code, address, latitude, longitude } = await c.req.json();
  
  if (!name || !name.trim()) {
    return c.json({ message: 'Nama outlet wajib diisi' }, 400);
  }

  // Validate code if provided
  const outletCode = code?.trim().toUpperCase() || null;
  if (outletCode) {
    if (!isValidOutletCode(outletCode)) {
      return c.json({ message: 'Kode outlet harus 1-5 karakter (huruf kapital dan angka)' }, 400);
    }

    // Check uniqueness
    const existing = await c.env.DB.prepare('SELECT id FROM outlets WHERE code = ?').bind(outletCode).first();
    if (existing) {
      return c.json({ message: 'Kode outlet sudah digunakan' }, 400);
    }
  }

  await c.env.DB.prepare('INSERT INTO outlets (name, code, address, latitude, longitude) VALUES (?, ?, ?, ?, ?)')
    .bind(name.trim(), outletCode, address?.trim() || null, latitude || null, longitude || null)
    .run();
  return c.json({ message: 'Outlet berhasil ditambahkan' });
});

// Update outlet (now includes code)
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { name, code, address, latitude, longitude } = await c.req.json();
  
  if (!name || !name.trim()) {
    return c.json({ message: 'Nama outlet wajib diisi' }, 400);
  }

  // Validate code if provided
  const outletCode = code?.trim().toUpperCase() || null;
  if (outletCode) {
    if (!isValidOutletCode(outletCode)) {
      return c.json({ message: 'Kode outlet harus 1-5 karakter (huruf kapital dan angka)' }, 400);
    }

    // Check uniqueness (exclude current outlet)
    const existing = await c.env.DB.prepare('SELECT id FROM outlets WHERE code = ? AND id != ?').bind(outletCode, id).first();
    if (existing) {
      return c.json({ message: 'Kode outlet sudah digunakan' }, 400);
    }
  }

  await c.env.DB.prepare('UPDATE outlets SET name = ?, code = ?, address = ?, latitude = ?, longitude = ? WHERE id = ?')
    .bind(name.trim(), outletCode, address?.trim() || null, latitude || null, longitude || null, id)
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
