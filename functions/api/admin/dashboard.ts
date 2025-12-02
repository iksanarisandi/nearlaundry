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
  const monthNum = Number(month);
  const yearNum = Number(year);
  const ym = `${year}-${month.toString().padStart(2, '0')}`;

  const totalRevenue = await db.prepare(
    "SELECT SUM(amount) as total FROM revenue WHERE substr(date, 1, 7) = ?"
  ).bind(ym).first();

  const revenuePerOutlet = await db.prepare(
    "SELECT o.id as outlet_id, o.name as outlet, COALESCE(SUM(r.amount), 0) as total FROM outlets o LEFT JOIN revenue r ON r.outlet_id = o.id AND substr(r.date, 1, 7) = ? GROUP BY o.id"
  ).bind(ym).all();

  const expensesSummary = await db.prepare(
    "SELECT category, SUM(amount) as total FROM expenses WHERE substr(timestamp, 1, 7) = ? GROUP BY category"
  ).bind(ym).all();

  // Expenses per outlet (GAS and BHP)
  const expensesPerOutlet = await db.prepare(`
    SELECT 
      o.id as outlet_id,
      o.name as outlet,
      COALESCE(SUM(CASE WHEN e.category = 'GAS' THEN e.amount ELSE 0 END), 0) as gas_total,
      COALESCE(SUM(CASE WHEN e.category LIKE 'BHP%' THEN e.amount ELSE 0 END), 0) as bhp_total
    FROM outlets o
    LEFT JOIN expenses e ON e.outlet_id = o.id AND substr(e.timestamp, 1, 7) = ?
    GROUP BY o.id
  `).bind(ym).all();

  // Payroll per outlet (gaji bersih + kasbon)
  const payrollPerOutlet = await db.prepare(`
    SELECT 
      o.id as outlet_id,
      o.name as outlet,
      COALESCE(SUM(
        (p.gaji_pokok + p.uang_makan + p.uang_transport + 
         (p.lembur_jam * p.lembur_jam_rate) + (p.lembur_libur * p.lembur_libur_rate) +
         p.tunjangan_jabatan + p.thr + p.komisi_total) -
        (p.denda_terlambat + p.denda) + p.kasbon
      ), 0) as gaji_total
    FROM outlets o
    LEFT JOIN users u ON u.outlet_id = o.id
    LEFT JOIN payroll p ON p.user_id = u.id AND p.month = ? AND p.year = ?
    GROUP BY o.id
  `).bind(monthNum, yearNum).all();

  // Combine outlet data with percentages
  const outletSummary = (revenuePerOutlet.results ?? []).map((rev: any) => {
    const expenses = (expensesPerOutlet.results ?? []).find((e: any) => e.outlet_id === rev.outlet_id) || { gas_total: 0, bhp_total: 0 };
    const payroll = (payrollPerOutlet.results ?? []).find((p: any) => p.outlet_id === rev.outlet_id) || { gaji_total: 0 };
    const omzet = Number(rev.total) || 0;
    const gasTotal = Number(expenses.gas_total) || 0;
    const bhpTotal = Number(expenses.bhp_total) || 0;
    const gajiTotal = Number(payroll.gaji_total) || 0;
    
    return {
      outlet_id: rev.outlet_id,
      outlet: rev.outlet,
      omzet,
      gas_total: gasTotal,
      gas_percent: omzet > 0 ? (gasTotal / omzet * 100).toFixed(1) : '0.0',
      bhp_total: bhpTotal,
      bhp_percent: omzet > 0 ? (bhpTotal / omzet * 100).toFixed(1) : '0.0',
      gaji_total: gajiTotal,
      gaji_percent: omzet > 0 ? (gajiTotal / omzet * 100).toFixed(1) : '0.0'
    };
  });

  // Calculate totals
  const totalOmzet = (totalRevenue as any)?.total ?? 0;
  const totalGas = outletSummary.reduce((sum: number, o: any) => sum + (o.gas_total || 0), 0);
  const totalBhp = outletSummary.reduce((sum: number, o: any) => sum + (o.bhp_total || 0), 0);
  const totalGaji = outletSummary.reduce((sum: number, o: any) => sum + (o.gaji_total || 0), 0);

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
    totalRevenue: totalOmzet,
    revenuePerOutlet: revenuePerOutlet.results ?? [],
    expensesByCategory: expensesSummary.results ?? [],
    outletSummary,
    totalSummary: {
      omzet: totalOmzet,
      gas_total: totalGas,
      gas_percent: totalOmzet > 0 ? (totalGas / totalOmzet * 100).toFixed(1) : '0.0',
      bhp_total: totalBhp,
      bhp_percent: totalOmzet > 0 ? (totalBhp / totalOmzet * 100).toFixed(1) : '0.0',
      gaji_total: totalGaji,
      gaji_percent: totalOmzet > 0 ? (totalGaji / totalOmzet * 100).toFixed(1) : '0.0'
    },
    productionByProcess: productionByProcess.results ?? [],
    productionByStaff: productionByStaff.results ?? [],
    deliverySummary: deliverySummary.results ?? []
  });
});

export default app;
