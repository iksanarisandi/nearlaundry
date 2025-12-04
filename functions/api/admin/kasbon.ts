import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// Get kasbon list
app.get('/', async (c) => {
  const { month, year } = c.req.query();
  const db = c.env.DB;
  
  let query = `
    SELECT k.*, u.name as user_name 
    FROM kasbon k 
    JOIN users u ON k.user_id = u.id
  `;
  const params: any[] = [];
  
  if (month && year) {
    const ym = `${year}-${month.toString().padStart(2, '0')}`;
    query += ` WHERE substr(k.created_at, 1, 7) = ?`;
    params.push(ym);
  }
  
  query += ' ORDER BY k.created_at DESC';
  
  const result = await db.prepare(query).bind(...params).all();
  return c.json(result.results ?? []);
});

// Add kasbon
app.post('/', async (c) => {
  const { user_id, amount, note } = await c.req.json();
  
  if (!user_id || !amount || amount <= 0) {
    return c.json({ message: 'User dan nominal wajib diisi' }, 400);
  }
  
  const db = c.env.DB;
  await db.prepare('INSERT INTO kasbon (user_id, amount, note) VALUES (?, ?, ?)')
    .bind(user_id, amount, note || null).run();
  
  return c.json({ message: 'Kasbon berhasil disimpan' });
});

// Delete kasbon
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = c.env.DB;
  await db.prepare('DELETE FROM kasbon WHERE id = ?').bind(id).run();
  return c.json({ message: 'Kasbon berhasil dihapus' });
});

export default app;
