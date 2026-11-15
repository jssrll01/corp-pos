import { useEffect, useState } from 'react'
import Icon from './icons.jsx'
const el = () => document.documentElement
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches)
const canFs = () => !!(el().requestFullscreen || el().webkitRequestFullscreen)
const lock = () => { try { const p = window.screen.orientation && window.screen.orientation.lock && window.screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}) } catch (e) {} }
export default function Kiosk() {
  const [fs, setFs] = useState(isFs())
  const [fail, setFail] = useState(false)
  const [portrait, setPortrait] = useState(window.matchMedia('(orientation: portrait)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const o = () => setPortrait(mq.matches)
    const f = () => { const v = isFs(); setFs(v); if (!v) setFail(false); else lock() }
    const cm = (e) => e.preventDefault()
    document.addEventListener('fullscreenchange', f)
    document.addEventListener('webkitfullscreenchange', f)
    document.addEventListener('contextmenu', cm)
    if (mq.addEventListener) mq.addEventListener('change', o); else mq.addListener(o)
    if (isFs()) lock()
    return () => {
      document.removeEventListener('fullscreenchange', f)
      document.removeEventListener('webkitfullscreenchange', f)
      document.removeEventListener('contextmenu', cm)
      if (mq.removeEventListener) mq.removeEventListener('change', o); else mq.removeListener(o)
    }
  }, [])
  const start = async () => {
    try { const r = el().requestFullscreen || el().webkitRequestFullscreen; if (r) await r.call(el(), { navigationUI: 'hide' }) } catch (e) {}
    lock()
    const v = isFs()
    setFs(v)
    if (!v) setFail(true)
  }
  if (canFs() && !fs && !fail) return (
    <div className="kiosk"><h2 style={{ margin: 0 }}>Full screen required</h2><p style={{ margin: 0, opacity: 0.8 }}>Tap to open the app in full screen, landscape.</p><button className="btn pri" onClick={start}>Start</button></div>
  )
  if (portrait) return (
    <div className="kiosk"><Icon n="rotate" s={54} /><h2 style={{ margin: 0 }}>Rotate your device</h2><p style={{ margin: 0, opacity: 0.8 }}>This app runs in landscape mode.</p></div>
  )
  return null
}
