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
  origin: process.env.FRONTEND_URL || 'https://pos-inky-two.vercel.app',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
