import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';
import { getWitaMonthBoundaries, formatTimestampWita, getCurrentMonthWita } from '../../_utils/timezone';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['admin']));

// GET /api/admin/production-audit/list?month=YYYY-MM&outlet_id=X&user_id=X&verified=all|true|false
app.get('/list', async (c) => {
  const { month, outlet_id, user_id, verified } = c.req.query();
  
  // Default to current month if not provided
  let targetMonth: string;
  if (!month) {
    const current = getCurrentMonthWita();
    targetMonth = `${current.year}-${String(current.month).padStart(2, '0')}`;
  } else {
    targetMonth = month;
  }
  
  // Validate month format
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(targetMonth)) {
    return c.json({ message: 'Format bulan tidak valid (YYYY-MM)' }, 400);
  }
  
  const [year, monthNum] = targetMonth.split('-').map(Number);
  if (monthNum < 1 || monthNum > 12) {
    return c.json({ message: 'Bulan tidak valid (1-12)' }, 400);
  }
  
  // Get month boundaries in UTC
  const boundaries = getWitaMonthBoundaries(monthNum, year);
  
  const db = c.env.DB;
  let query = `
    SELECT 
      p.id,
      p.user_id,
      u.name as user_name,
      p.outlet_id,
      o.name as outlet_name,
      p.customer_name,
      p.nota_number,
      p.process,
      p.weight,
      p.qty,
      p.service_price,
      p.timestamp,
      COALESCE(p.verified_status, 'unverified') as verified_status,
      p.verified_by,
      v.name as verified_by_name,
      p.verified_at,
      p.edited_by_admin
    FROM production p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN outlets o ON p.outlet_id = o.id
    LEFT JOIN users v ON p.verified_by = v.id
    WHERE p.timestamp >= ? AND p.timestamp <= ?
  `;
  
  const params: (string | number)[] = [boundaries.startUtc, boundaries.endUtc];
  
  // Filter by outlet
  if (outlet_id) {
    query += ` AND p.outlet_id = ?`;
    params.push(Number(outlet_id));
  }
  
  // Filter by user
  if (user_id) {
    query += ` AND p.user_id = ?`;
    params.push(Number(user_id));
  }
  
  // Filter by verification status
  if (verified === 'true') {
    query += ` AND p.verified_status = 'verified'`;
  } else if (verified === 'false') {
    query += ` AND (p.verified_status = 'unverified' OR p.verified_status IS NULL)`;
  }
  
  query += ` ORDER BY p.nota_number, p.process, p.timestamp`;
  
  const rows = await db.prepare(query).bind(...params).all();
  
  // Add WITA formatted timestamps
  const results = (rows.results ?? []).map((row: any) => ({
    ...row,
    timestamp_wita: formatTimestampWita(row.timestamp),
    verified_at_wita: row.verified_at ? formatTimestampWita(row.verified_at) : null
  }));
  
  return c.json(results);
});

