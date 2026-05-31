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

// ── Message Bubble with reply support ─────────────────────────────────────────
function MessageBubble({ msg, isSelf, onReply }) {
  let pressTimer = null
  const handleContextMenu = (e) => { e.preventDefault(); onReply(msg) }
  const handleTouchStart = () => { pressTimer = setTimeout(() => onReply(msg), 500) }
  const handleTouchEnd = () => { if (pressTimer) clearTimeout(pressTimer) }

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
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0 mb-1" style={{ background: isSelf ? '#FF4500' : '#555555' }} aria-hidden="true" />
      <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {msg.replyTo && (
          <div className="mb-1 px-2 py-1 rounded text-xs border-l-2 border-fire-500" style={{ background: isSelf ? 'rgba(255,69,0,0.2)' : 'rgba(255,255,255,0.05)', color: '#aaa' }}>
            <span className="text-fire-400">↪️ {msg.replyTo.sender}:</span> {msg.replyTo.message}
          </div>
        )}
        {msg.type === 'gif' ? (
          <div className="relative">
            <img src={msg.message} alt="GIF" className="rounded-xl object-cover" style={{ maxWidth: '240px', maxHeight: '180px', borderRadius: '16px' }} />
            <span className="absolute bottom-2 right-2 text-white text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.6)', fontSize: '0.65rem' }}>GIF</span>
          </div>
        ) : msg.type === 'emoji' ? (
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{msg.message}</span>
        ) : (
          <div className="px-3 py-2.5 text-white" style={{
            background: isSelf ? '#CC3700' : '#2A2A2A',
            borderRadius: '16px',
            borderBottomRightRadius: isSelf ? '4px' : '16px',
            borderBottomLeftRadius: isSelf ? '16px' : '4px',
            fontSize: '0.9rem', lineHeight: '1.45', wordBreak: 'break-word',
          }}>
            {msg.message}
          </div>
        )}
        <span className="text-ash-600 mt-1" style={{ fontSize: '0.68rem' }}>{formatTimestamp(msg.timestamp)}</span>
      </div>
    </div>
  )
}

// ── Warning Banner, OneMinuteModal, ExpiredOverlay, GifPicker (unchanged) ─────
// (Keep these exactly as they were in your previous working file – omitted for brevity)
// ... WarningBanner, OneMinuteModal, ExpiredOverlay, GifPicker ...

// ── Chat Header with owner controls ───────────────────────────────────────────
function ChatHeader({ code, timeLeft, userCount, onLeave, isOwner, locked, onLockToggle, onManageUsers }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const isUnder5 = timeLeft < 300
  const isUnder1 = timeLeft < 60
  const timerClass = isUnder1 ? 'text-red-400 animate-heartbeat text-glow-red tabular-nums' : isUnder5 ? 'text-fire-500 animate-pulse-soft tabular-nums' : 'text-fire-500 tabular-nums'
  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4" style={{ height: '56px', background: 'rgba(26,26,26,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A2A' }}>
      <button onClick={handleCopy} className="flex items-center gap-1.5 text-ash-300 hover:text-fire-500 transition-colors group" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
        <span className="tracking-widest font-semibold">{code}</span>
        <span className="text-ash-500 group-hover:text-fire-500">{copied ? <CheckIcon size={14} className="text-green-400" /> : <CopyIcon size={14} />}</span>
      </button>
      <div className="flex items-center gap-1">
        <ClockIcon size={14} className={isUnder1 ? 'text-red-400' : 'text-fire-500'} />
        <span className={`font-bold ${timerClass}`} style={{ fontSize: '1.1rem' }}>{formatTime(timeLeft)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-ash-300" style={{ fontSize: '0.8rem' }}>
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_4px_rgba(52,199,89,0.8)]" />
          <UsersIcon size={14} className="text-ash-500" />
          <span>{userCount}</span>
        </div>
        {isOwner && (
          <>
            <button onClick={onLockToggle} className="btn-ghost text-ash-300 hover:text-fire-500" style={{ height: '32px', borderRadius: '999px', padding: '0 12px', fontSize: '0.75rem' }}>
              {locked ? '🔒 Unlock' : '🔓 Lock'}
            </button>
            <button onClick={onManageUsers} className="btn-ghost text-ash-300 hover:text-fire-500" style={{ height: '32px', borderRadius: '999px', padding: '0 12px', fontSize: '0.75rem' }}>
              👥 Manage
            </button>
          </>
        )}
        <button onClick={onLeave} className="btn-ghost text-ash-300 hover:text-fire-500" style={{ height: '32px', borderRadius: '999px', padding: '0 12px', fontSize: '0.75rem' }}>
          Leave
        </button>
      </div>
    </header>
  )
}

