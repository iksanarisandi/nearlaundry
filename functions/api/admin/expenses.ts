import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';
import { getWitaDateBoundaries, getWitaMonthBoundaries, formatTimestampWita } from '../../_utils/timezone';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// GET /api/admin/expenses - List expenses with filters
app.get('/', async (c) => {
  const { date, outlet_id, month, year } = c.req.query();
  const db = c.env.DB;

  let query = `
    SELECT e.*, u.name as user_name, o.name as outlet_name
    FROM expenses e
    JOIN users u ON e.user_id = u.id
    JOIN outlets o ON e.outlet_id = o.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Filter by specific date (WITA)
  if (date) {
    const boundaries = getWitaDateBoundaries(date);
    query += ` AND e.timestamp >= ? AND e.timestamp <= ?`;
    params.push(boundaries.startUtc, boundaries.endUtc);
  }
  // Filter by month/year (WITA)
  else if (month && year) {
    const boundaries = getWitaMonthBoundaries(Number(month), Number(year));
    query += ` AND e.timestamp >= ? AND e.timestamp <= ?`;
    params.push(boundaries.startUtc, boundaries.endUtc);
  }

  // Filter by outlet
  if (outlet_id) {
    query += ` AND e.outlet_id = ?`;
    params.push(Number(outlet_id));
  }

  query += ` ORDER BY e.timestamp DESC`;

  const result = await db.prepare(query).bind(...params).all();
  
  // Add formatted WITA timestamp
  const expenses = (result.results ?? []).map((row: any) => ({
    ...row,
    timestamp_wita: formatTimestampWita(row.timestamp)
  }));

  return c.json(expenses);
});

// POST /api/admin/expenses - Create new expense
app.post('/', async (c) => {
  const { outlet_id, category, amount, date } = await c.req.json();
  const user = c.get('user');
  const db = c.env.DB;

  // Validation
  if (!outlet_id) {
    return c.json({ message: 'Outlet wajib dipilih' }, 400);
  }

  if (!category || typeof category !== 'string' || category.trim() === '') {
    return c.json({ message: 'Kategori wajib diisi' }, 400);
  }

  if (!amount || amount <= 0) {
    return c.json({ message: 'Nominal harus lebih dari 0' }, 400);
  }

  // Insert with optional date
  if (date) {
    await db.prepare(
      'INSERT INTO expenses (user_id, outlet_id, category, amount, timestamp) VALUES (?, ?, ?, ?, ?)'
    ).bind(user.sub, outlet_id, category.trim(), amount, date + 'T12:00:00.000Z').run();
  } else {
    await db.prepare(
      'INSERT INTO expenses (user_id, outlet_id, category, amount) VALUES (?, ?, ?, ?)'
    ).bind(user.sub, outlet_id, category.trim(), amount).run();
  }

  return c.json({ message: 'Pengeluaran berhasil disimpan' });
});

// PUT /api/admin/expenses/:id - Update expense
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { category, amount } = await c.req.json();
  const db = c.env.DB;

  // Check if expense exists
  const existing = await db.prepare('SELECT id FROM expenses WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ message: 'Pengeluaran tidak ditemukan' }, 404);
  }

  // Validation
  if (!category || typeof category !== 'string' || category.trim() === '') {
    return c.json({ message: 'Kategori wajib diisi' }, 400);
  }

  if (!amount || amount <= 0) {
    return c.json({ message: 'Nominal harus lebih dari 0' }, 400);
  }

  // Update without changing timestamp
  await db.prepare(
    'UPDATE expenses SET category = ?, amount = ? WHERE id = ?'
  ).bind(category.trim(), amount, id).run();

  return c.json({ message: 'Pengeluaran berhasil diupdate' });
});

// DELETE /api/admin/expenses/:id - Delete expense
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = c.env.DB;

  await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();

  return c.json({ message: 'Pengeluaran berhasil dihapus' });
});

export default app;
