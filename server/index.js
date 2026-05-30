'use strict';
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { createClient } = require('./roomManager');
const socketHandler = require('./socketHandler');
const { createAdapter } = require('@socket.io/redis-adapter');

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

// ── Socket.IO (will attach adapter after Redis connects) ──────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Connect to Redis, set up adapter, then start server ──────────────────────
let redisClient;
let pubClient;
let subClient;

createClient()
  .then(async (client) => {
    redisClient = client;
    console.log('✅ Redis client ready');

    // Set up pub/sub for Socket.IO adapter
    pubClient = redisClient;
    subClient = redisClient.duplicate();
    await subClient.connect();
    console.log('✅ Redis pub/sub client ready');

    // Attach the Redis adapter to Socket.IO
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter attached');

    // Now register your socket event handlers
    socketHandler(io);

    // Start the HTTP server
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🔥 VanishRoom server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to Redis:', err.message);
    console.error('   Make sure REDIS_URL is set correctly');
    process.exit(1);
  });