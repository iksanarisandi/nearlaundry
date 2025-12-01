import { Hono } from 'hono';
import { cors } from 'hono/cors';

// API routes
import loginRoute from './api/login';
import dashboardRoute from './api/admin/dashboard';
import revenueRoute from './api/admin/revenue';
import attendanceAllRoute from './api/admin/attendance_all';
import payrollRoute from './api/admin/payroll';
import usersRoute from './api/admin/users';
import productionRoute from './api/production/index';
import attendanceRoute from './api/production/attendance';
import expensesRoute from './api/production/expenses';
import riwayatRoute from './api/production/riwayat';
import warehouseItemsRoute from './api/warehouse/items';
import warehouseOutRoute from './api/warehouse/out';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/api/*', cors());

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Auth
app.route('/api/login', loginRoute);

// Admin routes
app.route('/api/dashboard', dashboardRoute);
app.route('/api/revenue', revenueRoute);
app.route('/api/attendance/all', attendanceAllRoute);
app.route('/api/payroll', payrollRoute);
app.route('/api/admin/users', usersRoute);

// Production routes
app.route('/api/production', productionRoute);
app.route('/api/attendance', attendanceRoute);
app.route('/api/expenses', expensesRoute);
app.route('/api/production/riwayat', riwayatRoute);

// Warehouse routes
app.route('/api/warehouse/items', warehouseItemsRoute);
app.route('/api/warehouse/out', warehouseOutRoute);

export default app;
