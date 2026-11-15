import { useEffect, useState } from 'react'
import Sel from './Sel.jsx'
import Icon from './icons.jsx'
import { useStore, setState, getState } from './store.js'
import { MTABS, setMgr } from './mgr.js'
import { money, num, r2, put, take, tracked, qtyAt, MAIN, audit } from './inv.js'
import { ono } from './cart.js'
import { setX, uid } from './xstore.js'
const awh = () => getState().settings.activeWh || MAIN
const Shell = ({ t, close, children }) => (
  <div className="overlay" style={{ zIndex: 9500 }} onClick={close}>
    <div className="modal raised" style={{ width: 'min(94vw,560px)', maxHeight: '96%', overflow: 'auto', display: 'grid', gap: 8, alignContent: 'start' }} onClick={(e) => e.stopPropagation()}>
      <div className="row2" style={{ alignItems: 'center' }}><h2 style={{ margin: 0 }}>{t}</h2><button className="btn" onClick={close}>Close</button></div>
      {children}
    </div>
  </div>
)
function Keypad({ close }) {
  const st = useStore()
  const [f, setF] = useState('amt')
  const [v, setV] = useState({ amt: '', rec: '' })
  const [method, setMethod] = useState('cash')
  const [done, setDone] = useState('')
  const key = (k) => setV((o) => { let c = o[f]; if (k === 'C') c = ''; else if (k === '<') c = c.slice(0, -1); else if (k === '.') { if (!c.includes('.')) c += c ? '.' : '0.' } else c += k; return { ...o, [f]: c } })
  const t = num(st.settings.tax); const amt = num(v.amt)
  const tax = st.settings.taxIncl ? r2((amt * t) / (100 + t)) : r2((amt * t) / 100)
  const total = st.settings.taxIncl ? amt : r2(amt + tax)
  const change = Math.max(0, num(v.rec) - total)
  const ok = amt > 0 && (method !== 'cash' || num(v.rec) >= total)
  const pay = () => {
    const now = new Date().toISOString()
    const no = Math.max(0, ...getState().orders.map((o) => num(o.no))) + 1
    const order = { id: uid(), no, date: now, items: [{ id: 'quick', name: 'Quick sale', qty: 1, price: amt, cost: 0 }], total, tax, net: r2(total - tax), cogs: 0, method, paid: total, received: method === 'cash' ? num(v.rec) : total, balance: 0, payments: [{ id: uid(), date: now, amount: total, method, note: '' }], by: 'Admin', customerName: '' }
    setState((s) => ({ orders: [order, ...s.orders] })); audit('Quick sale', ono(no) + ' ' + money(total)); setDone('Saved ' + ono(no) + (method === 'cash' ? ', change ' + money(change) : '')); setV({ amt: '', rec: '' })
  }
  return (
    <Shell t="Quick sale keypad" close={close}>
      <div className="row2"><button className={'btn' + (f === 'amt' ? ' on' : '')} onClick={() => setF('amt')}>Amount: {v.amt || '0'}</button><button className={'btn' + (f === 'rec' ? ' on' : '')} onClick={() => setF('rec')} disabled={method !== 'cash'}>Received: {v.rec || '0'}</button></div>
      <div className="row2"><button className={'btn' + (method === 'cash' ? ' on' : '')} onClick={() => setMethod('cash')}>Cash</button><button className={'btn' + (method === 'card' ? ' on' : '')} onClick={() => { setMethod('card'); setF('amt') }}>Card</button></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>{['7', '8', '9', 'C', '4', '5', '6', '<', '1', '2', '3', '.', '0', '00'].map((k) => <button key={k} className="btn" onClick={() => key(k)}>{k === '<' ? '⌫' : k}</button>)}<button className="btn pri" style={{ gridColumn: 'span 2' }} disabled={!ok} onClick={pay}>Charge {money(total)}</button></div>
      <small className="mut">Tax {money(tax)} · {method === 'cash' ? 'Change ' + money(change) : 'Card'} {done}</small>
    </Shell>
  )
}
function Price({ close }) {
  const st = useStore()
  const [q, setQ] = useState('')
  const k = q.trim().toLowerCase()
  const list = k ? st.products.filter((p) => (p.name + ' ' + (p.sku || '') + ' ' + (p.barcode || '')).toLowerCase().includes(k)).slice(0, 12) : []
  return (
    <Shell t="Price checker" close={close}>
      <input className="input" autoFocus placeholder="Name, SKU or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.map((p) => <div key={p.id} className="raised prow" style={{ display: 'grid', gap: 2 }}><b>{p.name}</b><span style={{ fontSize: 20, fontWeight: 800 }}>{money(p.price)}</span><small className="mut">{(st.levels || []).filter((l) => p.prices && p.prices[l.id]).map((l) => l.name + ' ' + money(p.prices[l.id])).join(' · ')}</small><small>{tracked(p) ? qtyAt(p, awh()) + ' in stock' : 'Stock not tracked'}{p.sku ? ' · ' + p.sku : ''}</small></div>)}
      {k && !list.length && <small className="mut">No match</small>}
    </Shell>
  )
}
function Exchange({ close }) {
  const st = useStore()
  const [no, setNo] = useState('')
  const [it, setIt] = useState('')
  const [rq, setRq] = useState('1')
  const [np, setNp] = useState('')
  const [nq, setNq] = useState('1')
  const [m, setM] = useState('')
  const key = no.trim().toLowerCase()
  const o = key ? st.orders.find((z) => String(z.no) === key.replace(/\D/g, '') || ono(z.no).toLowerCase() === key) : null
  const item = o && o.items.find((z) => z.id === it)
  const prod = st.products.find((p) => p.id === np)
  const diff = item && prod ? r2(prod.price * num(nq) - item.price * num(rq)) : 0
  const go = () => {
    if (!item || !prod) return
    if (num(rq) < 1 || num(rq) > item.qty) return setM('Return qty must be 1 to ' + item.qty)
    const wh = awh()
    setState((s) => ({
      products: s.products.map((p) => { if (p.id === item.id && tracked(p)) p = put(p, wh, num(rq), '', ''); if (p.id === prod.id && tracked(p)) p = take(p, num(nq), wh).p; return p }),
      cashlog: diff !== 0 ? [{ id: uid(), date: new Date().toISOString(), type: diff > 0 ? 'in' : 'out', amount: Math.abs(diff), note: 'Exchange ' + ono(o.no) }, ...(s.cashlog || [])] : s.cashlog,
    }))
    setX((s) => ({ xch: [{ id: uid(), date: new Date().toISOString(), order: o.no, out: item.name, rq: num(rq), inn: prod.name, nq: num(nq), diff }, ...s.xch] }))
    audit('Exchange', ono(o.no) + ' ' + item.name + ' -> ' + prod.name); setM('Exchange saved. ' + (diff > 0 ? 'Collect ' : 'Refund ') + money(Math.abs(diff))); setIt(''); setNp('')
  }
  return (
    <Shell t="Exchange" close={close}>
      <input className="input" placeholder="Order number" value={no} onChange={(e) => setNo(e.target.value)} />
      {key && !o && <small className="mut">Order not found</small>}
      {o && <Sel value={it} onChange={(e) => setIt(e.target.value)}><option value="">Item being returned</option>{o.items.map((z) => <option key={z.id} value={z.id}>{z.name} x{z.qty} ({money(z.price)})</option>)}</Sel>}
      {item && <input className="input" type="number" min="1" placeholder="Return qty" value={rq} onChange={(e) => setRq(e.target.value)} />}
      {item && <Sel value={np} onChange={(e) => setNp(e.target.value)}><option value="">Replacement product</option>{st.products.map((p) => <option key={p.id} value={p.id}>{p.name} ({money(p.price)})</option>)}</Sel>}
      {item && prod && <input className="input" type="number" min="1" placeholder="Replacement qty" value={nq} onChange={(e) => setNq(e.target.value)} />}
      {item && prod && <div className="row2"><b>{diff >= 0 ? 'Customer pays ' : 'Refund '}{money(Math.abs(diff))}</b><button className="btn pri" onClick={go}>Confirm exchange</button></div>}
      <small className="mut">{m}</small>
    </Shell>
  )
}
function Palette({ close, go, open }) {
  const [q, setQ] = useState('')
  const cmds = [
    ...[['cashier', 'Cash Register'], ['hold', 'Parked & Reserved'], ['orders', 'Orders'], ['customers', 'Customers'], ['attend', 'Attendance'], ['manage', 'Management']].map(([k, l]) => ({ l: 'Go to ' + l, f: () => go(k) })),
    ...MTABS.map(([k, l]) => ({ l: 'Management: ' + l, f: () => { go('manage'); setMgr({ tab: k }) } })),
    { l: 'Quick sale keypad', f: () => open('keypad') }, { l: 'Price checker', f: () => open('price') }, { l: 'Exchange', f: () => open('exchange') },
  ].filter((c) => c.l.toLowerCase().includes(q.toLowerCase()))
  return (
    <Shell t="Command palette" close={close}>
      <input className="input" autoFocus placeholder="Type a command" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && cmds[0]) { close(); cmds[0].f() } }} />
      <div style={{ display: 'grid', gap: 4, maxHeight: '55vh', overflow: 'auto' }}>{cmds.map((c) => <button key={c.l} className="btn" style={{ textAlign: 'left' }} onClick={() => { close(); c.f() }}>{c.l}</button>)}</div>
    </Shell>
  )
}
export default function Tools({ go }) {
  const [t, setT] = useState(null)
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setT('pal') } }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [])
  const close = () => setT(null)
  const open = (n) => setTimeout(() => setT(n), 0)
  return (
    <>
      <button className="btn" aria-label="Commands" style={{ position: 'fixed', top: 10, right: 70, zIndex: 8000, width: 36, padding: 0, display: 'grid', placeItems: 'center' }} onClick={() => setT('pal')}><Icon n="search" s={18} /></button>
      {t === 'pal' && <Palette close={close} go={go} open={open} />}
      {t === 'keypad' && <Keypad close={close} />}
      {t === 'price' && <Price close={close} />}
      {t === 'exchange' && <Exchange close={close} />}
    </>
  )
}
