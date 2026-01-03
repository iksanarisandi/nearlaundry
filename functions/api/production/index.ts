import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';
import { getTodayWib, getWibDateBoundaries, getWibDateFromTimestamp } from '../../_utils/timezone';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', authMiddleware, requireRole(['produksi', 'kurir']));

app.post('/', async (c) => {
  const { customer_name, nota_number, process, weight, qty, service_price } = await c.req.json();
  const user = c.get('user');

  if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
    return c.json({ message: 'Nama pelanggan wajib diisi' }, 400);
  }

  if (!nota_number || typeof nota_number !== 'string' || !nota_number.trim()) {
    return c.json({ message: 'Nomor nota wajib diisi' }, 400);
  }

  if (!process || !['cuci','kering','setrika','packing','cuci_sepatu','cuci_satuan'].includes(process)) {
    return c.json({ message: 'Proses tidak valid' }, 400);
  }

  // Weight validation: not required for cuci_satuan and cuci_sepatu
  if (!['cuci_satuan', 'cuci_sepatu'].includes(process)) {
    if (!weight || weight <= 0) {
      return c.json({ message: 'Berat cucian harus lebih dari 0' }, 400);
    }
  }

  if (!qty || qty <= 0) {
    return c.json({ message: 'Qty harus lebih dari 0' }, 400);
  }

  // Service price validation for cuci_satuan
  if (process === 'cuci_satuan' && (!service_price || service_price <= 0)) {
    return c.json({ message: 'Harga jasa wajib diisi untuk cuci satuan' }, 400);
  }

  // Check if nota_number + process combination already exists in same outlet (unique validation)
  const existing = await c.env.DB.prepare(
    'SELECT id FROM production WHERE outlet_id = ? AND nota_number = ? AND process = ?'
  ).bind(user.outlet_id, nota_number.trim(), process).first();

  if (existing) {
    return c.json({ message: `Nota ${nota_number} sudah diinput untuk proses ${process} di outlet ini` }, 400);
  }

  await c.env.DB.prepare(
    'INSERT INTO production (user_id, outlet_id, customer_name, nota_number, process, weight, qty, service_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(user.sub, user.outlet_id, customer_name.trim(), nota_number.trim(), process, weight || 0, qty, service_price || 0)
    .run();

  return c.json({ message: 'Produksi tersimpan' });
});

// Search/tracking production by nota number and/or customer name
app.get('/search', async (c) => {
  const { nota, name } = c.req.query();
  
  if (!nota && !name) {
    return c.json({ message: 'Parameter nota atau name wajib diisi' }, 400);
  }

  const db = c.env.DB;
  let query = `
    SELECT p.*, u.name as staff_name, o.name as outlet_name
    FROM production p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN outlets o ON p.outlet_id = o.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (nota) {
    query += ` AND p.nota_number LIKE ?`;
    params.push(`%${nota}%`);
  }
  if (name) {
    query += ` AND p.customer_name LIKE ?`;
    params.push(`%${name}%`);
  }

  query += ` ORDER BY p.timestamp DESC`;

  const results = await db.prepare(query).bind(...params).all();
  return c.json(results.results ?? []);
});

// Delete production entry (staff can delete their own, within same day)
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const user = c.get('user');
  const db = c.env.DB;

  // Check if entry exists and belongs to user
  const entry = await db.prepare(
    'SELECT * FROM production WHERE id = ? AND user_id = ?'
  ).bind(id, user.sub).first() as any;

  if (!entry) {
    return c.json({ message: 'Data tidak ditemukan atau bukan milik Anda' }, 404);
  }

  // Check if entry has been edited by admin (locked)
  if (entry.edited_by_admin) {
    return c.json({ message: 'Data sudah diedit oleh admin dan tidak bisa dihapus' }, 403);
  }

  // Check if entry is from today (using WIB timezone)
  const entryDateWib = getWibDateFromTimestamp(entry.timestamp as string);
  const todayWib = getTodayWib();
  if (entryDateWib !== todayWib) {
    return c.json({ message: 'Hanya bisa hapus data hari ini' }, 400);
  }

  await db.prepare('DELETE FROM production WHERE id = ?').bind(id).run();
  return c.json({ message: 'Data berhasil dihapus' });
});

// Update production entry (staff can edit their own, within same day)
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const user = c.get('user');
  const { customer_name, nota_number, weight, qty, service_price } = await c.req.json();
  const db = c.env.DB;

  // Check if entry exists and belongs to user
  const entry = await db.prepare(
    'SELECT * FROM production WHERE id = ? AND user_id = ?'
  ).bind(id, user.sub).first() as any;

  if (!entry) {
    return c.json({ message: 'Data tidak ditemukan atau bukan milik Anda' }, 404);
  }

  // Check if entry has been edited by admin (locked)
  if (entry.edited_by_admin) {
    return c.json({ message: 'Data sudah diedit oleh admin dan tidak bisa diubah' }, 403);
  }

  // Check if entry is from today (using WIB timezone)
  const entryDateWib = getWibDateFromTimestamp(entry.timestamp as string);
  const todayWib = getTodayWib();
  if (entryDateWib !== todayWib) {
    return c.json({ message: 'Hanya bisa edit data hari ini' }, 400);
  }

  await db.prepare(
    'UPDATE production SET customer_name = ?, nota_number = ?, weight = ?, qty = ?, service_price = ? WHERE id = ?'
  ).bind(
    customer_name || entry.customer_name,
    nota_number || entry.nota_number,
    weight ?? entry.weight,
    qty ?? entry.qty,
    service_price ?? entry.service_price,
    id
  ).run();

  return c.json({ message: 'Data berhasil diupdate' });
});

export default app;
