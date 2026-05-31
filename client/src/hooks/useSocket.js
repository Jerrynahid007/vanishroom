import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = (import.meta.env.VITE_SERVER_URL || 'http://localhost:4000').replace(/\/$/, '');

let sharedSocket = null;
let refCount = 0;
let heartbeatInterval = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!sharedSocket) {
      console.log('[useSocket] Creating new socket connection to', SERVER_URL);
      sharedSocket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      });

      sharedSocket.on('connect', () => {
        console.log('[useSocket] Socket connected, starting heartbeat');
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          if (sharedSocket && sharedSocket.connected) {
            sharedSocket.emit('ping');
          }
        }, 25000);
      });

      sharedSocket.on('disconnect', (reason) => {
        console.log('[useSocket] Socket disconnected:', reason);
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      });

      sharedSocket.on('connect_error', (error) => {
        console.error('[useSocket] Connection error:', error.message);
      });
    }

    refCount++;
    socketRef.current = sharedSocket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    sharedSocket.on('connect', onConnect);
    sharedSocket.on('disconnect', onDisconnect);

    if (sharedSocket.connected) setConnected(true);

    return () => {
      sharedSocket.off('connect', onConnect);
      sharedSocket.off('disconnect', onDisconnect);
      refCount--;
      if (refCount === 0) {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        sharedSocket.disconnect();
        sharedSocket = null;
      }
    };
  }, []);

  return { socket: socketRef.current, connected };
}