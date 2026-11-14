import { useState } from 'react'
import { motion } from 'framer-motion'
import { activate } from '../license.js'
export default function Activate({ onOk }) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [bad, setBad] = useState(false)
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    const ok = await activate(name, key)
    setBusy(false)
    if (ok) onOk(); else { setBad(true); setTimeout(() => setBad(false), 500) }
  }
  return (
    <div style={{ padding: 16 }}>
      <motion.div className="raised lockbox" initial={{ opacity: 0, y: 20 }} animate={bad ? { opacity: 1, y: 0, x: [0, -10, 10, -8, 8, 0] } : { opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.4 }}>
        <div className="check" style={{ background: 'var(--ac)' }}>🔑</div>
        <h2 style={{ margin: 0 }}>Activate POS</h2>
        <input className="input" placeholder="Business name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="XXXX-XXXX-XXXX-XXXX" value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
        {bad && <small style={{ color: 'var(--bad)' }}>Invalid key for this business name</small>}
        <button className="btn pri" disabled={busy || !name.trim() || !key.trim()} onClick={go}>Activate</button>
      </motion.div>
    </div>
  )
}
