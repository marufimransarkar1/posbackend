// import asyncHandler from 'express-async-handler';
// import { writeFileSync, existsSync } from 'fs';
// import mongoose from 'mongoose';
// import cloudinaryPkg from 'cloudinary';

// const cloudinaryV2 = cloudinaryPkg.v2;

// // ─── Check if already configured ─────────────────────────────────────────────
// export const checkSetupStatus = asyncHandler(async (req, res) => {
//   const configured = existsSync('.env') && !!process.env.MONGO_URI;
//   res.json({ success: true, configured });
// });

// // ─── Test MongoDB connection only ─────────────────────────────────────────────
// export const testConnection = asyncHandler(async (req, res) => {
//   const { mongoUri } = req.body;

//   if (!mongoUri || !mongoUri.startsWith('mongodb')) {
//     res.status(400);
//     throw new Error('Invalid MongoDB URI. Must start with mongodb:// or mongodb+srv://');
//   }

//   let conn;
//   try {
//     conn = mongoose.createConnection(mongoUri, {
//       serverSelectionTimeoutMS: 8000,
//       connectTimeoutMS: 8000,
//     });
//     await conn.asPromise();
//     await conn.close();
//     res.json({ success: true, message: 'MongoDB connection successful!' });
//   } catch (err) {
//     if (conn) { try { await conn.close(); } catch {} }
//     res.status(400);
//     throw new Error('MongoDB connection failed: ' + err.message);
//   }
// });

// // ─── Run full setup ───────────────────────────────────────────────────────────
// export const runSetup = asyncHandler(async (req, res) => {
//   const {
//     appName, mongoUri, jwtSecret, adminEmail, adminPassword,
//     cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret,
//     verificationApiUrl, frontendUrl,
//     skipCloudinary, skipVerification,
//   } = req.body;

//   const warnings = [];

//   // ── Validate required fields ──────────────────────────────────────────────
//   if (!appName?.trim())       { res.status(400); throw new Error('App name is required'); }
//   if (!mongoUri?.trim())      { res.status(400); throw new Error('MongoDB URI is required'); }
//   if (!jwtSecret?.trim())     { res.status(400); throw new Error('JWT secret is required'); }
//   if (!adminEmail?.trim())    { res.status(400); throw new Error('Admin email is required'); }
//   if (!adminPassword?.trim()) { res.status(400); throw new Error('Admin password is required'); }
//   if (adminPassword.length < 6) { res.status(400); throw new Error('Admin password must be at least 6 characters'); }

//   // ── Step 1: Connect MongoDB ───────────────────────────────────────────────
//   try {
//     if (mongoose.connection.readyState !== 1) {
//       await mongoose.connect(mongoUri, {
//         serverSelectionTimeoutMS: 10000,
//         connectTimeoutMS: 10000,
//       });
//     }
//   } catch (err) {
//     res.status(400);
//     throw new Error('MongoDB connection failed: ' + err.message + '. Make sure MongoDB is running and your URI is correct.');
//   }

//   // ── Step 2: Test Cloudinary ───────────────────────────────────────────────
//   if (skipCloudinary) {
//     warnings.push('Cloudinary skipped — image uploads will not work until you configure it in Settings.');
//   } else if (cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret) {
//     try {
//       cloudinaryV2.config({
//         cloud_name: cloudinaryCloudName,
//         api_key: cloudinaryApiKey,
//         api_secret: cloudinaryApiSecret,
//       });
//       await cloudinaryV2.api.ping();
//     } catch (err) {
//       res.status(400);
//       throw new Error('Cloudinary failed: ' + err.message + '. Check your credentials, or enable "Skip Cloudinary".');
//     }
//   } else {
//     warnings.push('Cloudinary credentials empty — image uploads disabled. Add them later in Settings.');
//   }

//   // ── Step 3: Test Verification API ─────────────────────────────────────────
//   if (skipVerification) {
//     warnings.push('License verification skipped — app running without license check.');
//   } else if (verificationApiUrl?.trim()) {
//     try {
//       const controller = new AbortController();
//       const timer = setTimeout(() => controller.abort(), 8000);
//       const resp = await fetch(verificationApiUrl.replace(/\/$/, '') + '/verify', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         signal: controller.signal,
//         body: JSON.stringify({
//           frontendUrl: frontendUrl || 'http://localhost:5173',
//           installationId: 'POSAPP-' + Date.now(),
//           timestamp: Date.now(),
//         }),
//       });
//       clearTimeout(timer);

