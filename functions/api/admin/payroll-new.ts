import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';
import {
  calculateMasaKerja,
  calculateTunjanganJabatan,
  calculateUangMakanRate,
  calculateDenda,
  calculateUangTransport,
  calculateLemburJam,
  calculateLemburAmount,
  getTunjanganJabatanFormula,
  getUangMakanFormula,
  getDendaFormula,
  getUangTransportFormula,
  getLemburFormula,
  DENDA_PER_LATE,
  LATE_TOLERANCE_MINUTES,
  UANG_TRANSPORT_PER_DAY,
  LEMBUR_RATE_PER_HOUR,
  JAM_KERJA_NORMAL
} from '../../_utils/allowance';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// Get payroll for a user in a month
app.get('/', async (c) => {
  const { user_id, month, year } = c.req.query();
  
  if (!month || !year) {
    return c.json({ message: 'Parameter month dan year wajib' }, 400);
  }

  const db = c.env.DB;
  const monthNum = Number(month);
  const yearNum = Number(year);
  
  // Get all users with their payroll data (including join_date)
  let query = `
    SELECT u.id as user_id, u.name, u.role, u.join_date,
           p.gaji_pokok, p.uang_makan, p.uang_transport,
           p.lembur_jam, p.lembur_jam_rate, p.lembur_libur, p.lembur_libur_rate,
           p.tunjangan_jabatan, p.thr, p.denda_terlambat, p.denda, p.kasbon, p.komisi_total
    FROM users u
    LEFT JOIN payroll p ON u.id = p.user_id AND p.month = ? AND p.year = ?
  `;
  
  const params: any[] = [monthNum, yearNum];
  
  if (user_id) {
    query += ' WHERE u.id = ?';
    params.push(Number(user_id));
  }
  
  query += ' ORDER BY u.name';
  
  const result = await db.prepare(query).bind(...params).all();
  
  // Calculate totals and masa kerja
  const data = (result.results ?? []).map((row: any) => {
    const lemburJamTotal = (row.lembur_jam || 0) * (row.lembur_jam_rate || 7000);
    const lemburLiburTotal = (row.lembur_libur || 0) * (row.lembur_libur_rate || 35000);
    const pendapatan = (row.gaji_pokok || 0) + (row.uang_makan || 0) + (row.uang_transport || 0) +
                       lemburJamTotal + lemburLiburTotal + (row.tunjangan_jabatan || 0) +
                       (row.thr || 0) + (row.komisi_total || 0);
    const potongan = (row.denda_terlambat || 0) + (row.denda || 0) + (row.kasbon || 0);
    const gaji_bersih = pendapatan - potongan;
    
    // Calculate masa kerja if join_date exists
    const masa_kerja_bulan = row.join_date 
      ? calculateMasaKerja(row.join_date, monthNum, yearNum) 
      : null;
    
    return {
      ...row,
      masa_kerja_bulan,
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

// Get allowance calculation for a user
app.get('/allowances/:user_id', async (c) => {
  const user_id = Number(c.req.param('user_id'));
  const { month, year } = c.req.query();
  
  if (!month || !year) {
    return c.json({ message: 'Parameter month dan year wajib' }, 400);
  }
  
  const db = c.env.DB;
  const monthNum = Number(month);
  const yearNum = Number(year);
  const ym = `${year}-${month.toString().padStart(2, '0')}`;
  
  // Get user with join_date
  const user = await db.prepare('SELECT id, name, join_date FROM users WHERE id = ?')
    .bind(user_id).first() as { id: number; name: string; join_date: string | null } | null;
  
  if (!user) {
    return c.json({ message: 'User tidak ditemukan' }, 404);
  }
  
  if (!user.join_date) {
    return c.json({ message: 'Join date belum diatur untuk user ini' }, 400);
  }
  
  // Calculate masa kerja
  const masa_kerja_bulan = calculateMasaKerja(user.join_date, monthNum, yearNum);
  
  // Get attendance count for the period
  const attendanceResult = await db.prepare(`
    SELECT COUNT(DISTINCT DATE(timestamp)) as attendance_count
    FROM attendance
    WHERE user_id = ?
      AND type = 'in'
      AND strftime('%Y-%m', timestamp) = ?
  `).bind(user_id, ym).first() as { attendance_count: number } | null;
  
  const attendance_count = attendanceResult?.attendance_count || 0;
  
  // Get late count - determine shift by clock-in time
  // Shift pagi: clock-in before 12:00, should be at 07:00, late if > 07:15
  // Shift sore: clock-in at 12:00 or later, should be at 14:00, late if > 14:15
  const lateResult = await db.prepare(`
    SELECT COUNT(*) as late_count
    FROM attendance
    WHERE user_id = ?
      AND type = 'in'
      AND strftime('%Y-%m', timestamp) = ?
      AND (
        (CAST(strftime('%H', timestamp) AS INTEGER) < 12 
         AND CAST(strftime('%H', timestamp) AS INTEGER) * 60 + CAST(strftime('%M', timestamp) AS INTEGER) > (7 * 60 + ${LATE_TOLERANCE_MINUTES}))
        OR
        (CAST(strftime('%H', timestamp) AS INTEGER) >= 12 
         AND CAST(strftime('%H', timestamp) AS INTEGER) * 60 + CAST(strftime('%M', timestamp) AS INTEGER) > (14 * 60 + ${LATE_TOLERANCE_MINUTES}))
      )
  `).bind(user_id, ym).first() as { late_count: number } | null;
  
  const late_count = lateResult?.late_count || 0;
  
  // Calculate total work hours and overtime from attendance pairs (in/out)
  const workHoursResult = await db.prepare(`
    SELECT 
      DATE(a_in.timestamp) as work_date,
      a_in.timestamp as clock_in,
      a_out.timestamp as clock_out,
      (julianday(a_out.timestamp) - julianday(a_in.timestamp)) * 24 as work_hours
    FROM attendance a_in
    LEFT JOIN attendance a_out ON a_in.user_id = a_out.user_id 
      AND DATE(a_in.timestamp) = DATE(a_out.timestamp)
      AND a_out.type = 'out'
    WHERE a_in.user_id = ?
      AND a_in.type = 'in'
      AND strftime('%Y-%m', a_in.timestamp) = ?
  `).bind(user_id, ym).all();
  
  // Calculate total overtime hours (only count if >= 3 hours per day)
  let total_lembur_jam = 0;
  (workHoursResult.results ?? []).forEach((row: any) => {
    if (row.work_hours && row.work_hours > JAM_KERJA_NORMAL) {
      const dailyOvertime = row.work_hours - JAM_KERJA_NORMAL;
      // Only count if overtime >= 3 hours
      if (dailyOvertime >= 3) {
        total_lembur_jam += Math.floor(dailyOvertime);
      }
    }
  });
  
  // Calculate allowances
  const tunjangan_jabatan = calculateTunjanganJabatan(masa_kerja_bulan);
  const uang_makan_rate = calculateUangMakanRate(masa_kerja_bulan);
  const uang_makan_total = uang_makan_rate * attendance_count;
  const uang_transport_total = calculateUangTransport(attendance_count);
  const lembur_total = calculateLemburAmount(total_lembur_jam);
  const denda_total = calculateDenda(late_count);
  
  return c.json({
    user_id: user.id,
    name: user.name,
    join_date: user.join_date,
    masa_kerja_bulan,
    attendance_count,
    tunjangan_jabatan,
    tunjangan_jabatan_formula: getTunjanganJabatanFormula(masa_kerja_bulan, tunjangan_jabatan),
    uang_makan_rate,
    uang_makan_total,
    uang_makan_formula: getUangMakanFormula(attendance_count, uang_makan_rate, masa_kerja_bulan),
    uang_transport_rate: UANG_TRANSPORT_PER_DAY,
    uang_transport_total,
    uang_transport_formula: getUangTransportFormula(attendance_count),
    lembur_jam: total_lembur_jam,
    lembur_rate: LEMBUR_RATE_PER_HOUR,
    lembur_total,
    lembur_formula: getLemburFormula(total_lembur_jam),
    late_count,
    denda_per_late: DENDA_PER_LATE,
    denda_total,
    denda_formula: getDendaFormula(late_count)
  });
});

// Save/update payroll
app.post('/', async (c) => {
  const body = await c.req.json();
  const { user_id, month, year, gaji_pokok, uang_makan, uang_transport,
          lembur_jam, lembur_jam_rate, lembur_libur, lembur_libur_rate,
          tunjangan_jabatan, thr, denda_terlambat, denda, kasbon, komisi_total } = body;
  
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
        tunjangan_jabatan = ?, thr = ?, denda_terlambat = ?, denda = ?, kasbon = ?, komisi_total = ?
      WHERE user_id = ? AND month = ? AND year = ?
    `).bind(
      gaji_pokok || 0, uang_makan || 0, uang_transport || 0,
      lembur_jam || 0, lembur_jam_rate || 7000, lembur_libur || 0, lembur_libur_rate || 35000,
      tunjangan_jabatan || 0, thr || 0, denda_terlambat || 0, denda || 0, kasbon || 0, komisi_total || 0,
      user_id, month, year
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO payroll (user_id, month, year, gaji_pokok, uang_makan, uang_transport,
        lembur_jam, lembur_jam_rate, lembur_libur, lembur_libur_rate,
        tunjangan_jabatan, thr, denda_terlambat, denda, kasbon, komisi_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user_id, month, year,
      gaji_pokok || 0, uang_makan || 0, uang_transport || 0,
      lembur_jam || 0, lembur_jam_rate || 7000, lembur_libur || 0, lembur_libur_rate || 35000,
      tunjangan_jabatan || 0, thr || 0, denda_terlambat || 0, denda || 0, kasbon || 0, komisi_total || 0
    ).run();
  }
  
  return c.json({ message: 'Payroll berhasil disimpan' });
});

export default app;
