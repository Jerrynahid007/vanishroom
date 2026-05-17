import { useEffect, useRef, useCallback } from 'react'

const PARTICLE_COUNT = 90
const BASE_COLOR = [255, 69, 0]

function createParticle(canvas, intensified = false) {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 1.5 + Math.random() * 2.5,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(0.4 + Math.random() * 0.5),
    opacity: intensified ? 0.4 + Math.random() * 0.5 : 0.15 + Math.random() * 0.35,
    baseOpacity: intensified ? 0.4 + Math.random() * 0.5 : 0.15 + Math.random() * 0.35,
  }
}

export default function EmberBackground({ intensified = false }) {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const animRef = useRef(null)
  const intensifiedRef = useRef(intensified)

  useEffect(() => {
    intensifiedRef.current = intensified
  }, [intensified])

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    // Reinitialise particles on resize
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas, intensifiedRef.current)
    )
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Initial size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Spawn particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas, intensified)
    )

    const draw = () => {
      const int = intensifiedRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((p) => {
        // Move
        const speedMul = int ? 2.2 : 1
        p.x += p.vx
        p.y += p.vy * speedMul

        // Slight horizontal sway
        p.vx += (Math.random() - 0.5) * 0.02
        p.vx = Math.max(-0.5, Math.min(0.5, p.vx))

        // Loop from top back to bottom
        if (p.y + p.radius < 0) {
          p.y = canvas.height + p.radius
          p.x = Math.random() * canvas.width
          p.vx = (Math.random() - 0.5) * 0.4
        }
        // Wrap horizontally
        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10

        // Draw
        const alpha = int ? Math.min(p.baseOpacity * 1.8, 0.9) : p.opacity
        const blur = int ? 16 : 8
        const [r, g, b] = int ? [255, 100, 0] : BASE_COLOR

        ctx.save()
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.shadowBlur = blur
        ctx.shadowColor = int
          ? `rgba(255,100,0,0.7)`
          : `rgba(255,69,0,0.4)`
        ctx.fill()
        ctx.restore()
      })

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [resize]) // intensified handled via ref for perf

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -10,
        opacity: 0.9,
        pointerEvents: 'none',
      }}
    />
  )
}
