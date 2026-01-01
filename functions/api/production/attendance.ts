import { Hono } from 'hono';
import type { Env } from '../../index';
import { authMiddleware, requireRole } from '../../_utils/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

const ATTENDANCE_RADIUS_METERS = 200;

// Calculate distance between two GPS coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.use('*', authMiddleware, requireRole(['produksi', 'kurir']));

app.post('/', async (c) => {
  const { lat, lng, type } = await c.req.json();
  const user = c.get('user');

  if (type !== 'in' && type !== 'out') {
    return c.json({ message: 'Tipe absen tidak valid' }, 400);
  }

  if (!lat || !lng) {
    return c.json({ message: 'Lokasi GPS wajib diaktifkan' }, 400);
  }

  const db = c.env.DB;

  // Get outlet coordinates for the user
  const outlet = await db.prepare(
    'SELECT o.latitude, o.longitude, o.name FROM outlets o JOIN users u ON u.outlet_id = o.id WHERE u.id = ?'
  ).bind(user.sub).first() as { latitude: number | null; longitude: number | null; name: string } | null;

  // Validate GPS if outlet has coordinates set
  if (outlet && outlet.latitude && outlet.longitude) {
    const distance = calculateDistance(lat, lng, outlet.latitude, outlet.longitude);
    
    if (distance > ATTENDANCE_RADIUS_METERS) {
      return c.json({ 
        message: `Anda berada ${Math.round(distance)}m dari ${outlet.name}. Maksimal jarak absen ${ATTENDANCE_RADIUS_METERS}m.` 
      }, 400);
    }
  }

  await db.prepare(
    'INSERT INTO attendance (user_id, type, lat, lng) VALUES (?, ?, ?, ?)' 
  )
    .bind(user.sub, type, lat, lng)
    .run();

  return c.json({ message: 'Absen tersimpan' });
});

export default app;
