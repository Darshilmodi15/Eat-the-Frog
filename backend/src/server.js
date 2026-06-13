// Load env vars FIRST — before any require() that reads process.env
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { initEmailService } = require('./services/emailService');
const Task = require('./models/Task');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists in development/production
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Run database migration for legacy tasks
const runMigration = async () => {
  try {
    console.log('[MIGRATION] Checking for tasks without a workspace...');
    const result = await Task.updateMany(
      { workspace: { $exists: false } },
      { $set: { workspace: 'personal' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[MIGRATION] Migrated ${result.modifiedCount} legacy tasks to "personal" workspace.`);
    } else {
      console.log('[MIGRATION] No legacy tasks needed migration.');
    }
  } catch (err) {
    console.error('[MIGRATION] Error running workspace migration:', err.message);
  }
};

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logger (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const start = async () => {
  await connectDB();
  
  await runMigration();
  
  // Initialize email notification service
  initEmailService();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`CORS origins: http://localhost:5173, http://localhost:5174, ${process.env.CLIENT_URL}`);
    console.log(`Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ loaded' : '❌ MISSING'}`);
  });
};

start(); // Run database connection and start Express server wrapper
