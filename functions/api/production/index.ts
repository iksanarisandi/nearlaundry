import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

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

  // Check if nota_number + process combination already exists (unique validation)
  const existing = await c.env.DB.prepare(
    'SELECT id FROM production WHERE nota_number = ? AND process = ?'
  ).bind(nota_number.trim(), process).first();

  if (existing) {
    return c.json({ message: `Nota ${nota_number} sudah diinput untuk proses ${process}` }, 400);
  }

  await c.env.DB.prepare(
    'INSERT INTO production (user_id, outlet_id, customer_name, nota_number, process, weight, qty, service_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(user.sub, user.outlet_id, customer_name.trim(), nota_number.trim(), process, weight || 0, qty, service_price || 0)
    .run();

  return c.json({ message: 'Produksi tersimpan' });
});

// Search/tracking production by nota number
app.get('/search', async (c) => {
  const { nota } = c.req.query();
  
  if (!nota) {
    return c.json({ message: 'Parameter nota wajib diisi' }, 400);
  }

  const db = c.env.DB;
  const results = await db.prepare(`
    SELECT p.*, u.name as staff_name, o.name as outlet_name
    FROM production p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN outlets o ON p.outlet_id = o.id
    WHERE p.nota_number LIKE ?
    ORDER BY p.timestamp DESC
  `).bind(`%${nota}%`).all();

  return c.json(results.results ?? []);
});

export default app;