// ── Input Bar with reply preview (unchanged) ─────────────────────────────────
function InputBar({ onSend, disabled, replyTo, clearReply }) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const inputRef = useRef(null)
  const hasText = text.trim().length > 0

  const handleSend = () => { if (!hasText || disabled) return; onSend(text.trim(), 'text'); setText(''); inputRef.current?.focus() }
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const handleEmojiSelect = (emoji) => { onSend(emoji.native, 'emoji'); setShowEmoji(false) }
  const handleGifSelect = (url) => { onSend(url, 'gif') }

  return (
    <>
      {showEmoji && <div className="fixed bottom-[60px] left-0 right-0 z-30 animate-slide-up" style={{ maxWidth: '420px', margin: '0 auto', padding: '0 12px 8px' }}>
        <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="dark" previewPosition="none" skinTonePosition="none" />
      </div>}
      <GifPicker visible={showGif} onClose={() => setShowGif(false)} onSelect={handleGifSelect} />
      {replyTo && (
        <div className="fixed bottom-[60px] left-0 right-0 z-20 flex items-center justify-between px-3 py-2" style={{ background: '#2A2A2A', borderTop: '1px solid #FF4500' }}>
          <div className="flex-1 text-xs text-ash-300"><span className="text-fire-500">↪️ Replying to {replyTo.sender}:</span> {replyTo.message}</div>
          <button onClick={clearReply} className="text-ash-500 hover:text-fire-500"><CloseIcon size={14} /></button>
        </div>
      )}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-3 safe-bottom" style={{ height: '60px', background: 'rgba(26,26,26,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2A2A2A' }}>
        <button onClick={() => { setShowEmoji(v => !v); setShowGif(false) }} className="text-ash-400 hover:text-fire-500 transition-colors rounded-lg p-1.5 hover:bg-white/5" style={{ minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SmileIcon size={22} /></button>
        <button onClick={() => { setShowGif(v => !v); setShowEmoji(false) }} className="text-ash-400 hover:text-fire-500 border border-ash-600 hover:border-fire-500 transition-all rounded-full px-3 font-bold" style={{ fontSize: '0.75rem', height: '32px', letterSpacing: '0.05em' }}>GIF</button>
        <input ref={inputRef} type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => setShowEmoji(false)} placeholder="Type a message…" disabled={disabled} className="flex-1 text-white placeholder-ash-500 bg-ash-700 border-none outline-none px-4 disabled:opacity-50" style={{ height: '44px', borderRadius: '22px', fontSize: '0.95rem' }} autoComplete="off" />
        <button onClick={handleSend} disabled={!hasText || disabled} className="flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:cursor-not-allowed" style={{ width: '44px', height: '44px', borderRadius: '50%', background: hasText && !disabled ? 'linear-gradient(135deg, #FF4500, #FF8C00)' : '#3A3A3A', boxShadow: hasText && !disabled ? '0 0 10px rgba(255,69,0,0.3)' : 'none' }}>
          <SendIcon size={16} className="text-white" />
        </button>
      </div>
    </>
  )
}

