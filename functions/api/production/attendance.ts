import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['produksi']));

app.post('/', async (c) => {
  const { lat, lng, type } = await c.req.json();
  const user = c.get('user');

  if (type !== 'in' && type !== 'out') {
    return c.json({ message: 'Tipe absen tidak valid' }, 400);
  }

  await c.env.DB.prepare(
    'INSERT INTO attendance (user_id, type, lat, lng) VALUES (?, ?, ?, ?)' 
  )
    .bind(user.sub, type, lat ?? null, lng ?? null)
    .run();

  return c.json({ message: 'Absen tersimpan' });
});

export default app;
