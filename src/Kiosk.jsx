import { useEffect, useState } from 'react'
import Icon from './icons.jsx'
const lock = () => { try { const p = window.screen.orientation && window.screen.orientation.lock && window.screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}) } catch (e) {} }
export default function Kiosk() {
  const [portrait, setPortrait] = useState(window.matchMedia('(orientation: portrait)').matches)
  useEffect(() => {
    const r = document.getElementById('root')
    if (r) r.removeAttribute('style')
    const mq = window.matchMedia('(orientation: portrait)')
    const o = () => setPortrait(mq.matches)
    const cm = (e) => e.preventDefault()
    document.addEventListener('contextmenu', cm)
    if (mq.addEventListener) mq.addEventListener('change', o); else mq.addListener(o)
    lock()
    return () => { document.removeEventListener('contextmenu', cm); if (mq.removeEventListener) mq.removeEventListener('change', o); else mq.removeListener(o) }
  }, [])
  if (portrait) return <div className="kiosk"><Icon n="rotate" s={54} /><h2 style={{ margin: 0 }}>Rotate your device</h2></div>
  return null
}
