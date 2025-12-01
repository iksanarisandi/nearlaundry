import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['gudang','admin']));

app.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT id, name, qty FROM warehouse_items ORDER BY name').all();
  return c.json(result.results ?? []);
});

export default app;
