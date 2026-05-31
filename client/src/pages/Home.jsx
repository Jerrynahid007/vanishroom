import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import Modal from '../components/Modal'
import {
  FlameIcon, PlusIcon, DoorIcon, CopyIcon, CheckIcon, ClockIcon, LockIcon, CloseIcon,
} from '../components/Icons'

// ── Create Room Modal ──────────────────────────────────────────────────────────
function CreateRoomModal({ isOpen, onClose, roomCode, onEnterRoom }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div
        className="card p-6 w-[320px] sm:w-[380px] relative"
        style={{ borderRadius: '20px' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ash-500 hover:text-ash-200 transition-colors p-1 rounded"
          aria-label="Close modal"
        >
          <CloseIcon size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <FlameIcon size={20} className="text-fire-500" />
          <h2 className="text-lg font-bold text-ash-100">Room Created</h2>
        </div>

        {/* Room code */}
        <div className="flex items-center justify-center gap-3 my-6">
          <span
            className="text-fire-gradient font-black tracking-widest select-all"
            style={{ fontSize: 'clamp(2.2rem, 8vw, 3.2rem)', letterSpacing: '0.12em' }}
          >
            {roomCode}
          </span>
          <button
            onClick={handleCopy}
            className="text-ash-400 hover:text-fire-500 transition-colors p-2 rounded-lg hover:bg-white/5 flex-shrink-0"
            aria-label="Copy room code"
          >
            {copied ? <CheckIcon size={18} className="text-green-400" /> : <CopyIcon size={18} />}
          </button>
        </div>

        {/* Timer note */}
        <div className="flex items-center gap-1.5 justify-center text-ash-500 mb-5" style={{ fontSize: '0.75rem' }}>
          <ClockIcon size={13} />
          <span>Timer starts now. Room expires in 40 minutes.</span>
        </div>

        {/* Enter button */}
        <button
          id="enter-room-btn"
          onClick={onEnterRoom}
          className="btn-fire w-full text-base font-semibold"
          style={{ height: '48px', borderRadius: '12px' }}
        >
          Enter Room
        </button>
      </div>
    </Modal>
  )
}

// ── Join Room Modal ────────────────────────────────────────────────────────────
function JoinRoomModal({ isOpen, onClose, socket }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shaking, setShaking] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setCode('')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const triggerShake = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 400)
  }

  const handleJoin = () => {
    if (!code.trim() || code.trim().length < 6) {
      setError('Please enter a valid 6-character code.')
      triggerShake()
      return
    }
    setLoading(true)
    setError('')

    socket.emit('join_room', { code: code.trim().toUpperCase() }, (res) => {
      setLoading(false)
      if (res.success) {
        navigate(`/room/${res.code}`, { state: { createdAt: res.createdAt, timeLeft: res.timeLeft } })
      } else {
        setError(res.error || 'Room not found or expired.')
        triggerShake()
      }
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleJoin()
  }

  const hasCode = code.trim().length >= 6

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div
        className="card p-6 w-[320px] sm:w-[380px] relative"
        style={{ borderRadius: '20px' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ash-500 hover:text-ash-200 transition-colors p-1 rounded"
          aria-label="Close modal"
        >
          <CloseIcon size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <DoorIcon size={20} className="text-fire-500" />
          <h2 className="text-lg font-bold text-ash-100">Enter Room Code</h2>
        </div>

        {/* Input */}
        <div className={shaking ? 'animate-shake' : ''}>
          <input
            ref={inputRef}
            id="room-code-input"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              setError('')
            }}
            onKeyDown={handleKeyDown}
            maxLength={6}
            placeholder="e.g. X4KP9M"
            className={`input-dark text-center tracking-widest font-bold text-xl uppercase ${error ? 'error' : ''}`}
            aria-label="Room code"
            aria-describedby={error ? 'join-error' : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          {error && (
            <p id="join-error" className="mt-2 text-xs text-red-400 text-center animate-fade-in">
              {error}
            </p>
          )}
        </div>

        {/* Join button */}
        <button
          id="join-room-btn"
          onClick={handleJoin}
          disabled={!hasCode || loading}
          className="btn-fire w-full mt-4 text-base font-semibold"
          style={{ height: '48px', borderRadius: '12px' }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Joining…
            </span>
          ) : 'Join Room'}
        </button>
      </div>
    </Modal>
  )
}

