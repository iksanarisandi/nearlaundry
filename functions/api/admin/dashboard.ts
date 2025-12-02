import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

app.get('/', async (c) => {
  const { month, year } = c.req.query();

  if (!month || !year) {
    return c.json({ message: 'Parameter month dan year wajib' }, 400);
  }

  const db = c.env.DB;
  const ym = `${year}-${month.toString().padStart(2, '0')}`;

  const totalRevenue = await db.prepare(
    "SELECT SUM(amount) as total FROM revenue WHERE substr(date, 1, 7) = ?"
  ).bind(ym).first();

  const revenuePerOutlet = await db.prepare(
    "SELECT o.name as outlet, SUM(r.amount) as total FROM revenue r JOIN outlets o ON r.outlet_id = o.id WHERE substr(r.date, 1, 7) = ? GROUP BY r.outlet_id"
  ).bind(ym).all();

  const expensesSummary = await db.prepare(
    "SELECT category, SUM(amount) as total FROM expenses WHERE substr(timestamp, 1, 7) = ? GROUP BY category"
  ).bind(ym).all();

  // Production summary per process
  const productionByProcess = await db.prepare(
    "SELECT process, SUM(weight) as total_kg, SUM(qty) as total_qty, COUNT(*) as total_transaksi FROM production WHERE substr(timestamp, 1, 7) = ? GROUP BY process"
  ).bind(ym).all();

  // Production per staff
  const productionByStaff = await db.prepare(
    "SELECT u.name as staff, SUM(p.weight) as total_kg, SUM(p.qty) as total_qty, COUNT(*) as total_transaksi FROM production p JOIN users u ON p.user_id = u.id WHERE substr(p.timestamp, 1, 7) = ? GROUP BY p.user_id ORDER BY total_kg DESC"
  ).bind(ym).all();

  // Delivery summary (antar/jemput)
  const deliverySummary = await db.prepare(
    "SELECT type, COUNT(*) as total, SUM(CASE WHEN status = 'berhasil' THEN 1 ELSE 0 END) as berhasil, SUM(CASE WHEN status = 'gagal' THEN 1 ELSE 0 END) as gagal FROM deliveries WHERE substr(timestamp, 1, 7) = ? GROUP BY type"
  ).bind(ym).all();

  return c.json({
    totalRevenue: (totalRevenue as any)?.total ?? 0,
    revenuePerOutlet: revenuePerOutlet.results ?? [],
    expensesByCategory: expensesSummary.results ?? [],
    productionByProcess: productionByProcess.results ?? [],
    productionByStaff: productionByStaff.results ?? [],
    deliverySummary: deliverySummary.results ?? []
  });
});

export default app;
