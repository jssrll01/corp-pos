import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
export default function Scanner({ onDetect, onClose }) {
  const vid = useRef(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let stop = false, stream = null, timer = null
    if (!('BarcodeDetector' in window)) { setErr('Camera scanning is not supported in this browser. Use Chrome on Android, or a USB/Bluetooth scanner.'); return }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setErr('Camera needs HTTPS or localhost.'); return }
    let det
    try { det = new window.BarcodeDetector() } catch (e) { setErr('Barcode detector failed to start.'); return }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((s) => {
      if (stop) { s.getTracks().forEach((t) => t.stop()); return }
      stream = s
      vid.current.srcObject = s
      vid.current.play().catch(() => {})
      timer = setInterval(async () => {
        try {
          const r = await det.detect(vid.current)
          if (r.length && !stop) { stop = true; try { navigator.vibrate && navigator.vibrate(60) } catch (e) {} onDetect(r[0].rawValue) }
        } catch (e) {}
      }, 250)
    }).catch(() => setErr('Camera permission denied.'))
    return () => { stop = true; clearInterval(timer); if (stream) stream.getTracks().forEach((t) => t.stop()) }
  }, [])
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="modal raised" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <h2 style={{ margin: 0 }}>Scan barcode</h2>
        {err ? <p style={{ color: 'var(--bad)', margin: 0 }}>{err}</p> : (
          <div className="scanbox"><video ref={vid} playsInline muted /><i className="scanline" /></div>
        )}
        <button className="btn" onClick={onClose}>Close</button>
      </motion.div>
    </motion.div>
  )
}
