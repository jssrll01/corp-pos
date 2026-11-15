import { useState } from 'react'
import { useStore, setState } from '../store.js'
import { uid, dkey, audit } from '../inv.js'
import { Tbl } from '../ui.jsx'
const hrs = (a) => (a.out ? ((new Date(a.out) - new Date(a.in)) / 36e5).toFixed(2) : '')
export default function Attend() {
  const st = useStore()
  const [id, setId] = useState('')
  const [pin, setPin] = useState('')
  const e = st.employees.find((x) => x.id === id)
  const open = st.attendance.find((a) => a.empId === id && !a.out)
  const act = () => {
    if (!e) return
    if (e.pin && e.pin !== pin) return window.alert('Wrong PIN')
    const now = new Date().toISOString()
    if (open) setState((s) => ({ attendance: s.attendance.map((a) => (a.id === open.id ? { ...a, out: now } : a)) }))
    else setState((s) => ({ attendance: [{ id: uid(), empId: id, name: e.name, date: dkey(now), in: now, out: '' }, ...s.attendance] }))
    audit(open ? 'Clock out' : 'Clock in', e.name)
    setPin('')
  }
  const tm = (d) => (d ? new Date(d).toLocaleTimeString() : '')
  if (!st.employees.length) return <p className="mut" style={{ marginTop: 16 }}>Add employees first in Management, People.</p>
  return (
    <div className="grid" style={{ marginTop: 12 }}>
      <div className="raised mpanel">
        <h3 style={{ margin: 0 }}>Time clock</h3>
        <select className="input" value={id} onChange={(x) => setId(x.target.value)}><option value="">Select employee</option>{st.employees.filter((x) => x.active !== false).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        {e && e.pin && <input className="input" type="password" inputMode="numeric" placeholder="Employee PIN" value={pin} onChange={(x) => setPin(x.target.value)} />}
        {e && <button className="btn pri" onClick={act}>{open ? 'Clock out' : 'Clock in'}</button>}
        {e && <small className="mut">{open ? 'Clocked in since ' + tm(open.in) : 'Not clocked in'}</small>}
      </div>
      <Tbl name="Attendance" rows={st.attendance.slice(0, 60)} cols={[['Date', (a) => a.date], ['Employee', (a) => a.name], ['In', (a) => tm(a.in)], ['Out', (a) => tm(a.out)], ['Hours', hrs]]} />
    </div>
  )
}
