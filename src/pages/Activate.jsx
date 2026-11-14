import { useState } from 'react'
import { activate } from '../license.js'
export default function Activate({ onOk }) {
  const [key, setKey] = useState('')
  const [bad, setBad] = useState(false)
  const go = async () => { if (await activate(key)) onOk(); else setBad(true) }
  return (
    <div style={{ padding: 16 }}>
      <div className="raised lockbox">
        <div className="check" style={{ background: 'var(--ac)' }}>🔑</div>
        <h2 style={{ margin: 0 }}>Enter activation key</h2>
        <input className="input" autoFocus placeholder="XXXX-XXXX-XXXX-XXXX" value={key} onChange={(e) => { setKey(e.target.value); setBad(false) }} onKeyDown={(e) => e.key === 'Enter' && go()} />
        {bad && <small style={{ color: 'var(--bad)' }}>Invalid key</small>}
        <button className="btn pri" disabled={!key.trim()} onClick={go}>Activate</button>
      </div>
    </div>
  )
}
