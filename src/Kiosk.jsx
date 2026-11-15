import { useEffect, useState } from 'react'
import Icon from './icons.jsx'
const el = () => document.documentElement
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches)
const lock = () => { try { const p = window.screen.orientation && window.screen.orientation.lock && window.screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}) } catch (e) {} }
const go = () => {
  if (isFs()) return
  try {
    const r = el().requestFullscreen || el().webkitRequestFullscreen
    if (r) { const p = r.call(el(), { navigationUI: 'hide' }); if (p && p.then) p.then(lock, () => {}) }
  } catch (e) {}
}
export default function Kiosk() {
  const [portrait, setPortrait] = useState(window.matchMedia('(orientation: portrait)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const o = () => setPortrait(mq.matches)
    const f = () => { if (isFs()) lock() }
    const cm = (e) => e.preventDefault()
    document.addEventListener('click', go, true)
    document.addEventListener('touchend', go, true)
    document.addEventListener('fullscreenchange', f)
    document.addEventListener('webkitfullscreenchange', f)
    document.addEventListener('contextmenu', cm)
    if (mq.addEventListener) mq.addEventListener('change', o); else mq.addListener(o)
    lock()
    return () => {
      document.removeEventListener('click', go, true)
      document.removeEventListener('touchend', go, true)
      document.removeEventListener('fullscreenchange', f)
      document.removeEventListener('webkitfullscreenchange', f)
      document.removeEventListener('contextmenu', cm)
      if (mq.removeEventListener) mq.removeEventListener('change', o); else mq.removeListener(o)
    }
  }, [])
  if (portrait) return (
    <div className="kiosk"><Icon n="rotate" s={54} /><h2 style={{ margin: 0 }}>Rotate your device</h2></div>
  )
  return null
}
