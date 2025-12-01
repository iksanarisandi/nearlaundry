import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// Get payroll for a user in a month
app.get('/', async (c) => {
  const { user_id, month, year } = c.req.query();
  
  if (!month || !year) {
    return c.json({ message: 'Parameter month dan year wajib' }, 400);
  }

  const db = c.env.DB;
  
  // Get all users with their payroll data
  let query = `
    SELECT u.id as user_id, u.name, u.role,
           p.gaji_pokok, p.uang_makan, p.uang_transport,
           p.lembur_jam, p.lembur_jam_rate, p.lembur_libur, p.lembur_libur_rate,
           p.tunjangan_jabatan, p.thr, p.denda, p.kasbon, p.komisi_total
    FROM users u
    LEFT JOIN payroll p ON u.id = p.user_id AND p.month = ? AND p.year = ?
  `;
  
  const params: any[] = [Number(month), Number(year)];
  
  if (user_id) {
    query += ' WHERE u.id = ?';
    params.push(Number(user_id));
  }
  
  query += ' ORDER BY u.name';
  
  const result = await db.prepare(query).bind(...params).all();
  
  // Calculate totals
  const data = (result.results ?? []).map((row: any) => {
    const lemburJamTotal = (row.lembur_jam || 0) * (row.lembur_jam_rate || 7000);
    const lemburLiburTotal = (row.lembur_libur || 0) * (row.lembur_libur_rate || 35000);
    const pendapatan = (row.gaji_pokok || 0) + (row.uang_makan || 0) + (row.uang_transport || 0) +
                       lemburJamTotal + lemburLiburTotal + (row.tunjangan_jabatan || 0) +
                       (row.thr || 0) + (row.komisi_total || 0);
    const potongan = (row.denda || 0) + (row.kasbon || 0);
    const gaji_bersih = pendapatan - potongan;
    
    return {
      ...row,
      lembur_jam_total: lemburJamTotal,
      lembur_libur_total: lemburLiburTotal,
      pendapatan,
      potongan,
      gaji_bersih
    };
  });
  
  return c.json(data);
});

// Get commission summary for a user in a month
app.get('/commission/:user_id', async (c) => {
  const user_id = Number(c.req.param('user_id'));
  const { month, year } = c.req.query();
  
  if (!month || !year) {
    return c.json({ message: 'Parameter month dan year wajib' }, 400);
  }
  
  const db = c.env.DB;
  const ym = `${year}-${month.toString().padStart(2, '0')}`;
  
  // Get production summary per process
  const production = await db.prepare(`
    SELECT process, SUM(weight) as total_kg
    FROM production
    WHERE user_id = ? AND substr(timestamp, 1, 7) = ?
    GROUP BY process
  `).bind(user_id, ym).all();
  
  // Get commission rates
  const rates = await db.prepare('SELECT process, rate_per_kg FROM commission_rates').all();
  const rateMap: Record<string, number> = {};
  (rates.results ?? []).forEach((r: any) => { rateMap[r.process] = r.rate_per_kg; });
  
  // Calculate commission per process
  const commissions = (production.results ?? []).map((p: any) => ({
    process: p.process,
    total_kg: p.total_kg,
    rate_per_kg: rateMap[p.process] || 0,
    total: Math.round((p.total_kg || 0) * (rateMap[p.process] || 0))
  }));
  
  const total_komisi = commissions.reduce((sum, c) => sum + c.total, 0);
  
  return c.json({ commissions, total_komisi });
});

// Save/update payroll
app.post('/', async (c) => {
  const body = await c.req.json();
  const { user_id, month, year, gaji_pokok, uang_makan, uang_transport,
          lembur_jam, lembur_jam_rate, lembur_libur, lembur_libur_rate,
          tunjangan_jabatan, thr, denda, kasbon, komisi_total } = body;
  
  if (!user_id || !month || !year) {
    return c.json({ message: 'user_id, month, dan year wajib diisi' }, 400);
  }
  
  const db = c.env.DB;
  
  // Check if exists
  const existing = await db.prepare('SELECT id FROM payroll WHERE user_id = ? AND month = ? AND year = ?')
    .bind(user_id, month, year).first();
  
  if (existing) {
    await db.prepare(`
      UPDATE payroll SET 
        gaji_pokok = ?, uang_makan = ?, uang_transport = ?,
        lembur_jam = ?, lembur_jam_rate = ?, lembur_libur = ?, lembur_libur_rate = ?,
        tunjangan_jabatan = ?, thr = ?, denda = ?, kasbon = ?, komisi_total = ?
      WHERE user_id = ? AND month = ? AND year = ?
    `).bind(
      gaji_pokok || 0, uang_makan || 0, uang_transport || 0,
      lembur_jam || 0, lembur_jam_rate || 7000, lembur_libur || 0, lembur_libur_rate || 35000,
      tunjangan_jabatan || 0, thr || 0, denda || 0, kasbon || 0, komisi_total || 0,
      user_id, month, year
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO payroll (user_id, month, year, gaji_pokok, uang_makan, uang_transport,
        lembur_jam, lembur_jam_rate, lembur_libur, lembur_libur_rate,
        tunjangan_jabatan, thr, denda, kasbon, komisi_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user_id, month, year,
      gaji_pokok || 0, uang_makan || 0, uang_transport || 0,
      lembur_jam || 0, lembur_jam_rate || 7000, lembur_libur || 0, lembur_libur_rate || 35000,
      tunjangan_jabatan || 0, thr || 0, denda || 0, kasbon || 0, komisi_total || 0
    ).run();
  }
  
  return c.json({ message: 'Payroll berhasil disimpan' });
});

export default app;
