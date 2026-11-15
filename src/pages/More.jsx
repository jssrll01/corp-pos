import { useState } from 'react'
import Sel from '../Sel.jsx'
import { useX, setX, uid } from '../xstore.js'
import { useStore, setState } from '../store.js'
import { money, num, r2, audit } from '../inv.js'
const day = () => new Date().toISOString().slice(0, 10)
const Row = ({ children }) => <div className="raised prow" style={{ gap: 8, flexWrap: 'wrap' }}>{children}</div>
const Box = ({ t, children }) => <div className="raised mpanel" style={{ display: 'grid', gap: 6 }}><b>{t}</b>{children}</div>
const In = (p) => <input className="input" {...p} />
const Msg = ({ m }) => (m ? <small className="mut">{m}</small> : null)

export function Payroll() {
  const x = useX()
  const [e, setE] = useState({ name: '', type: 'monthly', rate: '' })
  const [r, setR] = useState({ emp: '', units: '', bonus: '', ded: '', month: day().slice(0, 7), exp: true })
  const addE = () => { if (!e.name.trim() || num(e.rate) <= 0) return; setX((s) => ({ emps: [...s.emps, { id: uid(), name: e.name.trim(), type: e.type, rate: num(e.rate) }] })); setE({ name: '', type: 'monthly', rate: '' }) }
  const emp = x.emps.find((a) => a.id === r.emp)
  const gross = emp ? (emp.type === 'monthly' ? emp.rate : emp.rate * num(r.units)) : 0
  const net = r2(gross + num(r.bonus) - num(r.ded))
  const run = () => {
    if (!emp) return
    setX((s) => ({ pay: [{ id: uid(), date: new Date().toISOString(), month: r.month, name: emp.name, gross: r2(gross), bonus: num(r.bonus), ded: num(r.ded), net }, ...s.pay] }))
    if (r.exp) setState((s) => ({ expenses: [{ id: uid(), date: day(), amount: net, name: 'Payroll ' + emp.name, title: 'Payroll ' + emp.name, cat: 'Payroll', category: 'Payroll', note: r.month }, ...(s.expenses || [])] }))
    audit('Payroll', emp.name + ' ' + money(net)); setR({ ...r, units: '', bonus: '', ded: '' })
  }
  return (
    <div className="grid">
      <Box t="Employees">
        <div className="row2"><In placeholder="Name" value={e.name} onChange={(v) => setE({ ...e, name: v.target.value })} /><Sel value={e.type} onChange={(v) => setE({ ...e, type: v.target.value })}><option value="monthly">Monthly salary</option><option value="hourly">Hourly rate</option></Sel><In type="number" placeholder="Rate" value={e.rate} onChange={(v) => setE({ ...e, rate: v.target.value })} /><button className="btn pri" onClick={addE}>Add</button></div>
        {x.emps.map((a) => <Row key={a.id}><b style={{ flex: 1 }}>{a.name}</b><small>{a.type} · {money(a.rate)}</small><button className="btn bad" onClick={() => setX((s) => ({ emps: s.emps.filter((z) => z.id !== a.id) }))}>Delete</button></Row>)}
      </Box>
      <Box t="Run payroll">
        <div className="row2"><Sel value={r.emp} onChange={(v) => setR({ ...r, emp: v.target.value })}><option value="">Select employee</option>{x.emps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Sel><In type="month" value={r.month} onChange={(v) => setR({ ...r, month: v.target.value })} />{emp && emp.type === 'hourly' && <In type="number" placeholder="Hours" value={r.units} onChange={(v) => setR({ ...r, units: v.target.value })} />}<In type="number" placeholder="Bonus" value={r.bonus} onChange={(v) => setR({ ...r, bonus: v.target.value })} /><In type="number" placeholder="Deductions" value={r.ded} onChange={(v) => setR({ ...r, ded: v.target.value })} /></div>
        <label className="lbl"><span><input type="checkbox" checked={r.exp} onChange={(v) => setR({ ...r, exp: v.target.checked })} /> Also record as expense</span></label>
        <div className="row2"><b>Net pay: {money(net)}</b><button className="btn pri" disabled={!emp} onClick={run}>Pay</button></div>
      </Box>
      <Box t="Payroll history">
        {x.pay.length === 0 && <small className="mut">No payroll yet</small>}
        {x.pay.slice(0, 100).map((p) => <Row key={p.id}><b style={{ flex: 1 }}>{p.name}</b><small>{p.month}</small><small>gross {money(p.gross)} +{money(p.bonus)} -{money(p.ded)}</small><b>{money(p.net)}</b></Row>)}
      </Box>
    </div>
  )
}

export function Gifts() {
  const x = useX()
  const [a, setA] = useState({ amount: '', who: '' })
  const [c, setC] = useState({ code: '', amt: '' })
  const [m, setM] = useState('')
  const add = () => { const v = num(a.amount); if (v <= 0) return; const code = 'GC-' + Math.random().toString(36).slice(2, 10).toUpperCase(); setX((s) => ({ gifts: [{ id: uid(), code, amount: v, balance: v, who: a.who.trim(), date: day() }, ...s.gifts] })); setM('Created ' + code); setA({ amount: '', who: '' }) }
  const use = () => {
    const g = x.gifts.find((z) => z.code === c.code.trim().toUpperCase()); const v = num(c.amt)
    if (!g) return setM('Card not found')
    if (v <= 0) return setM('Enter an amount')
    if (v > g.balance) return setM('Insufficient balance: ' + money(g.balance))
    setX((s) => ({ gifts: s.gifts.map((z) => (z.id === g.id ? { ...z, balance: r2(z.balance - v) } : z)) })); setM('Redeemed ' + money(v) + ', left ' + money(g.balance - v)); setC({ code: '', amt: '' })
  }
  return (
    <div className="grid">
      <Box t="Issue gift card"><div className="row2"><In type="number" placeholder="Amount" value={a.amount} onChange={(v) => setA({ ...a, amount: v.target.value })} /><In placeholder="Name (optional)" value={a.who} onChange={(v) => setA({ ...a, who: v.target.value })} /><button className="btn pri" onClick={add}>Create</button></div></Box>
      <Box t="Check or redeem"><div className="row2"><In placeholder="Code" value={c.code} onChange={(v) => setC({ ...c, code: v.target.value })} /><In type="number" placeholder="Amount to use" value={c.amt} onChange={(v) => setC({ ...c, amt: v.target.value })} /><button className="btn" onClick={() => { const g = x.gifts.find((z) => z.code === c.code.trim().toUpperCase()); setM(g ? 'Balance ' + money(g.balance) : 'Card not found') }}>Balance</button><button className="btn pri" onClick={use}>Redeem</button></div><Msg m={m} /></Box>
      <Box t="All gift cards">{x.gifts.length === 0 && <small className="mut">None yet</small>}{x.gifts.map((g) => <Row key={g.id}><b style={{ flex: 1 }}>{g.code}</b><small>{g.who} {g.date}</small><small>of {money(g.amount)}</small><b>{money(g.balance)}</b><button className="btn bad" onClick={() => setX((s) => ({ gifts: s.gifts.filter((z) => z.id !== g.id) }))}>Delete</button></Row>)}</Box>
    </div>
  )
}

export function Coupons() {
  const x = useX()
  const [f, setF] = useState({ code: '', type: '%', value: '', min: '', exp: '' })
  const [t, setT] = useState({ code: '', sub: '' })
  const [m, setM] = useState('')
  const add = () => { if (!f.code.trim() || num(f.value) <= 0) return; setX((s) => ({ coupons: [{ id: uid(), code: f.code.trim().toUpperCase(), type: f.type, value: num(f.value), min: num(f.min), exp: f.exp, on: true, used: 0 }, ...s.coupons] })); setF({ code: '', type: '%', value: '', min: '', exp: '' }) }
  const test = () => {
    const c = x.coupons.find((z) => z.code === t.code.trim().toUpperCase()); const sub = num(t.sub)
    if (!c || !c.on) return setM('Invalid or inactive code')
    if (c.exp && c.exp < day()) return setM('Expired')
    if (sub < c.min) return setM('Minimum spend ' + money(c.min))
    const d = Math.min(sub, c.type === '%' ? r2((sub * c.value) / 100) : c.value)
    setX((s) => ({ coupons: s.coupons.map((z) => (z.id === c.id ? { ...z, used: z.used + 1 } : z)) })); setM('Valid. Discount ' + money(d) + ', pay ' + money(sub - d))
  }
  return (
    <div className="grid">
      <Box t="New coupon"><div className="row2"><In placeholder="Code" value={f.code} onChange={(v) => setF({ ...f, code: v.target.value })} /><Sel value={f.type} onChange={(v) => setF({ ...f, type: v.target.value })}><option value="%">Percent %</option><option value="fix">Fixed amount</option></Sel><In type="number" placeholder="Value" value={f.value} onChange={(v) => setF({ ...f, value: v.target.value })} /><In type="number" placeholder="Min spend" value={f.min} onChange={(v) => setF({ ...f, min: v.target.value })} /><In type="date" value={f.exp} onChange={(v) => setF({ ...f, exp: v.target.value })} /><button className="btn pri" onClick={add}>Add</button></div></Box>
      <Box t="Test a code"><div className="row2"><In placeholder="Code" value={t.code} onChange={(v) => setT({ ...t, code: v.target.value })} /><In type="number" placeholder="Subtotal" value={t.sub} onChange={(v) => setT({ ...t, sub: v.target.value })} /><button className="btn pri" onClick={test}>Apply</button></div><Msg m={m} /></Box>
      <Box t="Coupons">{x.coupons.length === 0 && <small className="mut">None yet</small>}{x.coupons.map((c) => <Row key={c.id}><b style={{ flex: 1 }}>{c.code}</b><small>{c.type === '%' ? c.value + '%' : money(c.value)} · min {money(c.min)} · {c.exp || 'no expiry'} · used {c.used}</small><button className={'btn' + (c.on ? ' on' : '')} onClick={() => setX((s) => ({ coupons: s.coupons.map((z) => (z.id === c.id ? { ...z, on: !z.on } : z)) }))}>{c.on ? 'Active' : 'Off'}</button><button className="btn bad" onClick={() => setX((s) => ({ coupons: s.coupons.filter((z) => z.id !== c.id) }))}>Delete</button></Row>)}</Box>
    </div>
  )
}

export function Serials() {
  const st = useStore()
  const [q, setQ] = useState('')
  const k = q.trim().toLowerCase()
  const inv = k ? st.products.filter((p) => JSON.stringify(p.lots || []).toLowerCase().includes(k) || (p.sku || '').toLowerCase().includes(k) || (p.barcode || '').toLowerCase().includes(k)) : []
  const sold = k ? st.orders.filter((o) => JSON.stringify(o.items || []).toLowerCase().includes(k)).slice(0, 50) : []
  return (
    <div className="grid">
      <Box t="Serial / batch lookup"><In placeholder="Serial, batch, SKU or barcode" value={q} onChange={(v) => setQ(v.target.value)} /></Box>
      <Box t={'In stock (' + inv.length + ')'}>{inv.map((p) => <Row key={p.id}><b style={{ flex: 1 }}>{p.name}</b><small>{(p.lots || []).filter((l) => JSON.stringify(l).toLowerCase().includes(k)).map((l) => JSON.stringify(l)).join(' ')}</small></Row>)}</Box>
      <Box t={'Sold in orders (' + sold.length + ')'}>{sold.map((o) => <Row key={o.id || o.no}><b style={{ flex: 1 }}>Order {o.no}</b><small>{new Date(o.date).toLocaleString()}</small><small>{o.customerName || 'Walk-in'}</small><b>{money(o.total)}</b></Row>)}</Box>
    </div>
  )
}

export function Rewards() {
  const x = useX()
  const st = useStore()
  const [rw, setRw] = useState({ name: '', pts: '' })
  const [c, setC] = useState({ cust: '', pts: '', why: '' })
  const [sel, setSel] = useState('')
  const [m, setM] = useState('')
  const cu = st.customers.find((z) => z.id === c.cust)
  const adj = (d) => { if (!cu || !d) return; setState((s) => ({ customers: s.customers.map((z) => (z.id === cu.id ? { ...z, points: Math.max(0, (z.points || 0) + d) } : z)) })); setX((s) => ({ rlog: [{ id: uid(), date: new Date().toISOString(), who: cu.name, d, why: c.why || 'Adjustment' }, ...s.rlog].slice(0, 300) })); setC({ ...c, pts: '', why: '' }); setM('Done') }
  const redeem = () => { const r = x.rewards.find((z) => z.id === sel); if (!cu || !r) return; if ((cu.points || 0) < r.pts) return setM('Not enough points'); setState((s) => ({ customers: s.customers.map((z) => (z.id === cu.id ? { ...z, points: z.points - r.pts } : z)) })); setX((s) => ({ rlog: [{ id: uid(), date: new Date().toISOString(), who: cu.name, d: -r.pts, why: 'Reward: ' + r.name }, ...s.rlog].slice(0, 300) })); setM('Redeemed ' + r.name) }
  return (
    <div className="grid">
      <Box t="Reward catalog"><div className="row2"><In placeholder="Reward (e.g. Free coffee)" value={rw.name} onChange={(v) => setRw({ ...rw, name: v.target.value })} /><In type="number" placeholder="Points cost" value={rw.pts} onChange={(v) => setRw({ ...rw, pts: v.target.value })} /><button className="btn pri" onClick={() => { if (!rw.name.trim() || num(rw.pts) <= 0) return; setX((s) => ({ rewards: [...s.rewards, { id: uid(), name: rw.name.trim(), pts: num(rw.pts) }] })); setRw({ name: '', pts: '' }) }}>Add</button></div>{x.rewards.map((r) => <Row key={r.id}><b style={{ flex: 1 }}>{r.name}</b><small>{r.pts} pts</small><button className="btn bad" onClick={() => setX((s) => ({ rewards: s.rewards.filter((z) => z.id !== r.id) }))}>Delete</button></Row>)}</Box>
      <Box t="Customer points">
        <Sel value={c.cust} onChange={(v) => setC({ ...c, cust: v.target.value })}><option value="">Select customer</option>{st.customers.map((z) => <option key={z.id} value={z.id}>{z.name} ({z.points || 0} pts)</option>)}</Sel>
        <div className="row2"><In type="number" placeholder="Points" value={c.pts} onChange={(v) => setC({ ...c, pts: v.target.value })} /><In placeholder="Reason" value={c.why} onChange={(v) => setC({ ...c, why: v.target.value })} /><button className="btn pri" onClick={() => adj(num(c.pts))}>Add</button><button className="btn bad" onClick={() => adj(-num(c.pts))}>Deduct</button></div>
        <div className="row2"><Sel value={sel} onChange={(v) => setSel(v.target.value)}><option value="">Select reward</option>{x.rewards.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.pts})</option>)}</Sel><button className="btn pri" onClick={redeem}>Redeem reward</button></div><Msg m={m} />
      </Box>
      <Box t="Points log">{x.rlog.slice(0, 50).map((l) => <Row key={l.id}><b style={{ flex: 1 }}>{l.who}</b><small>{l.why}</small><b>{l.d > 0 ? '+' : ''}{l.d}</b></Row>)}</Box>
    </div>
  )
}

