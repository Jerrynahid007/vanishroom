import { Link } from 'react-router-dom'
import { ArrowLeftIcon, LockIcon, DatabaseXIcon, ClockIcon, ShieldIcon, EyeOffIcon, FlameIcon } from '../components/Icons'

function Section({ icon, title, children }) {
  return (
    <section className="mt-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-fire-500">{icon}</span>
        <h2 className="font-bold text-fire-500" style={{ fontSize: '1.2rem' }}>{title}</h2>
      </div>
      <div className="text-ash-300 leading-relaxed" style={{ fontSize: '1rem', lineHeight: '1.7' }}>
        {children}
      </div>
    </section>
  )
}

export default function Privacy() {
  return (
    <main
      className="min-h-dvh relative px-5 py-10"
      style={{ maxWidth: '700px', margin: '0 auto' }}
    >
      {/* Back button */}
      <Link
        to="/"
        className="fixed top-5 left-5 flex items-center justify-center w-10 h-10 rounded-full text-ash-500 hover:text-fire-500 transition-colors hover:bg-white/5"
        aria-label="Back to home"
      >
        <ArrowLeftIcon size={20} />
      </Link>

      {/* Header */}
      <div className="mt-8 mb-10 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <FlameIcon size={28} className="text-fire-500" />
          <h1 className="font-black text-ash-100" style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)' }}>
            Your Privacy, Our Firewall
          </h1>
        </div>
        <p className="text-ash-500" style={{ fontSize: '0.95rem' }}>
          VanishRoom is built from the ground up for true ephemerality and privacy.
          Here's exactly how it works.
        </p>
      </div>

      <div className="animate-slide-up">
        <Section icon={<DatabaseXIcon size={22} />} title="No Message Storage — Ever">
          <p>
            Every message you send travels directly through our server to other participants
            using real-time WebSocket connections (Socket.IO). <strong className="text-ash-200">We never write
            your messages to any database, file, or log.</strong> The moment a message is
            broadcast to the room, it exists only in the memory of the participants'
            browsers. When they close the tab, it's gone.
          </p>
        </Section>

        <Section icon={<LockIcon size={22} />} title="No Accounts, No Identity">
          <p>
            VanishRoom requires zero registration. No email, no username, no password.
            Each session is identified only by a temporary socket connection ID that
            is discarded when you disconnect. We cannot link any message to any person.
          </p>
        </Section>

        <Section icon={<ClockIcon size={22} />} title="40-Minute Self-Destruct">
          <p>
            Rooms are created with a strict <strong className="text-ash-200">40-minute TTL (Time-To-Live)</strong>{' '}
            enforced at the Redis layer. After 40 minutes, the room code is deleted and
            all connected sockets are forcibly removed from the room. There is no way to
            extend a room's lifetime. A new room can always be created.
          </p>
        </Section>

        <Section icon={<ShieldIcon size={22} />} title="What We Do Store (Temporarily)">
          <p>
            The <em>only</em> data held in Redis is the room code and its creation
            timestamp — both automatically deleted after 40 minutes. We also maintain
            an IP-based rate-limit counter (max 3 room creations per day) to prevent
            abuse. This counter expires after 24 hours and contains no personal
            information beyond a hashed IP.
          </p>
        </Section>

        <Section icon={<EyeOffIcon size={22} />} title="Server Logs & Analytics">
          <p>
            Our server logs only contain connection events (socket IDs, timestamps, and
            room codes) for debugging purposes. These logs are <strong className="text-ash-200">never shared
            with third parties</strong> and are rotated frequently. No analytics
            services, trackers, or cookies are used in this application.
          </p>
        </Section>

        <Section icon={<FlameIcon size={22} />} title="Open Principles">
          <p>
            If a room expires or the server restarts, all room data is lost — and that
            is by design. VanishRoom is built on the principle that the best way to
            protect your data is to never have it in the first place.
          </p>
          <p className="mt-3 text-ash-500 italic" style={{ fontSize: '0.88rem' }}>
            Last updated: May 2026. VanishRoom does not have a legal entity and makes
            no warranties. Use at your own discretion for non-sensitive communications.
          </p>
        </Section>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-ash-800 text-center">
        <Link to="/" className="btn-fire inline-flex" style={{ borderRadius: '12px' }}>
          Back to VanishRoom
        </Link>
      </div>
    </main>
  )
}
