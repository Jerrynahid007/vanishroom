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

// CORS
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
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Connect Redis only for room data (no Socket.IO adapter)
createClient()
  .then(() => {
    console.log('✅ Redis connected (room data)');
    socketHandler(io);
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🔥 VanishRoom server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Redis connection failed:', err.message);
    process.exit(1);
  });