// ── User Management Modal ─────────────────────────────────────────────────────
function UserManageModal({ visible, onClose, usersList, mySocketId, onKick }) {
  if (!visible) return null
  const otherUsers = usersList.filter(uid => uid !== mySocketId)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in" onClick={onClose}>
      <div className="bg-ash-800 rounded-xl p-4 w-64 max-h-80 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-3">Users in room</h3>
        {otherUsers.length === 0 && <p className="text-ash-500 text-sm">No other users.</p>}
        {otherUsers.map(uid => (
          <div key={uid} className="flex justify-between items-center mb-2">
            <span className="text-ash-300 text-sm font-mono">{uid.slice(-8)}</span>
            <button onClick={() => onKick(uid)} className="text-red-400 text-xs px-2 py-1 rounded hover:bg-red-500/20 transition">Kick</button>
          </div>
        ))}
        <button onClick={onClose} className="mt-3 w-full btn-ghost text-ash-300">Close</button>
      </div>
    </div>
  )
}

// ── Room Page ─────────────────────────────────────────────────────────────────
export default function Room() {
  const { code } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { socket } = useSocket()

  const roomCode = useMemo(() => String(code || '').toUpperCase().trim(), [code])

  const [messages, setMessages] = useState([])
  const [timeLeft, setTimeLeft] = useState(2400)
  const [userCount, setUserCount] = useState(1)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')
  const [hasJoinedOnce, setHasJoinedOnce] = useState(false)
  const [replyTo, setReplyTo] = useState(null)

  // Owner controls state
  const [isOwner, setIsOwner] = useState(false)
  const [locked, setLocked] = useState(false)
  const [usersList, setUsersList] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const mySocketIdRef = useRef(null)

  const [show5MinBanner, setShow5MinBanner] = useState(false)
  const [show1MinModal, setShow1MinModal] = useState(false)
  const [show1MinDismissed, setShow1MinDismissed] = useState(false)
  const [expired, setExpired] = useState(false)
  const [intensified, setIntensified] = useState(false)

  const messagesEndRef = useRef(null)
  const timerRef = useRef(null)

  const addMessage = (msg) => setMessages(prev => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }])
  const addSystemMessage = (text) => addMessage({ message: text, type: 'system', timestamp: Date.now(), isSelf: false })

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    if (!joined || expired) return
    timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timerRef.current)
  }, [joined, expired])

  // Join room on mount & reconnect
  useEffect(() => {
    if (!socket || !roomCode) return
    const state = location.state || {}
    const stateTimeLeft = state.timeLeft

    const joinRoom = () => {
      if (!socket || !roomCode) return
      socket.emit('join_room', { code: roomCode }, (res) => {
        if (res.success) {
          setTimeLeft(Math.max(0, res.timeLeft || 2400))
          setJoined(true)
          setIsOwner(res.isOwner || false)
          setLocked(res.locked || false)
          setUsersList(res.users || [])
          mySocketIdRef.current = socket.id
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

    const handleConnect = () => joinRoom()
    const handleDisconnect = () => setJoined(false)

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    if (socket.connected) joinRoom()
    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [socket, roomCode, location.state])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return
    const onReceive = ({ message, type, timestamp, replyTo: incomingReply }) => addMessage({ message, type, timestamp, isSelf: false, replyTo: incomingReply })
    const onUserJoined = ({ message, socketId }) => { addSystemMessage(message); setUsersList(prev => [...prev, socketId]) }
    const onUserLeft = ({ message, socketId }) => { addSystemMessage(message); setUsersList(prev => prev.filter(id => id !== socketId)) }
    const onUserCount = ({ count }) => setUserCount(count)
    const onWarning = ({ minutesLeft }) => { if (minutesLeft === 5) setShow5MinBanner(true); if (minutesLeft === 1 && !show1MinDismissed) setShow1MinModal(true) }
    const onExpired = () => { setExpired(true); setIntensified(true); clearInterval(timerRef.current) }
    const onRoomLockChanged = ({ locked: newLocked }) => { setLocked(newLocked); addSystemMessage(newLocked ? 'Room has been locked by the owner.' : 'Room has been unlocked.') }
    const onKicked = ({ reason }) => { addSystemMessage(reason); navigate('/') }
    const onUserList = ({ users }) => setUsersList(users)

    socket.on('receive_message', onReceive)
    socket.on('user_joined', onUserJoined)
    socket.on('user_left', onUserLeft)
    socket.on('user_count', onUserCount)
    socket.on('room_warning', onWarning)
    socket.on('room_expired', onExpired)
    socket.on('room_lock_changed', onRoomLockChanged)
    socket.on('kicked_from_room', onKicked)
    socket.on('user_list', onUserList)
    return () => {
      socket.off('receive_message', onReceive)
      socket.off('user_joined', onUserJoined)
      socket.off('user_left', onUserLeft)
      socket.off('user_count', onUserCount)
      socket.off('room_warning', onWarning)
      socket.off('room_expired', onExpired)
      socket.off('room_lock_changed', onRoomLockChanged)
      socket.off('kicked_from_room', onKicked)
      socket.off('user_list', onUserList)
    }
  }, [socket, show1MinDismissed, navigate])

  useEffect(() => { if (timeLeft <= 0 && joined && !expired) { setExpired(true); setIntensified(true) } }, [timeLeft, joined, expired])

  const handleSend = (message, type) => {
    if (!socket || !joined || expired) return
    const timestamp = Date.now()
    const replyData = replyTo ? { replyTo: { message: replyTo.message, sender: replyTo.sender, timestamp: replyTo.timestamp } } : {}
    addMessage({ message, type, timestamp, isSelf: true, replyTo: replyData.replyTo })
    socket.emit('send_message', { room: roomCode, message, type, ...replyData })
    setReplyTo(null)
  }

  const handleLeave = () => { if (socket && roomCode) socket.emit('leave_room', { code: roomCode }); navigate('/') }
  const handleLockToggle = () => { socket.emit('lock_room', { code: roomCode, locked: !locked }, res => { if (res.success) setLocked(res.locked); else alert(res.error) }) }
  const handleKickUser = (targetSocketId) => { socket.emit('kick_user', { code: roomCode, targetSocketId }, res => { if (res.success) { addSystemMessage('User kicked.'); setShowUserModal(false) } else alert(res.error) }) }
  const handleCreateNew = () => navigate('/')

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🚫</span>
        <h1 className="text-ash-200 text-xl font-semibold">Room not found</h1>
        <p className="text-ash-500 text-sm text-center">{error}</p>
        <button onClick={handleCreateNew} className="btn-fire mt-2" style={{ borderRadius: '12px' }}>Back to Home</button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'transparent' }}>
      {intensified && <EmberBackground intensified />}
      <ChatHeader code={roomCode} timeLeft={timeLeft} userCount={userCount} onLeave={handleLeave} isOwner={isOwner} locked={locked} onLockToggle={handleLockToggle} onManageUsers={() => setShowUserModal(true)} />
      <WarningBanner visible={show5MinBanner} onDismiss={() => setShow5MinBanner(false)} />
      <OneMinuteModal visible={show1MinModal && !show1MinDismissed} onCreateNew={handleCreateNew} onStay={() => { setShow1MinModal(false); setShow1MinDismissed(true) }} />
      <ExpiredOverlay visible={expired} onCreateNew={handleCreateNew} />
      <main className="flex-1 overflow-y-auto px-4 pt-4" style={{ marginTop: '56px', marginBottom: '60px', paddingTop: show5MinBanner ? '60px' : '16px', transition: 'padding-top 0.3s ease' }}>
        {messages.length === 0 && joined && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-ash-600 text-sm animate-fade-in">
            <FlameIcon size={32} className="text-fire-700 mb-3" />
            <p>No messages yet. Say hello! 👋</p>
            <p className="text-xs mt-1 text-ash-700">Messages vanish when the room expires.</p>
          </div>
        )}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} isSelf={msg.isSelf} onReply={() => setReplyTo({ message: msg.message, sender: msg.isSelf ? 'You' : 'User', timestamp: msg.timestamp })} />)}
        <div ref={messagesEndRef} />
      </main>
      <InputBar onSend={handleSend} disabled={expired || !joined} replyTo={replyTo} clearReply={() => setReplyTo(null)} />
      <UserManageModal visible={showUserModal} onClose={() => setShowUserModal(false)} usersList={usersList} mySocketId={mySocketIdRef.current} onKick={handleKickUser} />
    </div>
  )
}