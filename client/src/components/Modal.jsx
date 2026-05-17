import { useEffect, useRef } from 'react'

/**
 * Generic modal overlay with scale-in animation.
 * Traps focus when open. Closes on Escape unless `preventClose` is true.
 */
export default function Modal({ isOpen, onClose, preventClose = false, children, className = '' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape' && !preventClose && onClose) onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Prevent body scroll
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, preventClose, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e) => {
    if (!preventClose && e.target === overlayRef.current && onClose) onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="overlay animate-fade-in"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={`animate-scale-in ${className}`}>
        {children}
      </div>
    </div>
  )
}
