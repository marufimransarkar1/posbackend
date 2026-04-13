export const runSetup = asyncHandler(async (req, res) => {
  // 1. Prioritize the system environment variable
  // Fallback to the form input if the environment variable isn't set yet
  const mongoUri = process.env.MONGO_URI || req.body.mongoUri;
  const { appName, adminEmail, adminPassword } = req.body;

  // 2. Validation
  if (!mongoUri) {
    res.status(400);
    throw new Error('MongoDB URI is missing. Please provide it in the form or set it in Vercel settings.');
  }
  if (!adminEmail || !adminPassword) {
    res.status(400);
    throw new Error('Admin email and password are required.');
  }

  // 3. Connect using the URI we found
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri);
    }
  } catch (err) {
    res.status(400);
    throw new Error('Database connection failed. Check your MONGO_URI.');
  }

  // 4. Create Admin & Settings
  try {
    const { default: User } = await import('../models/User.js');
    const { Settings } = await import('../models/index.js');

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

    await Settings.findOneAndUpdate(
      {},
      { appName, currency: 'USD', currencySymbol: '$' },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'System initialized successfully!',
    });
  } catch (err) {
    res.status(500);
    throw new Error('Setup failed: ' + err.message);
  }
});