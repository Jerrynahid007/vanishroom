'use strict';
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { createClient } = require('./roomManager');
const socketHandler = require('./socketHandler');

const app = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialise Redis then start
createClient().then(() => {
  socketHandler(io);

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`🔥 VanishRoom server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('❌ Failed to connect to Redis:', err.message);
  console.error('   Make sure Redis is running: redis-server');
  process.exit(1);
});
