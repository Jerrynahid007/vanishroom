# 🔥 VanishRoom

> Chats that burn out. True privacy.

VanishRoom is a production-ready ephemeral chat web application. Rooms self-destruct after exactly **40 minutes**. No messages are ever stored. No accounts, no logs, no database for messages.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3 |
| Routing | react-router-dom v6 |
| Real-time | Socket.IO (client + server) |
| Backend | Node.js, Express |
| Ephemeral Store | Redis (ioredis) — room metadata only |
| Emoji Picker | @emoji-mart/react |
| GIFs | GIPHY API (optional) |

---

## Project Structure

```
vanishroom/
├── server/
│   ├── index.js          # Express + Socket.IO setup
│   ├── socketHandler.js  # All socket event handlers + room timers
│   ├── roomManager.js    # Redis CRUD helpers
│   └── .env              # PORT, REDIS_URL, CLIENT_ORIGIN
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── hooks/
│   │   │   └── useSocket.js        # Shared Socket.IO connection hook
│   │   ├── components/
│   │   │   ├── EmberBackground.jsx # Canvas particle system
│   │   │   ├── Icons.jsx           # Inline SVG icon components
│   │   │   └── Modal.jsx           # Reusable modal overlay
│   │   └── pages/
│   │       ├── Home.jsx            # Landing page + Create/Join modals
│   │       ├── Room.jsx            # Full chat room (all features)
│   │       └── Privacy.jsx         # Privacy policy page
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env                        # VITE_SERVER_URL, VITE_GIPHY_KEY
│
└── package.json                    # Root convenience scripts
```

---

## Prerequisites

- **Node.js** v18+
- **Redis** running locally (default: `redis://localhost:6379`)
  - macOS: `brew install redis && brew services start redis`
  - Or run: `redis-server`

---

## Getting Started

### 1. Install all dependencies

```bash
npm run install:all
```

### 2. Start the backend (Terminal 1)

```bash
npm run dev:server
# Server running on http://localhost:4000
```

### 3. Start the frontend (Terminal 2)

```bash
npm run dev:client
# App running on http://localhost:5173
```

---

## Environment Variables

### Server (`server/.env`)
```
PORT=4000
REDIS_URL=redis://localhost:6379
CLIENT_ORIGIN=http://localhost:5173
```

### Client (`client/.env`)
```
VITE_SERVER_URL=http://localhost:4000
VITE_GIPHY_KEY=          # Optional — get free key at developers.giphy.com
```

---

## Features

### 🔐 Privacy First
- Messages **never** written to any database, file, or log
- Transit-only: WebSocket broadcast, gone immediately
- No accounts, no emails, no registration
- Zero analytics or tracking

### ⏱️ 40-Minute Self-Destruct
- Room metadata stored in Redis with 2400-second TTL
- Server-side timers fire warnings at **35min** (5-min warning) and **39min** (1-min warning)
- At 40min: `room_expired` emitted, all sockets ejected, Redis key deleted
- Client-side countdown calculated from `createdAt` timestamp

### 🎨 Black & Fire Design
- Pure black `#0B0B0B` background
- Fire gradient accent: `#FF4500 → #FF8C00`
- Ember particle canvas (80–100 glowing particles, intensify on expiry)
- Full Tailwind CSS design system with custom fire/ash color tokens
- Inter font, glassmorphism headers

### 💬 Chat Features
- Text, emoji (full emoji-mart picker), and GIF messages (GIPHY)
- Sent bubbles: `#CC3700` right-aligned; Received: `#2A2A2A` left-aligned
- Animated message entrance (fade + slide up)
- System messages (join/leave events) centered + italic
- Live user count in header
- Countdown timer: pulses under 5min, red heartbeat under 1min

### 📱 Responsive
- Mobile-first, all touch targets ≥ 44px
- Cards stack on mobile, side-by-side on tablet+
- `clamp()` fluid typography

---

## Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `create_room` | Client → Server | Creates room, returns `{ success, code, createdAt }` |
| `join_room` | Client → Server | Joins room, returns `{ success, code, createdAt, timeLeft }` |
| `send_message` | Client → Server | Broadcasts message to room (never stored) |
| `leave_room` | Client → Server | Leaves room, updates user count |
| `receive_message` | Server → Client | Incoming message from another user |
| `user_joined` | Server → Client | System notification |
| `user_left` | Server → Client | System notification |
| `user_count` | Server → Client | Updated room member count |
| `room_warning` | Server → Client | `{ minutesLeft: 5 \| 1 }` |
| `room_expired` | Server → Client | Room has self-destructed |

---

## Rate Limiting

Room creation is limited to **3 rooms per IP per day** using Redis counters. The counter key expires after 24 hours.

---

## License

MIT — built for privacy, not for profit.
