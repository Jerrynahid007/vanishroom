import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { useSocket } from '../hooks/useSocket'
import EmberBackground from '../components/EmberBackground'
import Modal from '../components/Modal'
import {
  FlameIcon, CopyIcon, CheckIcon, ClockIcon, HourglassIcon,
  SendIcon, SmileIcon, UsersIcon, CloseIcon,
} from '../components/Icons'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTimestamp(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isSelf }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-1 animate-float-up" aria-live="polite">
        <span className="text-ash-500 text-xs italic px-3 py-1 rounded-full" style={{ background: 'rgba(26,26,26,0.6)' }}>
          {msg.message}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-end gap-2 mb-3 animate-float-up ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 mb-1"
        style={{ background: isSelf ? '#FF4500' : '#555555' }}
        aria-hidden="true"
      />
      <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {msg.type === 'gif' ? (
          <div className="relative">
            <img
              src={msg.message}
              alt="GIF"
              className="rounded-xl object-cover"
              style={{ maxWidth: '240px', maxHeight: '180px', borderRadius: '16px' }}
            />
            <span className="absolute bottom-2 right-2 text-white text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.6)', fontSize: '0.65rem' }}>
              GIF
            </span>
          </div>
        ) : msg.type === 'emoji' ? (
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{msg.message}</span>
        ) : (
          <div
            className="px-3 py-2.5 text-white"
            style={{
              background: isSelf ? '#CC3700' : '#2A2A2A',
              borderRadius: '16px',
              borderBottomRightRadius: isSelf ? '4px' : '16px',
              borderBottomLeftRadius: isSelf ? '16px' : '4px',
              fontSize: '0.9rem',
              lineHeight: '1.45',
              wordBreak: 'break-word',
            }}
          >
            {msg.message}
          </div>
        )}
        <span className="text-ash-600 mt-1" style={{ fontSize: '0.68rem' }}>
          {formatTimestamp(msg.timestamp)}
        </span>
      </div>
    </div>
  )
}

// ── 5-Min Warning Banner ──────────────────────────────────────────────────────
function WarningBanner({ visible, onDismiss }) {
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (!visible) return
    setOpacity(1)
    const timer = setTimeout(() => {
      setOpacity(0)
      setTimeout(onDismiss, 500)
    }, 10000)
    return () => clearTimeout(timer)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <div
      className="fixed left-0 right-0 z-30 flex items-center justify-between px-4 animate-slide-down"
      style={{
        top: '56px',
        height: '44px',
        background: 'rgba(204,55,0,0.95)',
        opacity,
        transition: 'opacity 0.5s ease',
      }}
      role="alert"
    >
      <div className="flex items-center gap-2 text-white font-medium" style={{ fontSize: '0.85rem' }}>
        <FlameIcon size={16} />
        Room expires in 5 minutes. Create a new room to continue.
      </div>
      <button onClick={onDismiss} className="text-white hover:scale-125 transition-transform p-1" aria-label="Dismiss warning">
        <CloseIcon size={14} />
      </button>
    </div>
  )
}

// ── 1-Min Warning Modal ───────────────────────────────────────────────────────
function OneMinuteModal({ visible, onCreateNew, onStay }) {
  return (
    <Modal isOpen={visible} preventClose>
      <div className="p-6 w-[300px]" style={{ background: '#1A1A1A', border: '1px solid #FF4500', borderRadius: '20px' }}>
        <div className="flex justify-center mb-4">
          <HourglassIcon size={48} className="text-red-500 animate-spin-slow" />
        </div>
        <h2 className="text-xl font-bold text-red-400 text-center mb-2">1 Minute Left</h2>
        <p className="text-ash-300 text-center mb-6" style={{ fontSize: '0.85rem' }}>
          This room will self-destruct. Save anything important now.
        </p>
        <button onClick={onCreateNew} className="btn-fire w-full mb-2" style={{ height: '44px', borderRadius: '12px' }}>
          Create New Room
        </button>
        <button onClick={onStay} className="btn-ghost w-full" style={{ height: '44px', borderRadius: '12px' }}>
          Stay
        </button>
      </div>
    </Modal>
  )
}

// ── Expired Overlay ───────────────────────────────────────────────────────────
function ExpiredOverlay({ visible, onCreateNew }) {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          navigate('/')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [visible, navigate])

  if (!visible) return null

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 animate-fade-in" style={{ background: 'rgba(0,0,0,0.92)' }}>
      <span className="text-6xl mb-6 animate-ember-in" role="img" aria-label="Fire">🔥</span>
      <h2 className="text-ash-300 font-semibold mb-3 text-center" style={{ fontSize: '1.5rem' }}>
        This room has burned out.
      </h2>
      <p className="text-ash-500 mb-8 text-center" style={{ fontSize: '0.95rem' }}>
        Redirecting in {countdown}…
      </p>
      <button onClick={onCreateNew} className="btn-fire" style={{ borderRadius: '12px', padding: '12px 32px' }}>
        Create New Room
      </button>
    </div>
  )
}