const C39 = { 0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw', 5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn', A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn', K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn', U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn', $: 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn' }
export function Bar({ v, h = 40 }) {
  const t = '*' + String(v).toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '') + '*'
  let x = 0; const r = []
  ;[...t].forEach((ch) => { [...C39[ch]].forEach((w, i) => { const wd = w === 'w' ? 3 : 1; if (i % 2 === 0) r.push(<rect key={x} x={x} y="0" width={wd} height={h} fill="#000" />); x += wd }); x += 1 })
  return <svg viewBox={'0 0 ' + x + ' ' + h} preserveAspectRatio="none" style={{ width: '100%', height: h }}>{r}</svg>
}
export function Labels() {
  const st = useStore()
  const [q, setQ] = useState('')
  const [pick, setPick] = useState({})
  const [w, setW] = useState('50')
  const list = st.products.filter((p) => !q || (p.name + ' ' + (p.sku || '') + ' ' + (p.barcode || '')).toLowerCase().includes(q.toLowerCase()))
  const chosen = st.products.filter((p) => pick[p.id] > 0)
  return (
    <div className="grid">
      <Box t="Barcode labels"><div className="row2"><In placeholder="Search products" value={q} onChange={(v) => setQ(v.target.value)} /><Sel value={w} onChange={(v) => setW(v.target.value)}><option value="40">40 mm wide</option><option value="50">50 mm wide</option><option value="60">60 mm wide</option></Sel><button className="btn pri" disabled={!chosen.length} onClick={() => window.print()}>Print ({chosen.reduce((a, p) => a + pick[p.id], 0)})</button></div>
        {list.slice(0, 80).map((p) => <Row key={p.id}><b style={{ flex: 1 }}>{p.name}</b><small>{p.barcode || p.sku || 'no code'}</small><In style={{ width: 70 }} type="number" min="0" placeholder="Copies" value={pick[p.id] || ''} onChange={(v) => setPick({ ...pick, [p.id]: Math.max(0, parseInt(v.target.value, 10) || 0) })} /></Row>)}
      </Box>
      <div className="lblprint">{chosen.flatMap((p) => Array.from({ length: pick[p.id] }, (_, i) => (p.barcode || p.sku) ? <div key={p.id + i} style={{ width: w + 'mm', padding: '2mm', border: '1px dashed #999', fontFamily: 'sans-serif', fontSize: 10, color: '#000', background: '#fff', breakInside: 'avoid' }}><div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>{p.name}</div><Bar v={p.barcode || p.sku} h={34} /><div style={{ textAlign: 'center' }}>{p.barcode || p.sku}</div><div style={{ fontWeight: 700 }}>{money(p.price)}</div></div> : null))}</div>
    </div>
  )
}