//       if (!resp.ok) {
//         res.status(400);
//         throw new Error('Verification server returned HTTP ' + resp.status + '. Make sure it is running correctly.');
//       }

//       const data = await resp.json();
//       if (data.valid !== true) {
//         res.status(403);
//         throw new Error('License check failed: ' + (data.message || 'Not authorized') + '. Or enable "Skip Verification".');
//       }
//     } catch (err) {
//       if (err.name === 'AbortError') {
//         res.status(400);
//         throw new Error('Verification API timed out at: ' + verificationApiUrl + '. Start the verification server first, or enable "Skip Verification".');
//       }
//       if (res.statusCode === 400 || res.statusCode === 403) throw err;
//       res.status(400);
//       throw new Error('Cannot reach verification API: ' + err.message + '. Or enable "Skip Verification".');
//     }
//   } else {
//     warnings.push('No verification URL — skipping license check.');
//   }

//   // ── Step 4: Write .env ────────────────────────────────────────────────────
//   const env = [
//     'APP_NAME=' + appName,
//     'MONGO_URI=' + mongoUri,
//     'JWT_SECRET=' + jwtSecret,
//     'CLOUDINARY_CLOUD_NAME=' + (cloudinaryCloudName || ''),
//     'CLOUDINARY_API_KEY=' + (cloudinaryApiKey || ''),
//     'CLOUDINARY_API_SECRET=' + (cloudinaryApiSecret || ''),
//     'VERIFICATION_API_URL=' + (verificationApiUrl || ''),
//     'FRONTEND_URL=' + (frontendUrl || 'http://localhost:5173'),
//     'NODE_ENV=production',
//     'PORT=5000',
//   ].join('\n') + '\n';

//   // try {
//   //   writeFileSync('.env', env, 'utf8');
//   // } catch (err) {
//   //   res.status(500);
//   //   throw new Error('Failed to write .env file: ' + err.message + '. Check folder write permissions.');
//   // }

//   console.log('Vercel environment detected: Skipping .env file creation.');

//   // ── Step 5: Create admin + settings ───────────────────────────────────────
//   try {
//     const { default: User } = await import('../models/User.js');
//     const { Settings } = await import('../models/index.js');

//     const existing = await User.findOne({ email: adminEmail.toLowerCase() });
//     if (!existing) {
//       await User.create({
//         name: 'Administrator',
//         email: adminEmail.toLowerCase(),
//         password: adminPassword,
//         role: 'admin',
//         isActive: true,
//       });
//     } else {
//       warnings.push('Admin user already exists — password not changed.');
//     }

//     await Settings.findOneAndUpdate(
//       {},
//       { appName, currency: 'USD', currencySymbol: '$', taxRate: 0, invoicePrefix: 'INV' },
//       { upsert: true, new: true }
//     );
//   } catch (err) {
//     res.status(500);
//     throw new Error('Failed to create admin account: ' + err.message);
//   }

//   res.json({
//     success: true,
//     message: 'Setup complete! Restart the backend server, then log in.',
//     warnings,
//   });
// });


export const runSetup = asyncHandler(async (req, res) => {
  const { appName, adminEmail, adminPassword } = req.body;

  // 1. Basic Validation
  if (!adminEmail || !adminPassword) {
    res.status(400);
    throw new Error('Please fill in all fields');
  }

  // 2. Create Admin User
  const { default: User } = await import('../models/User.js');
  const { Settings } = await import('../models/index.js');

  const existing = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('Admin already exists. Please log in.');
  }

  await User.create({
    name: 'Administrator',
    email: adminEmail.toLowerCase(),
    password: adminPassword,
    role: 'admin',
    isActive: true,
  });

  // 3. Create initial settings document
  await Settings.findOneAndUpdate(
    {},
    { appName, currency: 'USD', currencySymbol: '$' },
    { upsert: true }
  );

  res.json({ success: true, message: 'Setup successful' });
});

