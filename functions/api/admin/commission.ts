import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// Get all commission rates
app.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT id, process, rate_per_kg, rate_type, rate_value FROM commission_rates ORDER BY id').all();
  return c.json(result.results ?? []);
});

// Update commission rate
app.put('/:process', async (c) => {
  const process = c.req.param('process');
  const { rate_per_kg, rate_type, rate_value } = await c.req.json();
  
  const db = c.env.DB;
  
  // Update based on what's provided
  if (rate_type !== undefined && rate_value !== undefined) {
    await db.prepare('UPDATE commission_rates SET rate_type = ?, rate_value = ? WHERE process = ?')
      .bind(rate_type, rate_value, process)
      .run();
  } else if (rate_per_kg !== undefined) {
    await db.prepare('UPDATE commission_rates SET rate_per_kg = ? WHERE process = ?')
      .bind(rate_per_kg, process)
      .run();
  }
  
  return c.json({ message: 'Komisi berhasil diupdate' });
});

export default app;
