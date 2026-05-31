import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SERVER_URL = (import.meta.env.VITE_SERVER_URL || 'http://localhost:4000').replace(/\/$/, '')

let sharedSocket = null
let refCount = 0

console.log('[useSocket] SERVER_URL:', SERVER_URL)

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
      console.log('[useSocket] Creating new socket connection')
      sharedSocket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      })

      sharedSocket.on('connect', () => {
        console.log('[useSocket] Socket connected:', sharedSocket.id)
        setConnected(true)
      })
      
      sharedSocket.on('disconnect', (reason) => {
        console.log('[useSocket] Socket disconnected:', reason)
        setConnected(false)
      })

      sharedSocket.on('connect_error', (error) => {
        console.error('[useSocket] Connection error:', error.message)
      })
    }

    refCount += 1
    console.log('[useSocket] refCount++:', refCount)
    socketRef.current = sharedSocket

    const onConnect = () => {
      console.log('[useSocket] onConnect callback')
      setConnected(true)
    }
    const onDisconnect = () => {
      console.log('[useSocket] onDisconnect callback')
      setConnected(false)
    }

    // Check if already connected
    if (sharedSocket.connected) {
      console.log('[useSocket] Socket already connected')
      setConnected(true)
    }

    return () => {
      console.log('[useSocket] Cleanup: refCount--')
      refCount -= 1
      console.log('[useSocket] New refCount:', refCount)
      if (refCount === 0) {
        console.log('[useSocket] Disconnecting socket')
        sharedSocket.disconnect()
        sharedSocket = null
      }
    }
  }, [])

  return { socket: socketRef.current, connected }
}
