import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SERVER_URL = (import.meta.env.VITE_SERVER_URL || 'http://localhost:4000').replace(/\/$/, '')

let sharedSocket = null
let refCount = 0

/**
 * Returns a shared Socket.IO connection.
 * The connection is created once and reused across components.
 * Disconnects when the last consumer unmounts.
 */
export function useSocket() {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!sharedSocket) {
      sharedSocket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      })
    }

    refCount += 1
    socketRef.current = sharedSocket

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    sharedSocket.on('connect', onConnect)
    sharedSocket.on('disconnect', onDisconnect)

    if (sharedSocket.connected) setConnected(true)

    return () => {
      sharedSocket.off('connect', onConnect)
      sharedSocket.off('disconnect', onDisconnect)

      refCount -= 1
      if (refCount === 0) {
        sharedSocket.disconnect()
        sharedSocket = null
      }
    }
  }, [])

  return { socket: socketRef.current, connected }
}
