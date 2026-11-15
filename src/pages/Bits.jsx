import Sel from '../Sel.jsx'
import { useEffect, useState } from 'react'
import { useStore } from '../store.js'
import { isLow, curUser, audit } from '../inv.js'
export function NavBus({ go }) {
  useEffect(() => { const h = (e) => go(e.detail); window.addEventListener('pos-nav', h); return () => window.removeEventListener('pos-nav', h) }, [go])
  return null
}
export function LowDot() {
  const st = useStore()
  return st.products.some((p) => isLow(p, st)) ? <i className="dot" /> : null
}
export function UserSwitch() {
  const st = useStore()
  const [, force] = useState(0)
  const emps = st.employees.filter((e) => e.active !== false)
  if (!emps.length) return <small className="mut" style={{ margin: '0 8px' }}>User: Admin</small>
  const pick = (id) => {
    const e = emps.find((x) => x.id === id)
    if (e && e.pin && window.prompt('PIN for ' + e.name) !== e.pin) return window.alert('Wrong PIN')
    try { localStorage.setItem('pos_user', id) } catch (x) {}
    audit('User switched', e ? e.name : 'Admin')
    force((n) => n + 1)
  }
  return <Sel className="input" value={curUser().id} onChange={(e) => pick(e.target.value)}><option value="">Admin</option>{emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Sel>
}
