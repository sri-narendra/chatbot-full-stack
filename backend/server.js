require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const chatRoutes = require('./routes/chat');

const app = express();

// Middleware - Allow all origins for development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URI;
console.log('Connecting to MongoDB...');

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log(`📊 Database: ${mongoose.connection.db?.databaseName}`);
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
});

// Routes
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Gemini Chat API is running',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      chat: 'POST /api/chat',
      sessions: 'GET /api/chat/sessions',
      history: 'GET /api/chat/history/:sessionId',
      status: 'GET /api/chat/status',
      health: 'GET /health'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log(`📡 CORS enabled for all origins`);
  console.log(`🔧 API Status: http://localhost:${PORT}/api/chat/status`);
});