'use strict';
const {
  createRoom,
  joinRoom,
  deleteRoom,
  getRoomTimeLeft,
  incrementRateLimit,
  setRoomLock,
  setRoomOwner,
  getRoomOwner,
} = require('./roomManager');

const ROOM_DURATION_MS = 40 * 60 * 1000;
const WARNING_5MIN_MS  = 35 * 60 * 1000;
const WARNING_1MIN_MS  = 39 * 60 * 1000;

const roomTimers = new Map();

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

    const sockets = await io.in(code).fetchSockets();
    for (const s of sockets) s.leave(code);
    await deleteRoom(code);
    roomTimers.delete(code);
  }, delayExpire);

  roomTimers.set(code, [t1, t2, t3]);
}

function socketHandler(io) {
  io.on('connection', (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for']
      || socket.handshake.address
      || 'unknown';

    console.log(`🔌 Socket connected: ${socket.id} from ${clientIp}`);

    socket.on('error', (err) => console.error(`❌ Socket error (${socket.id}):`, err));
    socket.on('ping', () => {}); // heartbeat

    // ── create_room ────────────────────────────────────────────────────────
    socket.on('create_room', async (data, callback) => {
      try {
        const count = await incrementRateLimit(clientIp);
        if (count > 3) {
          return callback({ success: false, error: 'Rate limit reached. Maximum 3 rooms per day.' });
        }
        const { code, createdAt } = await createRoom();
        await socket.join(code);
        await setRoomOwner(code, socket.id);
        socket.data.roomCode = code;
        socket.data.isOwner = true;
        scheduleRoomTimers(io, code, createdAt);
        console.log(`🏠 Room created: ${code}`);
        callback({ success: true, code, createdAt });
      } catch (err) {
        console.error('create_room error:', err.message);
        callback({ success: false, error: 'Failed to create room.' });
      }
    });

    // ── join_room ──────────────────────────────────────────────────────────
    socket.on('join_room', async ({ code }, callback) => {
      try {
        const upperCode = String(code || '').toUpperCase().trim();
        const room = await joinRoom(upperCode);
        if (!room) {
          return callback({ success: false, error: 'Room not found or expired.' });
        }
        if (room.locked === true) {
          return callback({ success: false, error: 'Room is locked by the owner.' });
        }
        await socket.join(upperCode);
        socket.data.roomCode = upperCode;

        // notify others
        socket.to(upperCode).emit('user_joined', { message: 'Someone joined the room', socketId: socket.id });

        const socketsInRoom = await io.in(upperCode).fetchSockets();
        const userCount = socketsInRoom.length;
        io.to(upperCode).emit('user_count', { count: userCount });
        const userIds = socketsInRoom.map(s => s.id);
        socket.emit('user_list', { users: userIds });

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
          isOwner: room.ownerSocketId === socket.id,
          locked: room.locked === true,
          users: userIds,
        });
      } catch (err) {
        console.error('join_room error:', err.message);
        callback({ success: false, error: 'Failed to join room.' });
      }
    });

    // ── lock_room ──────────────────────────────────────────────────────────
    socket.on('lock_room', async ({ code, locked }, callback) => {
      try {
        const upperCode = String(code || '').toUpperCase().trim();
        const ownerId = await getRoomOwner(upperCode);
        if (ownerId !== socket.id) {
          return callback({ success: false, error: 'Only the room owner can lock/unlock the room.' });
        }
        await setRoomLock(upperCode, locked);
        io.to(upperCode).emit('room_lock_changed', { locked });
        callback({ success: true, locked });
      } catch (err) {
        console.error('lock_room error:', err.message);
        callback({ success: false, error: 'Failed to lock room.' });
      }
    });

    // ── kick_user ──────────────────────────────────────────────────────────
    socket.on('kick_user', async ({ code, targetSocketId }, callback) => {
      try {
        const upperCode = String(code || '').toUpperCase().trim();
        const ownerId = await getRoomOwner(upperCode);
        if (ownerId !== socket.id) {
          return callback({ success: false, error: 'Only the room owner can kick users.' });
        }
        const sockets = await io.in(upperCode).fetchSockets();
        const targetSocket = sockets.find(s => s.id === targetSocketId);
        if (!targetSocket) {
          return callback({ success: false, error: 'User not found in room.' });
        }
        await targetSocket.leave(upperCode);
        targetSocket.emit('kicked_from_room', { room: upperCode, reason: 'You were kicked by the room owner.' });
        const remaining = await io.in(upperCode).fetchSockets();
        io.to(upperCode).emit('user_count', { count: remaining.length });
        io.to(upperCode).emit('user_left', { message: 'Someone left the room', socketId: targetSocketId });
        callback({ success: true });
      } catch (err) {
        console.error('kick_user error:', err.message);
        callback({ success: false, error: 'Failed to kick user.' });
      }
    });

    // ── send_message (with reply support) ───────────────────────────────────
    socket.on('send_message', async ({ room, message, type = 'text', replyTo }, callback) => {
      if (!room || !message) return;
      const upperRoom = String(room || '').toUpperCase().trim();
      if (!socket.rooms.has(upperRoom)) return;
      const payload = { message, type, timestamp: Date.now(), senderId: socket.id };
      if (replyTo) payload.replyTo = replyTo;
      socket.to(upperRoom).emit('receive_message', payload);
      if (callback) callback({ success: true });
    });

    // ── leave_room ──────────────────────────────────────────────────────────
    socket.on('leave_room', async ({ code }) => {
      const upperCode = String(code || '').toUpperCase().trim();
      await socket.leave(upperCode);
      const sockets = await io.in(upperCode).fetchSockets();
      io.to(upperCode).emit('user_count', { count: sockets.length });
      io.to(upperCode).emit('user_left', { message: 'Someone left the room', socketId: socket.id });
    });

    // ── disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const roomCode = socket.data.roomCode;
      if (roomCode) {
        const sockets = await io.in(roomCode).fetchSockets();
        io.to(roomCode).emit('user_count', { count: sockets.length });
        io.to(roomCode).emit('user_left', { message: 'Someone left the room', socketId: socket.id });
        if (sockets.length === 0) console.log(`🏚️  Room ${roomCode} is now empty`);
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = socketHandler;