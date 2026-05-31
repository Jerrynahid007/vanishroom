'use strict';
const Redis = require('ioredis');

const ROOM_TTL = 2400; // 40 minutes in seconds
const ROOM_PREFIX = 'vanishroom:';
let redis = null;

async function createClient() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    console.log('✅ Redis client ready');
  }
  try {
    await redis.ping();
    console.log('✅ Redis connection verified');
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    throw error;
  }
  return redis;
}

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
  const roomData = { createdAt, code, locked: false, ownerSocketId: null };
  await redis.setex(ROOM_PREFIX + code, ROOM_TTL, JSON.stringify(roomData));
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
    await redis.expire(key, 86400);
  }
  return count;
}

// New functions for owner/lock
async function setRoomLock(code, locked) {
  const key = ROOM_PREFIX + code;
  const raw = await redis.get(key);
  if (!raw) return false;
  const room = JSON.parse(raw);
  room.locked = locked;
  await redis.setex(key, ROOM_TTL, JSON.stringify(room));
  return true;
}

async function getRoomLock(code) {
  const key = ROOM_PREFIX + code;
  const raw = await redis.get(key);
  if (!raw) return false;
  const room = JSON.parse(raw);
  return room.locked === true;
}

async function setRoomOwner(code, ownerSocketId) {
  const key = ROOM_PREFIX + code;
  const raw = await redis.get(key);
  if (!raw) return false;
  const room = JSON.parse(raw);
  room.ownerSocketId = ownerSocketId;
  await redis.setex(key, ROOM_TTL, JSON.stringify(room));
  return true;
}

async function getRoomOwner(code) {
  const key = ROOM_PREFIX + code;
  const raw = await redis.get(key);
  if (!raw) return null;
  const room = JSON.parse(raw);
  return room.ownerSocketId || null;
}

module.exports = {
  createClient,
  createRoom,
  joinRoom,
  deleteRoom,
  getRoomTimeLeft,
  incrementRateLimit,
  setRoomLock,
  getRoomLock,
  setRoomOwner,
  getRoomOwner,
};