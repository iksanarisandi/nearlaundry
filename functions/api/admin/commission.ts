import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// Get all commission rates
app.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT id, process, rate_per_kg FROM commission_rates ORDER BY id').all();
  return c.json(result.results ?? []);
});

// Update commission rate
app.put('/:process', async (c) => {
  const process = c.req.param('process');
  const { rate_per_kg } = await c.req.json();
  
  if (rate_per_kg === undefined || rate_per_kg < 0) {
    return c.json({ message: 'Rate per kg harus >= 0' }, 400);
  }

  await c.env.DB.prepare('UPDATE commission_rates SET rate_per_kg = ? WHERE process = ?')
    .bind(rate_per_kg, process)
    .run();
  
  return c.json({ message: 'Komisi berhasil diupdate' });
});

export default app;
