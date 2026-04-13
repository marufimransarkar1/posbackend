import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dns from 'node:dns';
import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import setupRoutes from './routes/setupRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import stockRoutes from './routes/stockRoutes.js';

// ----------------------------------------------------------------------
// 1. DNS & Environment Validation
// ----------------------------------------------------------------------
// Force DNS servers (fixes Node 24.14.0 SRV bug)
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Validate critical environment variables (fail fast)
const requiredEnv = ['MONGO_URI', 'FRONTEND_URL'];
const missing = requiredEnv.filter(key => !process.env[key]);
if (missing.length) {
  console.error(`❌ Missing required env: ${missing.join(', ')}`);
  process.exit(1);
}

const ALLOWED_ORIGIN = process.env.FRONTEND_URL;
const isProduction = process.env.NODE_ENV === 'production';

// ----------------------------------------------------------------------
// 2. Express App
// ----------------------------------------------------------------------
const app = express();

// CORS – allow only frontend origin in production
app.use(cors({
  origin: isProduction ? ALLOWED_ORIGIN : true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------------------------
// 3. Security Middleware (blocks direct access without referer/origin)
// ----------------------------------------------------------------------
const securityMiddleware = (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (req.path.startsWith('/api/setup') || req.path === '/api/status') return next();

  if (isProduction) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const isGoodOrigin = origin && origin.startsWith(ALLOWED_ORIGIN);
    const isGoodReferer = referer && referer.startsWith(ALLOWED_ORIGIN);

    if (!isGoodOrigin && !isGoodReferer) {
      console.warn(`⛔ Blocked ${req.method} ${req.path} – origin: ${origin}, referer: ${referer}`);
      return res.status(403).json({
        success: false,
        message: 'Direct access forbidden.',
      });
    }
  }
  next();
};

app.use(securityMiddleware);

// ----------------------------------------------------------------------
// 4. Routes & DB Connection
// ----------------------------------------------------------------------
// Setup route always available
app.use('/api/setup', setupRoutes);

const isConfigured = !!process.env.MONGO_URI;
if (isConfigured) {
  // Connect to DB (assumes connectDB returns a promise)
  try {
    await connectDB();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/brands', brandRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/stock', stockRoutes);
} else {
  console.warn('⚠️ MONGO_URI missing – API routes disabled');
}

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    configured: isConfigured,
    appName: process.env.APP_NAME || 'POS System',
    version: '1.0.0',
    environment: isProduction ? 'production' : 'development',
  });
});

// Error handling (must be last)
app.use(notFound);
app.use(errorHandler);

// ----------------------------------------------------------------------
// 5. Start Server with Graceful Shutdown
// ----------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} (${isProduction ? 'prod' : 'dev'})`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received. Closing server...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  // Force exit after 10 seconds if something hangs
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully exiting');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  if (isProduction) process.exit(1);
});
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  if (isProduction) process.exit(1);
});