// ── Home Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { socket, connected } = useSocket()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [createdAt, setCreatedAt] = useState(null)
  const [creating, setCreating] = useState(false)

  const handleCreate = () => {
    if (!socket || !connected) return
    setCreating(true)
    socket.emit('create_room', {}, (res) => {
      setCreating(false)
      if (res.success) {
        setRoomCode(res.code)
        setCreatedAt(res.createdAt)
        setShowCreate(true)
      } else {
        console.error('Create room failed:', res.error)
        alert('Failed to create room: ' + (res.error || 'Unknown error'))
      }
    })
  }

  const handleEnterRoom = () => {
    navigate(`/room/${roomCode}`, { state: { createdAt, timeLeft: 2400 } })
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 relative">
      {/* ── Logo ── */}
      <div className="mb-10 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-3">
          <h1
            className="font-black text-ash-100 tracking-tight"
            style={{ fontSize: 'clamp(2.4rem, 8vw, 3.6rem)', letterSpacing: '-0.02em' }}
          >
            VanishRoom
          </h1>
          <FlameIcon size={28} className="text-fire-500 flex-shrink-0" />
        </div>
        <p className="text-ash-400 font-medium" style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)' }}>
          Chats that burn out. True privacy.
        </p>
      </div>

      {/* ── Cards ── */}
      <div
        className="w-full flex flex-col sm:flex-row gap-4 animate-slide-up"
        style={{ maxWidth: '440px' }}
      >
        {/* Create Room */}
        <button
          id="create-room-card"
          onClick={handleCreate}
          disabled={!connected || creating}
          className="card flex-1 flex flex-col items-center justify-center gap-3 p-6 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '130px', borderRadius: '16px' }}
          aria-label="Create a new room"
        >
          <span className="text-fire-500 group-hover:scale-110 transition-transform duration-200">
            {creating
              ? <span className="w-6 h-6 border-2 border-fire-500/30 border-t-fire-500 rounded-full animate-spin inline-block" />
              : <PlusIcon size={28} />
            }
          </span>
          <span className="text-ash-200 font-semibold text-[1rem]">Create a Room</span>
          {!connected && (
            <span className="text-ash-500 text-xs">Connecting…</span>
          )}
        </button>

        {/* Join Room */}
        <button
          id="join-room-card"
          onClick={() => setShowJoin(true)}
          disabled={!connected}
          className="card flex-1 flex flex-col items-center justify-center gap-3 p-6 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '130px', borderRadius: '16px' }}
          aria-label="Join an existing room"
        >
          <span className="text-fire-500 group-hover:scale-110 transition-transform duration-200">
            <DoorIcon size={28} />
          </span>
          <span className="text-ash-200 font-semibold text-[1rem]">Join a Room</span>
        </button>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-10 text-center space-y-2 animate-fade-in">
        <p className="flex items-center justify-center gap-2 text-ash-600" style={{ fontSize: '0.8rem' }}>
          <LockIcon size={14} className="text-ash-600" />
          No accounts. No logs. 40 minutes. Gone forever.
        </p>
        <Link
          to="/privacy"
          className="text-ash-600 hover:text-fire-500 transition-colors underline"
          style={{ fontSize: '0.75rem' }}
        >
          Privacy Policy
        </Link>
      </footer>

      {/* ── Modals ── */}
      <CreateRoomModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        roomCode={roomCode}
        onEnterRoom={handleEnterRoom}
      />
      <JoinRoomModal
        isOpen={showJoin}
        onClose={() => setShowJoin(false)}
        socket={socket}
      />
    </main>
  )
}
