import { Hono } from 'hono';
import { cors } from 'hono/cors';

// API routes
import loginRoute from './api/login';
import dashboardRoute from './api/admin/dashboard';
import revenueRoute from './api/admin/revenue';
import attendanceAllRoute from './api/admin/attendance_all';
import payrollRoute from './api/admin/payroll';
import usersRoute from './api/admin/users';
import outletsRoute from './api/admin/outlets';
import commissionRoute from './api/admin/commission';
import adminWarehouseRoute from './api/admin/warehouse';
import payrollNewRoute from './api/admin/payroll-new';
import settingsRoute from './api/admin/settings';
import productionRoute from './api/production/index';
import attendanceRoute from './api/production/attendance';
import expensesRoute from './api/production/expenses';
import riwayatRoute from './api/production/riwayat';
import warehouseItemsRoute from './api/warehouse/items';
import warehouseOutRoute from './api/warehouse/out';
import deliveryRoute from './api/kurir/delivery';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/api/*', cors());

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Public API for BHP items (used by production staff)
app.get('/api/bhp-items', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT id, name, category, price, unit FROM bhp_items ORDER BY category, name').all();
  return c.json(result.results ?? []);
});

// Auth
app.route('/api/login', loginRoute);

// Admin routes
app.route('/api/dashboard', dashboardRoute);
app.route('/api/revenue', revenueRoute);
app.route('/api/attendance/all', attendanceAllRoute);
app.route('/api/payroll', payrollRoute);
app.route('/api/payroll-v2', payrollNewRoute);
app.route('/api/admin/users', usersRoute);
app.route('/api/admin/outlets', outletsRoute);
app.route('/api/admin/commission', commissionRoute);
app.route('/api/admin/warehouse', adminWarehouseRoute);
app.route('/api/admin/settings', settingsRoute);

// Production routes
app.route('/api/production', productionRoute);
app.route('/api/attendance', attendanceRoute);
app.route('/api/expenses', expensesRoute);
app.route('/api/production/riwayat', riwayatRoute);

// Warehouse routes
app.route('/api/warehouse/items', warehouseItemsRoute);
app.route('/api/warehouse/out', warehouseOutRoute);

// Kurir routes
app.route('/api/delivery', deliveryRoute);

export default app;