// GET /api/admin/production-audit/summary?month=YYYY-MM&outlet_id=X&user_id=X
app.get('/summary', async (c) => {
  const { month, outlet_id, user_id } = c.req.query();
  
  // Default to current month if not provided
  let targetMonth: string;
  if (!month) {
    const current = getCurrentMonthWita();
    targetMonth = `${current.year}-${String(current.month).padStart(2, '0')}`;
  } else {
    targetMonth = month;
  }
  
  // Validate month format
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(targetMonth)) {
    return c.json({ message: 'Format bulan tidak valid (YYYY-MM)' }, 400);
  }
  
  const [year, monthNum] = targetMonth.split('-').map(Number);
  if (monthNum < 1 || monthNum > 12) {
    return c.json({ message: 'Bulan tidak valid (1-12)' }, 400);
  }
  
  const boundaries = getWitaMonthBoundaries(monthNum, year);
  const db = c.env.DB;
  
  // Build WHERE clause
  let whereClause = `WHERE p.timestamp >= ? AND p.timestamp <= ?`;
  const params: (string | number)[] = [boundaries.startUtc, boundaries.endUtc];
  
  if (outlet_id) {
    whereClause += ` AND p.outlet_id = ?`;
    params.push(Number(outlet_id));
  }
  
  if (user_id) {
    whereClause += ` AND p.user_id = ?`;
    params.push(Number(user_id));
  }
  
  // Get totals
  const totalsQuery = `
    SELECT 
      COALESCE(SUM(p.weight), 0) as total_weight,
      COALESCE(SUM(p.qty), 0) as total_qty
    FROM production p
    ${whereClause}
  `;
  const totals = await db.prepare(totalsQuery).bind(...params).first() as any;
  
  // Get nota counts (verified vs unverified)
  // Count distinct nota_number + outlet_id combinations
  const notaCountQuery = `
    SELECT 
      COUNT(DISTINCT CASE WHEN p.verified_status = 'verified' THEN p.nota_number || '-' || p.outlet_id END) as verified_notas,
      COUNT(DISTINCT CASE WHEN p.verified_status != 'verified' OR p.verified_status IS NULL THEN p.nota_number || '-' || p.outlet_id END) as unverified_notas,
      COUNT(DISTINCT p.nota_number || '-' || p.outlet_id) as total_notas
    FROM production p
    ${whereClause}
  `;
  const notaCounts = await db.prepare(notaCountQuery).bind(...params).first() as any;
  
  // Get per-user breakdown
  const perUserQuery = `
    SELECT 
      p.user_id,
      u.name as user_name,
      COALESCE(SUM(p.weight), 0) as total_weight,
      COALESCE(SUM(p.qty), 0) as total_qty
    FROM production p
    JOIN users u ON p.user_id = u.id
    ${whereClause}
    GROUP BY p.user_id, u.name
    ORDER BY u.name
  `;
  const perUser = await db.prepare(perUserQuery).bind(...params).all();
  
  return c.json({
    total_weight: totals?.total_weight ?? 0,
    total_qty: totals?.total_qty ?? 0,
    total_notas: notaCounts?.total_notas ?? 0,
    verified_notas: notaCounts?.verified_notas ?? 0,
    unverified_notas: notaCounts?.unverified_notas ?? 0,
    per_user: perUser.results ?? []
  });
});

export default app;


