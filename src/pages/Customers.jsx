import Sel from '../Sel.jsx'
import { useState } from 'react'
import { useStore } from '../store.js'
import { money } from '../inv.js'
import { ono } from '../cart.js'
import { Crud, Tbl } from '../ui.jsx'
function Insight() {
  const st = useStore()
  const [id, setId] = useState('')
  const c = st.customers.find((x) => x.id === id)
  const os = st.orders.filter((o) => o.customerId === id)
  const m = {}
  os.forEach((o) => o.items.forEach((i) => { m[i.name] = (m[i.name] || 0) + i.qty }))
  const top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5)
  return (
    <div className="grid">
      <div className="raised mpanel">
        <h3 style={{ margin: 0 }}>Purchase history</h3>
        <Sel className="input" value={id} onChange={(e) => setId(e.target.value)}><option value="">Select customer</option>{st.customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Sel>
        {c && <small className="mut">{c.points || 0} points · spent {money(os.reduce((a, o) => a + o.total, 0))} · owes {money(os.reduce((a, o) => a + (o.balance || 0), 0))}</small>}
        {c && <b>Frequently bought</b>}
        {c && !top.length && <small className="mut">No purchases yet</small>}
        {c && top.map(([n, q]) => <div key={n} className="sumline"><span>{n}</span><span>{q} pcs</span></div>)}
      </div>
      {c && <Tbl name={'History ' + c.name} rows={os} cols={[['Order', (o) => ono(o.no)], ['Date', (o) => new Date(o.date).toLocaleDateString()], ['Items', (o) => o.items.map((i) => i.qty + 'x ' + i.name).join('; ')], ['Total', (o) => money(o.total)], ['Balance', (o) => money(o.balance || 0)]]} />}
    </div>
  )
}
export default function Customers() {
  const { levels } = useStore()
  const lv = [['retail', 'Retail'], ...levels.map((l) => [l.id, l.name])]
  const nm = (id) => (lv.find((x) => x[0] === id) || [0, 'Retail'])[1]
  return (
    <div style={{ marginTop: 12 }}>
      <Crud coll="customers" title="Customer" empty={{ level: 'retail', points: 0 }}
        fields={[{ k: 'name', l: 'Name', req: true }, { k: 'phone', l: 'Phone' }, { k: 'level', l: 'Price level', t: 'select', o: lv }, { k: 'points', l: 'Loyalty points', t: 'number' }, { k: 'note', l: 'Notes', t: 'area' }]}
        line={(r) => [r.phone, nm(r.level), (r.points || 0) + ' pts'].filter(Boolean).join(' · ')}
        after={<Insight />} />
    </div>
  )
}
