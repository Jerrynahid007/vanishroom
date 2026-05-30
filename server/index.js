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

// Socket.IO
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis setup – only once
let pubClient, subClient;

createClient()
  .then(async (redisClient) => {
    console.log('✅ Redis client ready');
    pubClient = redisClient;
    subClient = redisClient.duplicate();
    await subClient.connect(); // crucial for ioredis
    console.log('✅ Redis pub/sub client ready');

    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter attached');

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