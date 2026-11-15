import { useEffect } from 'react'
const lock = () => { try { const o = window.screen.orientation; if (o && o.lock) { const p = o.lock('landscape'); if (p && p.catch) p.catch(() => {}) } } catch (e) {} }
const full = () => {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches || document.fullscreenElement) return
    const r = document.documentElement
    if (r.requestFullscreen) { const p = r.requestFullscreen(); if (p && p.catch) p.catch(() => {}) }
  } catch (e) {}
}
export default function Kiosk() {
  useEffect(() => {
    const r = document.getElementById('root')
    if (r) r.removeAttribute('style')
    const cm = (e) => e.preventDefault()
    const first = () => { full(); setTimeout(lock, 150) }
    document.addEventListener('contextmenu', cm)
    document.addEventListener('pointerdown', first, { once: true })
    lock()
    return () => { document.removeEventListener('contextmenu', cm); document.removeEventListener('pointerdown', first) }
  }, [])
  return null
}
