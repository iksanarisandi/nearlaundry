import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// Search/tracking production by nota number and/or customer name
app.get('/search', async (c) => {
  const { nota, name } = c.req.query();
  
  if (!nota && !name) {
    return c.json({ message: 'Parameter nota atau name wajib diisi' }, 400);
  }

  const db = c.env.DB;
  let query = `
    SELECT p.*, u.name as staff_name, o.name as outlet_name
    FROM production p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN outlets o ON p.outlet_id = o.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (nota) {
    query += ` AND p.nota_number LIKE ?`;
    params.push(`%${nota}%`);
  }
  if (name) {
    query += ` AND p.customer_name LIKE ?`;
    params.push(`%${name}%`);
  }

  query += ` ORDER BY p.timestamp DESC LIMIT 100`;

  const results = await db.prepare(query).bind(...params).all();
  return c.json(results.results ?? []);
});

export default app;
