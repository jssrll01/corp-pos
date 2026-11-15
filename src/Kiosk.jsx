import { useEffect } from 'react'
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
const fit = () => {
  const r = document.getElementById('root')
  if (!r) return
  const w = window.innerWidth, h = window.innerHeight
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  if (h > w) {
    Object.assign(r.style, { position: 'fixed', top: '0', left: '0', width: h + 'px', height: w + 'px', transformOrigin: 'top left', transform: 'translateX(' + w + 'px) rotate(90deg)', overflow: 'hidden' })
  } else {
    Object.assign(r.style, { position: '', top: '', left: '', width: '', height: '', transformOrigin: '', transform: '', overflow: '' })
  }
}
export default function Kiosk() {
  useEffect(() => {
    const f = () => { if (isFs()) lock(); fit() }
    const cm = (e) => e.preventDefault()
    document.addEventListener('click', go, true)
    document.addEventListener('touchend', go, true)
    document.addEventListener('fullscreenchange', f)
    document.addEventListener('webkitfullscreenchange', f)
    document.addEventListener('contextmenu', cm)
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    lock(); fit()
    return () => {
      document.removeEventListener('click', go, true)
      document.removeEventListener('touchend', go, true)
      document.removeEventListener('fullscreenchange', f)
      document.removeEventListener('webkitfullscreenchange', f)
      document.removeEventListener('contextmenu', cm)
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
    }
  }, [])
  return null
}
