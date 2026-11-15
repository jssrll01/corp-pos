import { useState } from 'react'
import { useStore, setState } from '../store.js'
import { uid, num, r2, money, dkey, audit, inR, RANGES, curUser } from '../inv.js'
import { ono, MLABEL } from '../cart.js'
import { Tabs, Tbl, Form, Crud } from '../ui.jsx'
const entries = (st) => {
  const E = []
  st.orders.forEach((o) => (o.payments || [{ date: o.date, amount: o.paid ?? o.total, method: o.method }]).forEach((p) => { if (p.method !== 'deposit') E.push({ d: p.date, t: 'Sale ' + ono(o.no), m: MLABEL[p.method] || p.method, a: num(p.amount), c: p.method === 'cash' }) }))
  st.cashlog.forEach((c) => E.push({ d: c.date, t: c.note || 'Cash ' + c.type, m: 'Cash ' + c.type, a: c.type === 'in' ? num(c.amount) : -num(c.amount), c: true }))
  st.expenses.forEach((x) => E.push({ d: x.date, t: 'Expense: ' + (x.desc || x.cat), m: x.cat, a: -num(x.amount), c: (x.method || 'cash') === 'cash' }))
  st.purchases.forEach((p) => E.push({ d: p.date, t: 'Purchase PO#' + p.no, m: 'Supplier', a: -num(p.ip), c: (p.method || 'cash') === 'cash' }))
  return E.sort((a, b) => (a.d < b.d ? 1 : -1))
}
function Cash() {
  const st = useStore()
  const [r, setR] = useState('30')
  const E = entries(st).filter((e) => inR(e.d, r))
  const inn = E.filter((e) => e.a > 0).reduce((a, e) => a + e.a, 0)
  const out = E.filter((e) => e.a < 0).reduce((a, e) => a - e.a, 0)
  return (
    <div className="grid">
      <select className="input" value={r} onChange={(e) => setR(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <div className="ostats3">
        <div className="raised stat"><small>Cash in</small><b>{money(inn)}</b></div>
        <div className="raised stat"><small>Cash out</small><b>{money(out)}</b></div>
        <div className="raised stat"><small>Net</small><b>{money(inn - out)}</b></div>
      </div>
      <Form init={{ type: 'in', amount: '', note: '' }} fields={[{ k: 'type', l: 'Manual entry', t: 'select', o: [['in', 'Cash in'], ['out', 'Cash out']] }, { k: 'amount', l: 'Amount', t: 'number' }, { k: 'note', l: 'Note' }]}
        onSave={(d) => { if (num(d.amount) > 0) { setState((s) => ({ cashlog: [{ id: uid(), date: new Date().toISOString(), type: d.type, amount: num(d.amount), note: d.note }, ...s.cashlog] })); audit('Cash ' + d.type, money(num(d.amount)) + ' ' + d.note) } }} />
      <Tbl name="Cash flow" rows={E} cols={[['Date', (e) => dkey(e.d)], ['Description', (e) => e.t], ['Type', (e) => e.m], ['Amount', (e) => money(e.a)]]} />
    </div>
  )
}
function Closing() {
  const st = useStore()
  const td = dkey(new Date())
  const last = st.closings[0]
  const [open, setOpen] = useState(last ? String(last.counted) : '')
  const [cnt, setCnt] = useState('')
  const [note, setNote] = useState('')
  const cashNet = r2(entries(st).filter((e) => dkey(e.d) === td && e.c).reduce((a, e) => a + e.a, 0))
  const exp = r2(num(open) + cashNet)
  const v = r2(num(cnt) - exp)
  const today = st.orders.filter((o) => dkey(o.date) === td)
  const save = () => {
    if (cnt === '') return window.alert('Enter the counted cash')
    setState((s) => ({ closings: [{ id: uid(), date: new Date().toISOString(), day: td, branch: s.settings.activeBranch || 'main', opening: num(open), cashNet, expected: exp, counted: num(cnt), variance: v, sales: r2(today.reduce((a, o) => a + o.total, 0)), orders: today.length, note, by: curUser().name }, ...s.closings] }))
    audit('Daily cash closing', td + ' variance ' + money(v))
    setCnt(''); setNote('')
  }
  return (
    <div className="grid">
      <div className="raised mpanel">
        <h3 style={{ margin: 0 }}>Daily cash closing {td}</h3>
        <small className="mut">{today.length} orders · sales {money(today.reduce((a, o) => a + o.total, 0))}</small>
        <input className="input" type="number" inputMode="decimal" placeholder="Opening cash (float)" value={open} onChange={(e) => setOpen(e.target.value)} />
        <div className="sumbox inset"><div className="sumline"><span>Cash movement today</span><span>{money(cashNet)}</span></div><div className="sumline big"><span>Expected cash</span><span>{money(exp)}</span></div></div>
        <input className="input" type="number" inputMode="decimal" placeholder="Counted cash in drawer" value={cnt} onChange={(e) => setCnt(e.target.value)} />
        {cnt !== '' && <div className="sumline"><span>Variance</span><b style={{ color: v === 0 ? 'var(--ok)' : 'var(--bad)' }}>{money(v)}</b></div>}
        <input className="input" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn pri" onClick={save}>Close the day</button>
      </div>
      <Tbl name="Closings" rows={st.closings} cols={[['Day', (c) => c.day], ['Opening', (c) => money(c.opening)], ['Expected', (c) => money(c.expected)], ['Counted', (c) => money(c.counted)], ['Variance', (c) => money(c.variance)], ['Sales', (c) => money(c.sales)], ['By', (c) => c.by]]} />
    </div>
  )
}
function Expenses() {
  const st = useStore()
  const cats = st.settings.expCats.split(',').map((x) => x.trim()).filter(Boolean).map((x) => [x, x])
  const month = st.expenses.filter((e) => inR(e.date, 'month')).reduce((a, e) => a + num(e.amount), 0)
  return (
    <Crud coll="expenses" title="Expense" empty={{ date: dkey(new Date()), cat: cats[0] ? cats[0][0] : '', method: 'cash', branchId: st.settings.activeBranch || 'main' }}
      fields={[{ k: 'date', l: 'Date', t: 'date', req: true }, { k: 'cat', l: 'Category', t: 'select', o: cats }, { k: 'desc', l: 'Description', req: true }, { k: 'amount', l: 'Amount', t: 'number', req: true }, { k: 'method', l: 'Paid by', t: 'select', o: [['cash', 'Cash'], ['ewallet', 'E-Wallet'], ['bank', 'Bank']] }, { k: 'branchId', l: 'Branch', t: 'select', o: st.branches.map((b) => [b.id, b.name]) }]}
      line={(r) => r.date + ' · ' + r.cat + ' · ' + money(r.amount)}
      after={<small className="mut">Expenses this month: {money(month)}</small>} />
  )
}
function Payments() {
  const st = useStore()
  const due = st.orders.filter((o) => num(o.balance) > 0)
  const recv = (o) => {
    const a = Math.min(num(window.prompt('Amount received (balance ' + money(o.balance) + ')', o.balance)), o.balance)
    if (!(a > 0)) return
    let m = (window.prompt('Method: cash, ewallet or bank', 'cash') || 'cash').toLowerCase()
    if (!['cash', 'ewallet', 'bank'].includes(m)) m = 'cash'
    setState((s) => ({ orders: s.orders.map((x) => (x.id === o.id ? { ...x, paid: r2(num(x.paid) + a), balance: r2(x.balance - a), payments: [...(x.payments || []), { id: uid(), date: new Date().toISOString(), amount: a, method: m, note: 'Balance payment' }] } : x)) }))
    audit('Payment received', ono(o.no) + ' ' + money(a))
  }
  return (
    <div className="grid">
      <small className="mut">Outstanding: {money(due.reduce((a, o) => a + o.balance, 0))} across {due.length} order(s)</small>
      {!due.length && <p className="mut">No unpaid balances</p>}
      {due.map((o) => (
        <div key={o.id} className="raised prow">
          <div className="pinfo"><b>{ono(o.no)} {o.customerName || 'Walk-in'}</b><small>{new Date(o.date).toLocaleDateString()} · total {money(o.total)} · paid {money(o.paid)} · owes {money(o.balance)}</small></div>
          <button className="btn pri" onClick={() => recv(o)}>Receive</button>
        </div>
      ))}
    </div>
  )
}
function Calc() {
  const [c, setC] = useState({ cost: '', price: '', mk: '', mg: '' })
  const set = (p) => setC((x) => ({ ...x, ...p }))
  const cost = num(c.cost), price = num(c.price)
  const profit = price - cost
  return (
    <div className="raised mpanel">
      <h3 style={{ margin: 0 }}>Profit calculator</h3>
      <div className="row2">
        <input className="input" type="number" inputMode="decimal" placeholder="Cost" value={c.cost} onChange={(e) => set({ cost: e.target.value })} />
        <input className="input" type="number" inputMode="decimal" placeholder="Selling price" value={c.price} onChange={(e) => set({ price: e.target.value })} />
      </div>
      <div className="sumbox inset">
        <div className="sumline"><span>Profit per unit</span><span>{money(profit)}</span></div>
        <div className="sumline"><span>Markup on cost</span><span>{cost > 0 ? r2((profit / cost) * 100) + '%' : '-'}</span></div>
        <div className="sumline"><span>Margin on price</span><span>{price > 0 ? r2((profit / price) * 100) + '%' : '-'}</span></div>
      </div>
      <div className="row2">
        <input className="input" type="number" inputMode="decimal" placeholder="Target markup %" value={c.mk} onChange={(e) => set({ mk: e.target.value })} />
        <input className="input" type="number" inputMode="decimal" placeholder="Target margin %" value={c.mg} onChange={(e) => set({ mg: e.target.value })} />
      </div>
      {c.mk !== '' && cost > 0 && <div className="sumline"><span>Price for {c.mk}% markup</span><b>{money(cost * (1 + num(c.mk) / 100))}</b></div>}
      {c.mg !== '' && cost > 0 && num(c.mg) < 100 && <div className="sumline"><span>Price for {c.mg}% margin</span><b>{money(cost / (1 - num(c.mg) / 100))}</b></div>}
    </div>
  )
}
const TABS = [['cash', 'Cash flow'], ['closing', 'Daily closing'], ['expenses', 'Expenses'], ['payments', 'Payments'], ['calc', 'Profit calc']]
export default function Finance() {
  const [t, setT] = useState('cash')
  return (
    <div>
      <Tabs v={t} on={setT} items={TABS} />
      {t === 'cash' && <Cash />}
      {t === 'closing' && <Closing />}
      {t === 'expenses' && <Expenses />}
      {t === 'payments' && <Payments />}
      {t === 'calc' && <Calc />}
    </div>
  )
}
