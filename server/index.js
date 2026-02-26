// index.js - BeatPay v2 Server Entry Point
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { initSocket } = require('./sockets/socketManager');

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
];

// ============================================
// Socket.IO
// ============================================
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

initSocket(io);
app.set('io', io);

// ============================================
// Middleware
// ============================================
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.disable('x-powered-by');

// ============================================
// Routes
// ============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/songs', require('./routes/songs'));
app.use('/api/rounds', require('./routes/rounds'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/refunds', require('./routes/refunds'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '🎵 BeatPay v2 is live!', time: new Date().toISOString() });
});

// ============================================
// Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ============================================
// Start
// ============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🎵 BeatPay v2 running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});