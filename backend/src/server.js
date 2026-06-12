// Load env vars FIRST — before any require() that reads process.env
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const { initEmailService } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Error handler (must be last)
app.use(errorHandler);

// Start server
const start = async () => {
  await connectDB();
  
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
