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

// CORS Configuration
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
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// We'll hold onto the clients so we can use them for the adapter
let pubClient, subClient;

createClient() // This should already return your main Redis client from roomManager.js
  .then(async (redisClient) => {
    console.log('✅ Main Redis client ready');
    // Use the main client as the "publisher"
    pubClient = redisClient;
    // Create a duplicate client for the "subscriber" role.
    // The duplicate shares the same connection pool but is managed separately.
    subClient = redisClient.duplicate();

    // Add a small delay to ensure the connection is fully stable before attaching the adapter.
    await new Promise(resolve => setTimeout(resolve, 100));

    // Attach the Redis adapter to Socket.IO
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter attached');

    // Register your socket event handlers
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