// ── GIF Picker Overlay ────────────────────────────────────────────────────────
function GifPicker({ visible, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY || ''

  const search = useCallback(async (q) => {
    if (!GIPHY_KEY) return
    setLoading(true)
    setError('')
    try {
      const endpoint = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=18&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=18&rating=g`
      console.log('[GIF Search] Fetching:', endpoint)
      const res = await fetch(endpoint)
      if (!res.ok) {
        throw new Error(`GIPHY API error: ${res.status} ${res.statusText}`)
      }
      const json = await res.json()
      console.log('[GIF Search] Response:', { dataLength: json.data?.length, meta: json.meta })
      if (json.meta?.status !== 200) {
        throw new Error(`GIPHY error: ${json.meta?.msg || 'Unknown error'}`)
      }
      setGifs(json.data || [])
    } catch (err) {
      console.error('[GIF Search] Error:', err.message)
      setError(err.message)
      setGifs([])
    } finally {
      setLoading(false)
    }
  }, [GIPHY_KEY])

  useEffect(() => {
    if (visible) {
      search('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible, search])

  useEffect(() => {
    const t = setTimeout(() => search(query), 400)
    return () => clearTimeout(t)
  }, [query, search])

  if (!visible) return null

  const noKey = !GIPHY_KEY

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in" style={{ background: 'rgba(11,11,11,0.97)' }}>
      <div className="flex items-center gap-3 p-4 border-b border-ash-700">
        <button onClick={onClose} className="text-ash-400 hover:text-ash-100 transition-colors">
          <CloseIcon size={20} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          className="input-dark flex-1"
          style={{ height: '40px' }}
          disabled={noKey}
        />
        <span className="text-ash-500 text-xs">Powered by GIPHY</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {noKey && (
          <div className="flex flex-col items-center justify-center h-full text-ash-500 text-sm text-center gap-2">
            <span className="text-3xl">🔑</span>
            <p>Add <code className="text-fire-500">VITE_GIPHY_KEY</code> to <code>.env</code> to enable GIFs.</p>
          </div>
        )}
        {!noKey && error && (
          <div className="flex flex-col items-center justify-center h-full text-red-400 text-sm text-center gap-2">
            <span className="text-3xl">⚠️</span>
            <p>{error}</p>
            <button
              onClick={() => { setError(''); search(query) }}
              className="mt-2 px-3 py-1 rounded bg-fire-500 text-white text-xs hover:bg-fire-600 transition"
            >
              Retry
            </button>
          </div>
        )}
        {!noKey && loading && (
          <div className="flex justify-center items-center h-40">
            <span className="w-8 h-8 border-2 border-fire-500/30 border-t-fire-500 rounded-full animate-spin" />
          </div>
        )}
        {!noKey && !loading && !error && (
          <div className="grid grid-cols-3 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => { onSelect(gif.images.fixed_height.url); onClose() }}
                className="rounded-xl overflow-hidden hover:ring-2 hover:ring-fire-500 transition-all aspect-video"
              >
                <img src={gif.images.fixed_height_small.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
            {gifs.length === 0 && (
              <p className="col-span-3 text-center text-ash-500 text-sm py-12">No GIFs found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chat Header ───────────────────────────────────────────────────────────────
function ChatHeader({ code, timeLeft, userCount, onLeave }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUnder5 = timeLeft < 300
  const isUnder1 = timeLeft < 60

  const timerClass = isUnder1
    ? 'text-red-400 animate-heartbeat text-glow-red tabular-nums'
    : isUnder5
    ? 'text-fire-500 animate-pulse-soft tabular-nums'
    : 'text-fire-500 tabular-nums'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4"
      style={{
        height: '56px',
        background: 'rgba(26,26,26,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #2A2A2A',
      }}
    >
      <button onClick={handleCopy} className="flex items-center gap-1.5 text-ash-300 hover:text-fire-500 transition-colors group" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
        <span className="tracking-widest font-semibold">{code}</span>
        <span className="text-ash-500 group-hover:text-fire-500">
          {copied ? <CheckIcon size={14} className="text-green-400" /> : <CopyIcon size={14} />}
        </span>
      </button>
      <div className="flex items-center gap-1">
        <ClockIcon size={14} className={isUnder1 ? 'text-red-400' : 'text-fire-500'} />
        <span className={`font-bold ${timerClass}`} style={{ fontSize: '1.1rem' }}>
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-ash-300" style={{ fontSize: '0.8rem' }}>
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_4px_rgba(52,199,89,0.8)]" />
          <UsersIcon size={14} className="text-ash-500" />
          <span>{userCount}</span>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="btn-ghost text-ash-300 hover:text-fire-500 transition-colors"
          style={{ height: '32px', borderRadius: '999px', padding: '0 12px', fontSize: '0.75rem' }}
        >
          Leave
        </button>
      </div>
    </header>
  )
}

// ── Input Bar ─────────────────────────────────────────────────────────────────
function InputBar({ onSend, disabled }) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const inputRef = useRef(null)

  const hasText = text.trim().length > 0

  const handleSend = () => {
    if (!hasText || disabled) return
    onSend(text.trim(), 'text')
    setText('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEmojiSelect = (emoji) => {
    onSend(emoji.native, 'emoji')
    setShowEmoji(false)
  }

  const handleGifSelect = (url) => {
    onSend(url, 'gif')
  }

  return (
    <>
      {showEmoji && (
        <div className="fixed bottom-[60px] left-0 right-0 z-30 animate-slide-up" style={{ maxWidth: '420px', margin: '0 auto', padding: '0 12px 8px' }}>
          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="dark" previewPosition="none" skinTonePosition="none" />
        </div>
      )}
      <GifPicker visible={showGif} onClose={() => setShowGif(false)} onSelect={handleGifSelect} />
      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-3 safe-bottom" style={{ height: '60px', background: 'rgba(26,26,26,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2A2A2A' }}>
        <button onClick={() => { setShowEmoji((v) => !v); setShowGif(false) }} className="text-ash-400 hover:text-fire-500 transition-colors rounded-lg p-1.5 hover:bg-white/5" style={{ minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SmileIcon size={22} />
        </button>
        <button onClick={() => { setShowGif((v) => !v); setShowEmoji(false) }} className="text-ash-400 hover:text-fire-500 border border-ash-600 hover:border-fire-500 transition-all rounded-full px-3 font-bold" style={{ fontSize: '0.75rem', height: '32px', letterSpacing: '0.05em' }}>
          GIF
        </button>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowEmoji(false)}
          placeholder="Type a message…"
          disabled={disabled}
          className="flex-1 text-white placeholder-ash-500 bg-ash-700 border-none outline-none px-4 disabled:opacity-50"
          style={{ height: '44px', borderRadius: '22px', fontSize: '0.95rem' }}
          autoComplete="off"
        />
        <button
          onClick={handleSend}
          disabled={!hasText || disabled}
          className="flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:cursor-not-allowed"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: hasText && !disabled ? 'linear-gradient(135deg, #FF4500, #FF8C00)' : '#3A3A3A',
            boxShadow: hasText && !disabled ? '0 0 10px rgba(255,69,0,0.3)' : 'none',
          }}
        >
          <SendIcon size={16} className="text-white" />
        </button>
      </div>
    </>
  )
}

// ── Room Page ─────────────────────────────────────────────────────────────────
export default function Room() {
  const { code } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { socket } = useSocket()

  // Normalize room code to uppercase once
  const roomCode = useMemo(() => String(code || '').toUpperCase().trim(), [code])

  const [messages, setMessages] = useState([])
  const [timeLeft, setTimeLeft] = useState(2400)
  const [userCount, setUserCount] = useState(1)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')
  const [hasJoinedOnce, setHasJoinedOnce] = useState(false)

  const [show5MinBanner, setShow5MinBanner] = useState(false)
  const [show1MinModal, setShow1MinModal] = useState(false)
  const [show1MinDismissed, setShow1MinDismissed] = useState(false)
  const [expired, setExpired] = useState(false)
  const [intensified, setIntensified] = useState(false)

  const messagesEndRef = useRef(null)
  const timerRef = useRef(null)
  const socketIdRef = useRef(null)

  // Helper functions defined before they are used
  const addMessage = (msg) => {
    setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }])
  }

  const addSystemMessage = (text) => {
    addMessage({ message: text, type: 'system', timestamp: Date.now(), isSelf: false })
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Countdown timer
  useEffect(() => {
    if (!joined || expired) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [joined, expired])

  useEffect(() => {
    if (!socket || !roomCode) return

    const state = location.state || {}
    const stateTimeLeft = state.timeLeft

    const joinRoom = () => {
      if (!socket || !roomCode) return

      console.debug('[Room] emit join_room', { roomCode, socketId: socket.id })
      socket.emit('join_room', { code: roomCode }, (res) => {
        if (res.success) {
          setTimeLeft(Math.max(0, res.timeLeft || 2400))
          setJoined(true)
          if (!hasJoinedOnce) {
            addSystemMessage(stateTimeLeft != null ? 'Room created. You are the first one here.' : 'You joined the room.')
            setHasJoinedOnce(true)
          } else {
            addSystemMessage('Rejoined the room.')
          }
        } else {
          setError(res.error || 'Failed to join room.')
        }
      })
    }

    const handleConnect = () => {
      console.debug('[Room] socket connected/reconnected, joining room', roomCode)
      joinRoom()
    }

    const handleDisconnect = () => {
      console.debug('[Room] socket disconnected', socket.id)
      setJoined(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    if (socket.connected) {
      joinRoom()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [socket, roomCode, location.state])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const onReceive = ({ message, type, timestamp }) => {
      addMessage({ message, type, timestamp, isSelf: false })
    }

    const onUserJoined = ({ message }) => addSystemMessage(message)
    const onUserLeft = ({ message }) => addSystemMessage(message)
    const onUserCount = ({ count }) => setUserCount(count)

    const onWarning = ({ minutesLeft }) => {
      if (minutesLeft === 5) setShow5MinBanner(true)
      if (minutesLeft === 1 && !show1MinDismissed) setShow1MinModal(true)
    }

    const onExpired = () => {
      setExpired(true)
      setIntensified(true)
      clearInterval(timerRef.current)
    }

    socket.on('receive_message', onReceive)
    socket.on('user_joined', onUserJoined)
    socket.on('user_left', onUserLeft)
    socket.on('user_count', onUserCount)
    socket.on('room_warning', onWarning)
    socket.on('room_expired', onExpired)

    return () => {
      socket.off('receive_message', onReceive)
      socket.off('user_joined', onUserJoined)
      socket.off('user_left', onUserLeft)
      socket.off('user_count', onUserCount)
      socket.off('room_warning', onWarning)
      socket.off('room_expired', onExpired)
    }
  }, [socket, show1MinDismissed])

  // Client-side expiry guard
  useEffect(() => {
    if (timeLeft <= 0 && joined && !expired) {
      setExpired(true)
      setIntensified(true)
    }
  }, [timeLeft, joined, expired])

  const handleSend = (message, type) => {
    if (!socket || !joined || expired) return
    const timestamp = Date.now()
    addMessage({ message, type, timestamp, isSelf: true })
    console.debug('[Room] send_message', { room: roomCode, message, type, socketId: socket.id })
    socket.emit('send_message', { room: roomCode, message, type })
  }

  const handleLeave = () => {
    if (socket && roomCode) {
      socket.emit('leave_room', { code: roomCode })
    }
    navigate('/')
  }

  const handleCreateNew = () => navigate('/')

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🚫</span>
        <h1 className="text-ash-200 text-xl font-semibold">Room not found</h1>
        <p className="text-ash-500 text-sm text-center">{error}</p>
        <button onClick={handleCreateNew} className="btn-fire mt-2" style={{ borderRadius: '12px' }}>
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'transparent' }}>
      {intensified && <EmberBackground intensified />}
      <ChatHeader code={roomCode} timeLeft={timeLeft} userCount={userCount} onLeave={handleLeave} />
      <WarningBanner visible={show5MinBanner} onDismiss={() => setShow5MinBanner(false)} />
      <OneMinuteModal
        visible={show1MinModal && !show1MinDismissed}
        onCreateNew={handleCreateNew}
        onStay={() => { setShow1MinModal(false); setShow1MinDismissed(true) }}
      />
      <ExpiredOverlay visible={expired} onCreateNew={handleCreateNew} />
      <main
        className="flex-1 overflow-y-auto px-4 pt-4"
        style={{
          marginTop: '56px',
          marginBottom: '60px',
          paddingTop: show5MinBanner ? '60px' : '16px',
          transition: 'padding-top 0.3s ease',
        }}
      >
        {messages.length === 0 && joined && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-ash-600 text-sm animate-fade-in">
            <FlameIcon size={32} className="text-fire-700 mb-3" />
            <p>No messages yet. Say hello! 👋</p>
            <p className="text-xs mt-1 text-ash-700">Messages vanish when the room expires.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isSelf={msg.isSelf} />
        ))}
        <div ref={messagesEndRef} />
      </main>
      <InputBar onSend={handleSend} disabled={expired || !joined} />
    </div>
  )
}