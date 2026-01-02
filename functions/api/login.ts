import { Hono } from 'hono';
import type { Env } from '../index';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  const { email, password } = await c.req.json();

  const db = c.env.DB;
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

  if (!user) {
    return c.json({ message: 'Email atau password salah' }, 401);
  }

  const ok = await bcrypt.compare(password, (user as any).password_hash);
  if (!ok) {
    return c.json({ message: 'Email atau password salah' }, 401);
  }

  const payload = {
    sub: (user as any).id,
    role: (user as any).role,
    outlet_id: (user as any).outlet_id,
  };

  // Token expires in 7 days for security
  const token = jwt.sign(payload, c.env.JWT_SECRET, { 
    algorithm: 'HS256',
    expiresIn: '7d'
  });

  return c.json({
    token,
    user: {
      id: (user as any).id,
      name: (user as any).name,
      role: (user as any).role,
      outlet_id: (user as any).outlet_id,
    },
  });
});

export default app;