// PUT /api/admin/production-audit/:id - Edit production entry
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const admin = c.get('user');
  const body = await c.req.json();
  const { customer_name, nota_number, process, weight, qty, service_price } = body;
  
  const db = c.env.DB;
  
  // Get existing entry
  const existing = await db.prepare(
    'SELECT * FROM production WHERE id = ?'
  ).bind(id).first() as any;
  
  if (!existing) {
    return c.json({ message: 'Data produksi tidak ditemukan' }, 404);
  }
  
  // Validate inputs
  const validProcesses = ['cuci', 'kering', 'setrika', 'packing', 'cuci_sepatu', 'cuci_satuan'];
  
  if (customer_name !== undefined && (!customer_name || !customer_name.trim())) {
    return c.json({ message: 'Nama pelanggan tidak boleh kosong' }, 400);
  }
  
  if (nota_number !== undefined && (!nota_number || !nota_number.trim())) {
    return c.json({ message: 'Nomor nota tidak boleh kosong' }, 400);
  }
  
  if (process !== undefined && !validProcesses.includes(process)) {
    return c.json({ message: 'Proses tidak valid' }, 400);
  }
  
  if (weight !== undefined && weight < 0) {
    return c.json({ message: 'Berat tidak boleh negatif' }, 400);
  }
  
  if (qty !== undefined && qty <= 0) {
    return c.json({ message: 'Qty harus lebih dari 0' }, 400);
  }
  
  if (service_price !== undefined && service_price < 0) {
    return c.json({ message: 'Harga jasa tidak boleh negatif' }, 400);
  }
  
  // Prepare updates and track changes for history
  const changes: { field: string; oldValue: any; newValue: any }[] = [];
  
  const newCustomerName = customer_name !== undefined ? customer_name.trim() : existing.customer_name;
  const newNotaNumber = nota_number !== undefined ? nota_number.trim() : existing.nota_number;
  const newProcess = process !== undefined ? process : existing.process;
  const newWeight = weight !== undefined ? weight : existing.weight;
  const newQty = qty !== undefined ? qty : existing.qty;
  const newServicePrice = service_price !== undefined ? service_price : existing.service_price;
  
  // Track changes
  if (newCustomerName !== existing.customer_name) {
    changes.push({ field: 'customer_name', oldValue: existing.customer_name, newValue: newCustomerName });
  }
  if (newNotaNumber !== existing.nota_number) {
    changes.push({ field: 'nota_number', oldValue: existing.nota_number, newValue: newNotaNumber });
  }
  if (newProcess !== existing.process) {
    changes.push({ field: 'process', oldValue: existing.process, newValue: newProcess });
  }
  if (newWeight !== existing.weight) {
    changes.push({ field: 'weight', oldValue: String(existing.weight), newValue: String(newWeight) });
  }
  if (newQty !== existing.qty) {
    changes.push({ field: 'qty', oldValue: String(existing.qty), newValue: String(newQty) });
  }
  if (newServicePrice !== existing.service_price) {
    changes.push({ field: 'service_price', oldValue: String(existing.service_price), newValue: String(newServicePrice) });
  }
  
  if (changes.length === 0) {
    return c.json({ message: 'Tidak ada perubahan' }, 400);
  }
  
  // Update production entry
  await db.prepare(`
    UPDATE production 
    SET customer_name = ?, nota_number = ?, process = ?, weight = ?, qty = ?, service_price = ?, edited_by_admin = ?
    WHERE id = ?
  `).bind(newCustomerName, newNotaNumber, newProcess, newWeight, newQty, newServicePrice, admin.sub, id).run();
  
  // Create history records for each changed field
  for (const change of changes) {
    await db.prepare(`
      INSERT INTO production_edit_history (production_id, admin_id, field_changed, old_value, new_value)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, admin.sub, change.field, change.oldValue, change.newValue).run();
  }
  
  return c.json({ message: 'Data berhasil diupdate', changes_count: changes.length });
});

// GET /api/admin/production-audit/history/:id - Get edit history for a production entry
app.get('/history/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = c.env.DB;
  
  // Check if production entry exists
  const existing = await db.prepare('SELECT id FROM production WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ message: 'Data produksi tidak ditemukan' }, 404);
  }
  
  const query = `
    SELECT 
      h.id,
      h.production_id,
      h.admin_id,
      u.name as admin_name,
      h.field_changed,
      h.old_value,
      h.new_value,
      h.created_at
    FROM production_edit_history h
    JOIN users u ON h.admin_id = u.id
    WHERE h.production_id = ?
    ORDER BY h.created_at DESC
  `;
  
  const rows = await db.prepare(query).bind(id).all();
  
  // Add WITA formatted timestamps
  const results = (rows.results ?? []).map((row: any) => ({
    ...row,
    created_at_wita: formatTimestampWita(row.created_at)
  }));
  
  return c.json(results);
});


// POST /api/admin/production-audit/verify - Verify all entries with same nota_number in outlet
app.post('/verify', async (c) => {
  const admin = c.get('user');
  const { nota_number, outlet_id } = await c.req.json();
  
  if (!nota_number || !nota_number.trim()) {
    return c.json({ message: 'Nomor nota wajib diisi' }, 400);
  }
  
  if (!outlet_id) {
    return c.json({ message: 'Outlet ID wajib diisi' }, 400);
  }
  
  const db = c.env.DB;
  const now = new Date().toISOString();
  
  // Check if any entries exist with this nota
  const existing = await db.prepare(
    'SELECT COUNT(*) as count FROM production WHERE nota_number = ? AND outlet_id = ?'
  ).bind(nota_number.trim(), outlet_id).first() as any;
  
  if (!existing || existing.count === 0) {
    return c.json({ message: 'Nota tidak ditemukan' }, 404);
  }
  
  // Update all entries with this nota to verified
  await db.prepare(`
    UPDATE production 
    SET verified_status = 'verified', verified_by = ?, verified_at = ?
    WHERE nota_number = ? AND outlet_id = ?
  `).bind(admin.sub, now, nota_number.trim(), outlet_id).run();
  
  return c.json({ message: 'Nota berhasil diverifikasi', count: existing.count });
});

// POST /api/admin/production-audit/unverify - Unverify all entries with same nota_number in outlet
app.post('/unverify', async (c) => {
  const admin = c.get('user');
  const { nota_number, outlet_id } = await c.req.json();
  
  if (!nota_number || !nota_number.trim()) {
    return c.json({ message: 'Nomor nota wajib diisi' }, 400);
  }
  
  if (!outlet_id) {
    return c.json({ message: 'Outlet ID wajib diisi' }, 400);
  }
  
  const db = c.env.DB;
  const now = new Date().toISOString();
  
  // Check if any entries exist with this nota
  const existing = await db.prepare(
    'SELECT COUNT(*) as count FROM production WHERE nota_number = ? AND outlet_id = ?'
  ).bind(nota_number.trim(), outlet_id).first() as any;
  
  if (!existing || existing.count === 0) {
    return c.json({ message: 'Nota tidak ditemukan' }, 404);
  }
  
  // Update all entries with this nota to unverified
  await db.prepare(`
    UPDATE production 
    SET verified_status = 'unverified', verified_by = ?, verified_at = ?
    WHERE nota_number = ? AND outlet_id = ?
  `).bind(admin.sub, now, nota_number.trim(), outlet_id).run();
  
  return c.json({ message: 'Verifikasi nota dibatalkan', count: existing.count });
});


// GET /api/admin/production-audit/export?month=YYYY-MM&outlet_id=X&user_id=X&verified=all|true|false
app.get('/export', async (c) => {
  const { month, outlet_id, user_id, verified } = c.req.query();
  
  // Default to current month if not provided
  let targetMonth: string;
  if (!month) {
    const current = getCurrentMonthWita();
    targetMonth = `${current.year}-${String(current.month).padStart(2, '0')}`;
  } else {
    targetMonth = month;
  }
  
  // Validate month format
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(targetMonth)) {
    return c.json({ message: 'Format bulan tidak valid (YYYY-MM)' }, 400);
  }
  
  const [year, monthNum] = targetMonth.split('-').map(Number);
  if (monthNum < 1 || monthNum > 12) {
    return c.json({ message: 'Bulan tidak valid (1-12)' }, 400);
  }
  
  const boundaries = getWitaMonthBoundaries(monthNum, year);
  const db = c.env.DB;
  
  let query = `
    SELECT 
      p.nota_number,
      u.name as user_name,
      o.name as outlet_name,
      p.customer_name,
      p.process,
      p.qty,
      p.weight,
      p.service_price,
      p.timestamp,
      COALESCE(p.verified_status, 'unverified') as verified_status
    FROM production p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN outlets o ON p.outlet_id = o.id
    WHERE p.timestamp >= ? AND p.timestamp <= ?
  `;
  
  const params: (string | number)[] = [boundaries.startUtc, boundaries.endUtc];
  
  if (outlet_id) {
    query += ` AND p.outlet_id = ?`;
    params.push(Number(outlet_id));
  }
  
  if (user_id) {
    query += ` AND p.user_id = ?`;
    params.push(Number(user_id));
  }
  
  if (verified === 'true') {
    query += ` AND p.verified_status = 'verified'`;
  } else if (verified === 'false') {
    query += ` AND (p.verified_status = 'unverified' OR p.verified_status IS NULL)`;
  }
  
  query += ` ORDER BY p.nota_number, p.process, p.timestamp`;
  
  const rows = await db.prepare(query).bind(...params).all();
  const data = rows.results ?? [];
  
  // Generate CSV with semicolon separator for Excel compatibility
  const headers = ['Nota', 'Staff', 'Outlet', 'Pelanggan', 'Proses', 'Qty', 'Berat (kg)', 'Harga Jasa', 'Waktu (WITA)', 'Status'];
  
  const csvRows = [headers.join(';')];
  
  for (const row of data as any[]) {
    const timestampWita = formatTimestampWita(row.timestamp);
    const csvRow = [
      escapeCSV(row.nota_number),
      escapeCSV(row.user_name),
      escapeCSV(row.outlet_name || ''),
      escapeCSV(row.customer_name || ''),
      escapeCSV(row.process),
      String(row.qty),
      String(row.weight),
      String(row.service_price || 0),
      escapeCSV(timestampWita),
      row.verified_status === 'verified' ? 'Terverifikasi' : 'Belum Verifikasi'
    ];
    csvRows.push(csvRow.join(';'));
  }
  
  const csv = csvRows.join('\n');
  
  // Generate filename
  let outletName = 'semua-outlet';
  if (outlet_id) {
    const outlet = await db.prepare('SELECT name FROM outlets WHERE id = ?').bind(Number(outlet_id)).first() as any;
    if (outlet) {
      outletName = outlet.name.toLowerCase().replace(/\s+/g, '-');
    }
  }
  
  const filename = `audit-produksi-${outletName}-${targetMonth}.csv`;
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
});

// Helper function to escape CSV values
function escapeCSV(value: string): string {
  if (!value) return '';
  // If value contains semicolon, newline, or quotes, wrap in quotes and escape existing quotes
  if (value.includes(';') || value.includes('\n') || value.includes('"')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
