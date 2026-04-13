import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { existsSync } from 'fs';

dotenv.config();
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
import dns from 'node:dns';

// Force Node.js to use Google/Cloudflare DNS for SRV resolution
// This bypasses the buggy local OS resolver in Node 24.14.0
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow if there is no origin (only in development)
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // 2. Allow if origin matches our frontend
    // Use .startsWith to avoid issues with trailing slashes
    if (origin && origin.startsWith(ALLOWED_ORIGIN)) {
      callback(null, true);
    } else {
      // Log the rejected origin to your Vercel logs so you can see what failed
      console.log('Blocked by CORS. Origin was:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const securityMiddleware = (req, res, next) => {
  // Always allow OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') return next();

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (req.path.startsWith('/api/setup')) return next();

  if (process.env.NODE_ENV === 'production') {
    // Allow if it has the right Origin
    const isGoodOrigin = origin && origin.startsWith(ALLOWED_ORIGIN);
    // OR allow if it has the right Referer (fallback for some GET requests)
    const isGoodReferer = referer && referer.startsWith(ALLOWED_ORIGIN);

    if (!isGoodOrigin && !isGoodReferer) {
      return res.status(403).json({
        success: false,
        message: 'Direct access forbidden. Please use the official web dashboard.'
      });
    }
  }
  next();
};

app.use(securityMiddleware);

// Setup route always available (for first-time setup)
app.use('/api/setup', setupRoutes);

// Check if env is configured
const isConfigured = !!process.env.MONGO_URI;

if (isConfigured) {
  connectDB();

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
}

app.get('/api/status', (req, res) => {
  res.json({ 
    configured: isConfigured, 
    appName: process.env.APP_NAME || 'POS System',
    version: '1.0.0'
  });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
