import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

// ─── IMPORTANT: This was missing and caused your crash ───────────────────────
export const checkSetupStatus = asyncHandler(async (req, res) => {
  // On Vercel, we check the environment variable instead of a .env file
  const configured = !!process.env.MONGO_URI;
  res.json({ success: true, configured });
});

// ─── Placeholder to prevent import errors ────────────────────────────────────
export const testConnection = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Ready' });
});

// ─── Your "Easy Signup" Setup ────────────────────────────────────────────────
export const runSetup = asyncHandler(async (req, res) => {
  const { appName, adminEmail, adminPassword } = req.body;
  
  // Get URI from Vercel Environment Variables
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    res.status(500);
    throw new Error('MONGO_URI is not set in Vercel Environment Variables.');
  }

  if (!adminEmail || !adminPassword) {
    res.status(400);
    throw new Error('Email and Password are required.');
  }

  // Ensure DB is connected
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
  }

  const { default: User } = await import('../models/User.js');
  const { Settings } = await import('../models/index.js');

  // Create Admin
  const existing = await User.findOne({ email: adminEmail.toLowerCase() });
  if (!existing) {
    await User.create({
      name: 'Administrator',
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: 'admin',
      isActive: true,
    });
  }

  // Create Settings
  await Settings.findOneAndUpdate(
    {},
    { appName, currency: 'USD', currencySymbol: '$' },
    { upsert: true }
  );

  res.json({ success: true, message: 'Setup complete!' });
});