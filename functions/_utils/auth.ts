import { Context, Next } from 'hono';
import * as jwt from 'jsonwebtoken';
import type { Env } from '../index';

export type UserToken = {
  sub: number;
  role: 'admin' | 'gudang' | 'produksi' | 'kurir';
  outlet_id: number | null;
};

export const authMiddleware = async (c: Context<{ Bindings: Env; Variables: { user: UserToken } }>, next: Next) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ message: 'Token tidak ditemukan' }, 401);
  }

  const token = auth.slice(7);

  try {
    const payload = jwt.verify(token, c.env.JWT_SECRET, { algorithms: ['HS256'] }) as unknown as UserToken;
    c.set('user', payload);
    await next();
  } catch (err: any) {
    // Provide specific error messages
    if (err.name === 'TokenExpiredError') {
      return c.json({ message: 'Token telah kadaluarsa. Silakan login kembali.' }, 401);
    }
    return c.json({ message: 'Token tidak valid' }, 401);
  }
};

export const requireRole = (roles: UserToken['role'][] ) => {
  return async (c: Context<{ Bindings: Env; Variables: { user: UserToken } }>, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ message: 'Tidak berhak mengakses' }, 403);
    }
    await next();
  };
};
