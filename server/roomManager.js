'use strict';
const Redis = require('ioredis');

const ROOM_TTL = 2400; // 40 minutes in seconds
const ROOM_PREFIX = 'vanishroom:';

let redis = null;

/**
 * Initialise and return the Redis client.
 * Called once at server startup.
 */
async function createClient() {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err) => console.error('Redis error:', err.message));

  // Wait for connection
  await redis.ping();
  return redis;
}

/**
 * Generate a 6-character room code using unambiguous chars.
 * Excludes: 0, O, I, 1, l to avoid visual confusion.
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new room in Redis.
 * @returns {{ code: string, createdAt: number }}
 */
async function createRoom() {
  let code;
  let attempts = 0;

  // Ensure unique code
  do {
    code = generateRoomCode();
    attempts++;
    if (attempts > 20) throw new Error('Could not generate unique room code');
  } while (await redis.exists(ROOM_PREFIX + code));

  const createdAt = Date.now();

  await redis.setex(
    ROOM_PREFIX + code,
    ROOM_TTL,
    JSON.stringify({ createdAt, code })
  );

  return { code, createdAt };
}

/**
 * Check if a room exists and return its data.
 * @returns {{ code: string, createdAt: number } | null}
 */
async function joinRoom(code) {
  const raw = await redis.get(ROOM_PREFIX + code.toUpperCase());
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * Delete a room from Redis.
 */
async function deleteRoom(code) {
  await redis.del(ROOM_PREFIX + code.toUpperCase());
}

/**
 * Get the remaining TTL in seconds for a room.
 * @returns {number} seconds remaining, or -2 if not found
 */
async function getRoomTimeLeft(code) {
  return redis.ttl(ROOM_PREFIX + code.toUpperCase());
}

/**
 * Increment IP-based rate limit counter.
 * Returns current count for the day.
 */
async function incrementRateLimit(ip) {
  const key = `ratelimit:${ip}:${new Date().toDateString()}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // Expire at end of day (86400 seconds)
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
