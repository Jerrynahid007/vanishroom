'use strict';
const Redis = require('ioredis');

const ROOM_TTL = 2400; // 40 minutes in seconds
const ROOM_PREFIX = 'vanishroom:';
// We'll store the client in a variable but it's a singleton by design
let redis = null;

/**
 * Initialise and return the Redis client.
 * Called once at server startup.
 */
async function createClient() {
  // Create Redis client from connection URL
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    console.log('✅ Redis client ready');
  }
  // Test connection
  try {
    await redis.ping();
    console.log('✅ Redis connection verified');
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    throw error;
  }
  return redis;
}

// The rest of the functions remain the same, as the API is similar to ioredis
function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function createRoom() {
  let code;
  let attempts = 0;
  do {
    code = generateRoomCode();
    attempts++;
    if (attempts > 20) throw new Error('Could not generate unique room code');
  } while (await redis.exists(ROOM_PREFIX + code));
  const createdAt = Date.now();
  await redis.setex(ROOM_PREFIX + code, ROOM_TTL, JSON.stringify({ createdAt, code }));
  return { code, createdAt };
}

async function joinRoom(code) {
  const raw = await redis.get(ROOM_PREFIX + code.toUpperCase());
  if (!raw) return null;
  return JSON.parse(raw);
}

async function deleteRoom(code) {
  await redis.del(ROOM_PREFIX + code.toUpperCase());
}

async function getRoomTimeLeft(code) {
  return redis.ttl(ROOM_PREFIX + code.toUpperCase());
}

async function incrementRateLimit(ip) {
  const key = `ratelimit:${ip}:${new Date().toDateString()}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // Set 24-hour TTL after creating the key
    await redis.expire(key, 86400);
  }
  return count;
}

module.exports = {
  createClient,
  createRoom,
  joinRoom,
  deleteRoom,
  getRoomTimeLeft,
  incrementRateLimit,
};