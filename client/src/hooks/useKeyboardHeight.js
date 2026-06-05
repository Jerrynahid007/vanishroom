import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook to detect keyboard height on mobile devices.
 * Uses the Visual Viewport API and focus events to track keyboard open/close.
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  const updateKeyboardHeight = useCallback(() => {
    const vv = window.visualViewport
    if (!vv) {
      setKeyboardHeight(0)
      setIsKeyboardVisible(false)
      return
    }

    const gap = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0))
    const visible = gap > 70

    setKeyboardHeight(gap)
    setIsKeyboardVisible(visible)
  }, [])

  useEffect(() => {
    updateKeyboardHeight()

    const onVisualViewportResize = () => updateKeyboardHeight()
    const onVisualViewportScroll = () => updateKeyboardHeight()
    const onWindowResize = () => updateKeyboardHeight()
    const onFocusChange = () => setTimeout(updateKeyboardHeight, 60)

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onVisualViewportResize)
      window.visualViewport.addEventListener('scroll', onVisualViewportScroll)
    }

    window.addEventListener('resize', onWindowResize)
    window.addEventListener('focusin', onFocusChange)
    window.addEventListener('focusout', onFocusChange)

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onVisualViewportResize)
        window.visualViewport.removeEventListener('scroll', onVisualViewportScroll)
      }
      window.removeEventListener('resize', onWindowResize)
      window.removeEventListener('focusin', onFocusChange)
      window.removeEventListener('focusout', onFocusChange)
    }
  }, [updateKeyboardHeight])

  return { keyboardHeight, isKeyboardVisible }
}
