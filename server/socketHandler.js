'use strict';
const {
  createRoom,
  joinRoom,
  deleteRoom,
  getRoomTimeLeft,
  incrementRateLimit,
} = require('./roomManager');

const ROOM_DURATION_MS = 40 * 60 * 1000; // 40 minutes
const WARNING_5MIN_MS  = 35 * 60 * 1000; // warn at 35 min mark
const WARNING_1MIN_MS  = 39 * 60 * 1000; // warn at 39 min mark

// Track active room timers so we can clear them on early cleanup
const roomTimers = new Map(); // code → [timer1, timer2, timer3]

/**
 * Schedule the three server-side timed events for a room.
 */
function scheduleRoomTimers(io, code, createdAt) {
  const now = Date.now();
  const elapsed = now - createdAt;

  const delay5min  = Math.max(WARNING_5MIN_MS - elapsed, 0);
  const delay1min  = Math.max(WARNING_1MIN_MS - elapsed, 0);
  const delayExpire = Math.max(ROOM_DURATION_MS - elapsed, 0);

  const t1 = setTimeout(async () => {
    io.to(code).emit('room_warning', { minutesLeft: 5 });
    console.log(`⚠️  [${code}] 5-minute warning sent`);
  }, delay5min);

  const t2 = setTimeout(async () => {
    io.to(code).emit('room_warning', { minutesLeft: 1 });
    console.log(`⚠️  [${code}] 1-minute warning sent`);
  }, delay1min);

  const t3 = setTimeout(async () => {
    console.log(`💀 [${code}] Room expiring`);
    io.to(code).emit('room_expired');

    // Force all sockets out of the room
    const sockets = await io.in(code).fetchSockets();
    for (const s of sockets) {
      s.leave(code);
    }

    // Clean Redis
    await deleteRoom(code);
    roomTimers.delete(code);
  }, delayExpire);

  // Keep references for cleanup
  roomTimers.set(code, [t1, t2, t3]);
}

/**
 * Cancel and remove timers for a room (e.g. if room is manually deleted).
 */
function clearRoomTimers(code) {
  const timers = roomTimers.get(code);
  if (timers) {
    timers.forEach(clearTimeout);
    roomTimers.delete(code);
  }
}

/**
 * Main Socket.IO handler — registers all events on each socket connection.
 */
function socketHandler(io) {
  io.on('connection', (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for']
      || socket.handshake.address
      || 'unknown';

    console.log(`🔌 Socket connected: ${socket.id} from ${clientIp}`);

    // Error handler
    socket.on('error', (err) => {
      console.error(`❌ Socket error (${socket.id}):`, err);
    });

    // ── create_room ────────────────────────────────────────────────────────────
    socket.on('create_room', async (data, callback) => {
      try {
        // Rate limiting: 3 rooms per IP per day
        const count = await incrementRateLimit(clientIp);
        if (count > 3) {
          return callback({
            success: false,
            error: 'Rate limit reached. Maximum 3 rooms per day.',
          });
        }

        const { code, createdAt } = await createRoom();
        await socket.join(code);

        // Track which room this socket created
        socket.data.roomCode = code;

        // Schedule server-side timers
        scheduleRoomTimers(io, code, createdAt);

        console.log(`🏠 Room created: ${code}`);
        console.log('[create_room] socket.rooms', [...socket.rooms]);

        callback({ success: true, code, createdAt });
      } catch (err) {
        console.error('create_room error:', err.message);
        callback({ success: false, error: 'Failed to create room.' });
      }
    });

    // ── join_room ──────────────────────────────────────────────────────────────
    socket.on('join_room', async ({ code }, callback) => {
      try {
        const upperCode = String(code || '').toUpperCase().trim();
        console.log(`[join_room] requested: ${code} normalized: ${upperCode} socket:${socket.id}`);

        const room = await joinRoom(upperCode);
        if (!room) {
          console.warn(`[join_room] room not found: ${upperCode}`);
          return callback({
            success: false,
            error: 'Room not found or expired.',
          });
        }

        await socket.join(upperCode);
        socket.data.roomCode = upperCode;

        console.log('[join_room] socket.rooms after join', [...socket.rooms]);

        // Notify others in room (excluding the new socket)
        socket.to(upperCode).emit('user_joined', {
          message: 'Someone joined the room',
        });

        // ✅ Get accurate user count using fetchSockets
        const sockets = await io.in(upperCode).fetchSockets();
        const userCount = sockets.length;

        // ✅ Broadcast updated count to everyone in the room (including the new user)
        io.to(upperCode).emit('user_count', { count: userCount });

        // Ensure timers are running for this room (handles server restart scenario)
        if (!roomTimers.has(upperCode)) {
          scheduleRoomTimers(io, upperCode, room.createdAt);
        }

        const timeLeft = await getRoomTimeLeft(upperCode);

        console.log(`🚪 Socket ${socket.id} joined room: ${upperCode} members=${userCount}`);

        callback({
          success: true,
          code: upperCode,
          createdAt: room.createdAt,
          timeLeft: timeLeft > 0 ? timeLeft : 0,
        });
      } catch (err) {
        console.error('join_room error:', err.message);
        callback({ success: false, error: 'Failed to join room.' });
      }
    });

    // ── send_message ───────────────────────────────────────────────────────────
    socket.on('send_message', async ({ room, message, type = 'text' }) => {
      if (!room || !message) {
        console.warn('[send_message] missing room or message', { room, message, socketId: socket.id });
        return;
      }

      const upperRoom = String(room || '').toUpperCase().trim();
      const isInRoom = socket.rooms.has(upperRoom);
      console.log('[send_message]', { socketId: socket.id, roomRequested: room, upperRoom, isInRoom, type });

      if (!isInRoom) {
        const socketsInRoom = await io.in(upperRoom).fetchSockets();
        console.warn(`[send_message] sender not in room ${upperRoom}`, {
          socketId: socket.id,
          rooms: [...socket.rooms],
          roomSockets: socketsInRoom.map((s) => s.id),
        });
        return;
      }

      socket.to(upperRoom).emit('receive_message', {
        message,
        type,
        timestamp: Date.now(),
        senderId: socket.id,
      });
    });

    // ── leave_room ─────────────────────────────────────────────────────────────
    socket.on('leave_room', async ({ code }) => {
      const upperCode = String(code || '').toUpperCase().trim();
      await socket.leave(upperCode);

      const sockets = await io.in(upperCode).fetchSockets();
      const userCount = sockets.length;

      io.to(upperCode).emit('user_count', { count: userCount });
      socket.to(upperCode).emit('user_left', { message: 'Someone left the room' });
    });

    // ── disconnect ─────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const roomCode = socket.data.roomCode;
      if (roomCode) {
        // ✅ Use fetchSockets for accurate count
        const sockets = await io.in(roomCode).fetchSockets();
        const userCount = sockets.length;
        io.to(roomCode).emit('user_count', { count: userCount });

        if (userCount === 0) {
          console.log(`🏚️  Room ${roomCode} is now empty`);
          // Don't delete it — let Redis TTL clean up naturally
        }
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = socketHandler;