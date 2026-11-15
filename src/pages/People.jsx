import { useState } from 'react'
import { useStore } from '../store.js'
import { inR, RANGES } from '../inv.js'
import { Tabs, Tbl, Crud } from '../ui.jsx'
const hrs = (a) => (a.out ? ((new Date(a.out) - new Date(a.in)) / 36e5).toFixed(2) : '')
function Time() {
  const st = useStore()
  const [r, setR] = useState('30')
  const rows = st.attendance.filter((a) => inR(a.in, r))
  return (
    <div className="grid">
      <select className="input" value={r} onChange={(e) => setR(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <Tbl name="Time attendance" rows={rows} cols={[['Date', (a) => a.date], ['Employee', (a) => a.name], ['In', (a) => new Date(a.in).toLocaleTimeString()], ['Out', (a) => (a.out ? new Date(a.out).toLocaleTimeString() : '')], ['Hours', hrs]]} />
      <small className="mut">Total hours: {rows.reduce((a, x) => a + (x.out ? (new Date(x.out) - new Date(x.in)) / 36e5 : 0), 0).toFixed(2)}</small>
    </div>
  )
}
export default function People() {
  const [t, setT] = useState('sup')
  return (
    <div>
      <Tabs v={t} on={setT} items={[['sup', 'Suppliers'], ['emp', 'Employees'], ['time', 'Attendance']]} />
      {t === 'sup' && <Crud coll="suppliers" title="Supplier" fields={[{ k: 'name', l: 'Supplier name', req: true }, { k: 'contact', l: 'Contact person' }, { k: 'phone', l: 'Phone' }, { k: 'email', l: 'Email' }, { k: 'address', l: 'Address', t: 'area' }, { k: 'terms', l: 'Payment terms' }]} line={(r) => [r.contact, r.phone, r.terms].filter(Boolean).join(' · ')} />}
      {t === 'emp' && <Crud coll="employees" title="Employee" empty={{ active: true }} fields={[{ k: 'name', l: 'Name', req: true }, { k: 'role', l: 'Role / position' }, { k: 'phone', l: 'Phone' }, { k: 'pin', l: 'PIN (blank = none)', t: 'password' }, { k: 'active', l: 'Active', t: 'check' }]} line={(r) => [r.role, r.phone, r.active === false ? 'inactive' : 'active'].filter(Boolean).join(' · ')} />}
      {t === 'time' && <Time />}
    </div>
  )
}
