import { useState, useEffect } from 'react'
import Sel from './Sel.jsx'
import Icon from './icons.jsx'
import Ic from './icons2.jsx'
import { useStore, setState, getState } from './store.js'
import { useX, setX, uid } from './xstore.js'
import { money, num, r2, dkey, isLow, qtyAt, tracked, put, mvRow, curUser, audit, MAIN } from './inv.js'
import { ono, MLABEL } from './cart.js'
import { printDoc } from './print.js'
import { Tbl } from './ui.jsx'
import { pref, setPref, applyPrefs, getSnaps, doBackup } from './fx.js'
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const sum = (a, f = (o) => o.total) => r2(a.reduce((s, o) => s + num(f(o)), 0))
const day = (st, d) => st.orders.filter((o) => !o.voided && dkey(o.date) === dkey(d))
const Shell = ({ t, close, children, w = 520 }) => (
  <div className="overlay" style={{ zIndex: 9500 }} onClick={close}>
    <div className="modal raised" style={{ width: 'min(94vw,' + w + 'px)', maxWidth: 'none', maxHeight: '94dvh', overflow: 'auto', alignContent: 'start' }} onClick={(e) => e.stopPropagation()}>
      <div className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><h2>{t}</h2><button className="btn" style={{ flex: 'none' }} onClick={close}>Close</button></div>
      {children}
    </div>
  </div>
)
const Row = ({ a, b, big }) => <div className={'sumline' + (big ? ' big' : '')}><span>{a}</span><span>{b}</span></div>

export function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 15000); return () => clearInterval(i) }, [])
  return <span className="clk"><b>{t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b><small>{t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</small></span>
}

export function Bell({ go }) {
  const st = useStore()
  const [o, setO] = useState(false)
  const low = st.products.filter((p) => isLow(p, st))
  const unpaid = st.orders.filter((x) => !x.voided && x.balance > 0)
  const res = st.reservations.filter((r) => r.status === 'open' && r.pickup && r.pickup <= dkey(new Date()))
  const n = low.length + unpaid.length + res.length + st.parked.length
  const nav = (p) => { setO(false); go(p) }
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn ib" onClick={() => setO(!o)} aria-label="Alerts"><Ic n="bell" />{n > 0 && <i className="bdg">{n}</i>}</button>
      {o && <><div className="popbg" onClick={() => setO(false)} /><div className="pop raised">
        {n === 0 && <small className="mut">All clear</small>}
        {low.length > 0 && <button className="btn" onClick={() => nav('manage')}>{low.length} product(s) low on stock</button>}
        {unpaid.length > 0 && <button className="btn" onClick={() => nav('orders')}>{unpaid.length} order(s) with balance · {money(sum(unpaid, (x) => x.balance))}</button>}
        {res.length > 0 && <button className="btn" onClick={() => nav('hold')}>{res.length} reservation(s) due for pickup</button>}
        {st.parked.length > 0 && <button className="btn" onClick={() => nav('hold')}>{st.parked.length} parked sale(s)</button>}
      </div></>}
    </div>
  )
}

export function Home({ go }) {
  const st = useStore()
  const now = new Date(); const yd = new Date(); yd.setDate(yd.getDate() - 1)
  const os = day(st, now)
  const sales = sum(os), ys = sum(day(st, yd)), n = os.length
  const items = os.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0)
  const gp = r2(os.reduce((a, o) => a + num(o.net) - num(o.cogs), 0))
  const goal = num(pref('goal', '0'))
  const hrs = Array.from({ length: 24 }, (_, h) => os.filter((o) => new Date(o.date).getHours() === h).reduce((a, o) => a + o.total, 0))
  const mx = Math.max(1, ...hrs)
  const tp = {}
  os.forEach((o) => o.items.forEach((i) => { tp[i.name] = (tp[i.name] || 0) + i.qty }))
  const top = Object.entries(tp).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const cb = {}
  os.forEach((o) => { const k = o.by || 'Admin'; cb[k] = (cb[k] || 0) + o.total })
  const cs = Object.entries(cb).sort((a, b) => b[1] - a[1])
  const dlt = ys > 0 ? Math.round(((sales - ys) / ys) * 100) : null
  const stale = Date.now() - num(pref('lastbk', '0')) > 7 * 864e5
  const K = ({ a, b, c }) => <div className="raised stat"><small>{a}</small><b>{b}</b>{c && <small>{c}</small>}</div>
  return (
    <div className="grid">
      {stale && <div className="banner" onClick={() => { doBackup() }}>No backup in the last 7 days. Tap to download one now.</div>}
      <div className="row2"><button className="btn pri" onClick={() => go('cashier')}>New sale</button><button className="btn" onClick={() => go('tools')}>Shift and tools</button><button className="btn" onClick={() => go('orders')}>Orders</button></div>
      <div className="kgrid">
        <K a="Sales today" b={money(sales)} c={dlt === null ? 'no data yesterday' : (dlt >= 0 ? '+' : '') + dlt + '% vs yesterday'} />
        <K a="Orders" b={n} c={'Avg ' + money(n ? sales / n : 0)} />
        <K a="Items sold" b={items} />
        <K a="Gross profit" b={money(gp)} />
      </div>
      {goal > 0 && <div className="raised mpanel"><div className="sumline"><b>Daily goal</b><span>{money(sales)} / {money(goal)} ({Math.min(100, Math.round((sales / goal) * 100))}%)</span></div><div className="bar inset"><i style={{ width: Math.min(100, (sales / goal) * 100) + '%' }} /></div></div>}
      <div className="dgrid">
        <div className="raised mpanel"><b>Sales by hour</b><div className="hrs">{hrs.map((v, h) => <i key={h} title={h + ':00 ' + money(v)} style={{ height: (v / mx) * 100 + '%' }} />)}</div><div className="sumline"><small>0h</small><small>12h</small><small>23h</small></div></div>
        <div className="raised mpanel"><b>Top products today</b>{top.length === 0 && <small className="mut">No sales yet</small>}{top.map(([k, v]) => <Row key={k} a={k} b={v + ' sold'} />)}</div>
        <div className="raised mpanel"><b>Sales by cashier</b>{cs.length === 0 && <small className="mut">No sales yet</small>}{cs.map(([k, v]) => <Row key={k} a={k} b={money(v)} />)}</div>
      </div>
    </div>
  )
}

function Calc({ close }) {
  const [d, setD] = useState('0'); const [p, setP] = useState(null); const [op, setOp] = useState(''); const [fr, setFr] = useState(true)
  const ap = (a, b, o) => (o === '+' ? a + b : o === '-' ? a - b : o === '×' ? a * b : o === '÷' ? (b ? a / b : 0) : b)
  const dig = (k) => { if (fr) { setD(k === '.' ? '0.' : k); setFr(false) } else if (!(k === '.' && d.includes('.'))) setD(d + k) }
  const opr = (o) => { const v = parseFloat(d); const r = p !== null && op && !fr ? ap(p, v, op) : v; setP(r); setD(String(Math.round(r * 1e6) / 1e6)); setOp(o); setFr(true) }
  const eq = () => { if (p === null || !op) return; const r = ap(p, parseFloat(d), op); setD(String(Math.round(r * 1e6) / 1e6)); setP(null); setOp(''); setFr(true) }
  const clr = () => { setD('0'); setP(null); setOp(''); setFr(true) }
  return (
    <Shell t="Calculator" close={close} w={320}>
      <div className="inset cdisp">{d}</div>
      <div className="calc">
        {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', 'C', '+'].map((k) => <button key={k} className="btn" onClick={() => (k === 'C' ? clr() : '÷×-+'.includes(k) ? opr(k) : dig(k))}>{k}</button>)}
        <button className="btn pri" style={{ gridColumn: 'span 4' }} onClick={eq}>=</button>
      </div>
    </Shell>
  )
}

function Shift({ close }) {
  const st = useStore(); const x = useX(); const sh = x.shift
  const [fl, setFl] = useState(''); const [cn, setCn] = useState(''); const [res, setRes] = useState(null)
  const os = sh ? st.orders.filter((o) => !o.voided && o.date >= sh.start) : []
  const cashIn = sum(os, (o) => (o.payments || [{ method: o.method, amount: o.paid ?? o.total }]).filter((p) => p.method === 'cash').reduce((a, p) => a + num(p.amount), 0))
  const log = sh ? st.cashlog.filter((c) => c.date >= sh.start) : []
  const inn = sum(log.filter((c) => c.type === 'in'), (c) => c.amount)
  const out = sum(log.filter((c) => c.type === 'out'), (c) => c.amount)
  const exp = sh ? sum(st.expenses.filter((e) => e.date >= sh.start && (e.method || 'cash') === 'cash'), (e) => e.amount) : 0
  const expected = r2(num(sh && sh.float) + cashIn + inn - out - exp)
  const open = () => { setX({ shift: { start: new Date().toISOString(), float: num(fl), by: curUser().name } }); audit('Shift opened', money(num(fl))) }
  const shut = () => {
    if (cn === '') return window.alert('Enter the counted cash')
    const rec = { ...sh, end: new Date().toISOString(), sales: sum(os), orders: os.length, expected, counted: num(cn), diff: r2(num(cn) - expected) }
    setX((s) => ({ shift: null, shifts: [rec, ...(s.shifts || [])].slice(0, 200) }))
    audit('Shift closed', 'Diff ' + money(rec.diff)); setRes(rec)
  }
  if (res) return (
    <Shell t="Shift closed" close={close}>
      <div className="sumbox inset"><Row a="Orders" b={res.orders} /><Row a="Sales" b={money(res.sales)} /><Row a="Expected cash" b={money(res.expected)} /><Row a="Counted" b={money(res.counted)} /><Row big a={res.diff === 0 ? 'Balanced' : res.diff > 0 ? 'Over' : 'Short'} b={money(Math.abs(res.diff))} /></div>
    </Shell>
  )
  return (
    <Shell t="Shift and cash count" close={close}>
      {!sh ? (<>
        <input className="input" type="number" inputMode="decimal" placeholder="Opening float" value={fl} onChange={(e) => setFl(e.target.value)} />
        <button className="btn pri" onClick={open}>Open shift</button>
      </>) : (<>
        <small className="mut">Opened {new Date(sh.start).toLocaleString()} by {sh.by}</small>
        <div className="sumbox inset"><Row a="Orders" b={os.length} /><Row a="Sales" b={money(sum(os))} /><Row a="Opening float" b={money(sh.float)} /><Row a="Cash sales" b={money(cashIn)} /><Row a="Cash in / out" b={money(inn) + ' / ' + money(out)} /><Row a="Cash expenses" b={money(exp)} /><Row big a="Expected in drawer" b={money(expected)} /></div>
        <input className="input" type="number" inputMode="decimal" placeholder="Counted cash" value={cn} onChange={(e) => setCn(e.target.value)} />
        <button className="btn pri" onClick={shut}>Close shift</button>
      </>)}
      {(x.shifts || []).slice(0, 3).map((s, i) => <small key={i} className="mut">{new Date(s.end).toLocaleDateString()} · {money(s.sales)} · diff {money(s.diff)}</small>)}
    </Shell>
  )
}

function Drawer({ close }) {
  const st = useStore()
  const [t, setT] = useState('in'); const [a, setA] = useState(''); const [n, setN] = useState('')
  const go = () => {
    if (num(a) <= 0) return
    setState((s) => ({ cashlog: [{ id: uid(), date: new Date().toISOString(), type: t, amount: num(a), note: n || 'Cash ' + t }, ...s.cashlog] }))
    audit('Cash ' + t, money(num(a)) + ' ' + n); setA(''); setN('')
  }
  return (
    <Shell t="Cash in / out" close={close}>
      <div className="row2"><button className={'btn' + (t === 'in' ? ' on' : '')} onClick={() => setT('in')}>Cash in</button><button className={'btn' + (t === 'out' ? ' on' : '')} onClick={() => setT('out')}>Cash out</button></div>
      <input className="input" type="number" inputMode="decimal" placeholder="Amount" value={a} onChange={(e) => setA(e.target.value)} />
      <input className="input" placeholder="Note" value={n} onChange={(e) => setN(e.target.value)} />
      <button className="btn pri" onClick={go}>Save</button>
      {st.cashlog.slice(0, 6).map((c) => <Row key={c.id} a={new Date(c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + (c.note || c.type)} b={(c.type === 'in' ? '+' : '-') + money(c.amount)} />)}
    </Shell>
  )
}

function ZRep({ close }) {
  const st = useStore()
  const [d, setD] = useState(dkey(new Date()))
  const all = st.orders.filter((o) => dkey(o.date) === d)
  const os = all.filter((o) => !o.voided); const vd = all.filter((o) => o.voided)
  const bm = {}
  os.forEach((o) => (o.payments || [{ method: o.method, amount: o.paid ?? o.total }]).forEach((p) => { const k = MLABEL[p.method] || p.method; bm[k] = r2((bm[k] || 0) + num(p.amount)) }))
  const cl = st.cashlog.filter((c) => dkey(c.date) === d)
  const rows = [['Orders', String(os.length)], ['Gross sales', money(sum(os, (o) => o.sub))], ['Discounts', '-' + money(sum(os, (o) => o.disc))], ['Tax', money(sum(os, (o) => o.tax))], ['Net total', money(sum(os))], ...Object.entries(bm).map(([k, v]) => ['Paid: ' + k, money(v)]), ['Voided', vd.length + ' / ' + money(sum(vd))], ['Cash in', money(sum(cl.filter((c) => c.type === 'in'), (c) => c.amount))], ['Cash out', money(sum(cl.filter((c) => c.type === 'out'), (c) => c.amount))], ['Unpaid balance', money(sum(os, (o) => o.balance || 0))]]
  const pr = () => printDoc('<div class="c b">' + esc(st.settings.name) + '</div><div class="c">Z REPORT ' + d + '</div><hr>' + rows.map(([a, b]) => '<div class="r"><span>' + esc(a) + '</span><span>' + esc(b) + '</span></div>').join('') + '<hr><div class="c">Printed ' + new Date().toLocaleString() + '</div>', '58mm auto', 'body{width:58mm;padding:3mm;font:11px/1.4 monospace;color:#000}.c{text-align:center}.b{font-weight:700}.r{display:flex;justify-content:space-between;gap:6px}hr{border:0;border-top:1px dashed #000}')
  return (
    <Shell t="Z report (daily close)" close={close}>
      <input className="input" type="date" value={d} onChange={(e) => setD(e.target.value)} />
      <div className="sumbox inset">{rows.map(([a, b]) => <Row key={a} a={a} b={b} />)}</div>
      <button className="btn pri" onClick={pr}>Print</button>
    </Shell>
  )
}

function Refund({ close }) {
  const st = useStore()
  const [no, setNo] = useState(''); const [m, setM] = useState('')
  const k = parseInt(no.replace(/\D/g, ''), 10)
  const o = k ? st.orders.find((z) => Number(z.no) === k) : null
  const go = () => {
    if (!o || o.voided) return
    if (!window.confirm('Void ' + ono(o.no) + ' and return items to stock?')) return
    const wh = o.whId || st.settings.activeWh || MAIN
    const moves = []
    const prods = st.products.map((p) => { const l = o.items.find((i) => i.id === p.id); if (!l || !tracked(p)) return p; moves.push(mvRow('return', p, wh, l.qty, 'Void ' + ono(o.no))); return put(p, wh, l.qty, '', '') })
    const cash = (o.payments || [{ method: o.method, amount: o.paid ?? o.total }]).filter((p) => p.method === 'cash').reduce((a, p) => a + num(p.amount), 0)
    setState((s) => ({
      orders: s.orders.map((z) => (z.id === o.id ? { ...z, voided: true, voidAt: new Date().toISOString(), voidBy: curUser().name } : z)),
      products: prods, moves: [...moves, ...s.moves].slice(0, 5000),
      cashlog: cash > 0 ? [{ id: uid(), date: new Date().toISOString(), type: 'out', amount: cash, note: 'Void ' + ono(o.no) }, ...s.cashlog] : s.cashlog,
      customers: o.customerId ? s.customers.map((c) => (c.id === o.customerId ? { ...c, points: Math.max(0, (c.points || 0) - (o.earned || 0) + (o.pts || 0)) } : c)) : s.customers,
    }))
    audit('Order voided', ono(o.no) + ' ' + money(o.total)); setM('Voided ' + ono(o.no))
  }
  return (
    <Shell t="Void / refund order" close={close}>
      <input className="input" placeholder="Order number" value={no} onChange={(e) => { setNo(e.target.value); setM('') }} />
      {no && !o && <small className="mut">Order not found</small>}
      {o && <div className="sumbox inset">{o.items.map((i, j) => <Row key={j} a={i.qty + ' x ' + i.name} b={money(i.qty * i.price)} />)}<Row big a="Total" b={money(o.total)} /></div>}
      {o && o.voided && <small className="mut">Already voided</small>}
      {o && !o.voided && <button className="btn bad" onClick={go}>Void order and restock</button>}
      <small className="mut">{m}</small>
    </Shell>
  )
}

function Restock({ close }) {
  const st = useStore()
  const [id, setId] = useState(''); const [q, setQ] = useState(''); const [b, setB] = useState(''); const [e, setE] = useState(''); const [m, setM] = useState('')
  const wh = st.settings.activeWh || MAIN
  const go = () => {
    const p = st.products.find((z) => z.id === id); const n = Math.floor(num(q))
    if (!p || n < 1) return setM('Pick a product and quantity')
    setState((s) => ({ products: s.products.map((z) => (z.id === id ? put(z, wh, n, b.trim(), e) : z)), moves: [mvRow('restock', p, wh, n, 'Quick restock'), ...s.moves].slice(0, 5000) }))
    audit('Quick restock', p.name + ' +' + n); setM('Added ' + n + ' to ' + p.name); setQ('')
  }
  return (
    <Shell t="Quick restock" close={close}>
      <Sel className="input" value={id} onChange={(ev) => setId(ev.target.value)}><option value="">Select product</option>{st.products.filter(tracked).map((p) => <option key={p.id} value={p.id}>{p.name} ({qtyAt(p, wh)})</option>)}</Sel>
      <input className="input" type="number" inputMode="numeric" placeholder="Quantity to add" value={q} onChange={(ev) => setQ(ev.target.value)} />
      <div className="row2"><input className="input" placeholder="Batch (optional)" value={b} onChange={(ev) => setB(ev.target.value)} /><input className="input" type="date" value={e} onChange={(ev) => setE(ev.target.value)} /></div>
      <button className="btn pri" onClick={go}>Add stock</button>
      <small className="mut">{m}</small>
    </Shell>
  )
}

function Expense({ close }) {
  const [a, setA] = useState(''); const [c, setC] = useState(''); const [d, setD] = useState(''); const [m, setM] = useState('')
  const go = () => {
    if (num(a) <= 0) return setM('Enter an amount')
    setState((s) => ({ expenses: [{ id: uid(), date: new Date().toISOString(), cat: c || 'General', desc: d, amount: num(a), method: 'cash' }, ...s.expenses] }))
    audit('Expense', money(num(a)) + ' ' + (d || c)); setM('Saved'); setA(''); setD('')
  }
  return (
    <Shell t="Quick expense" close={close}>
      <input className="input" type="number" inputMode="decimal" placeholder="Amount" value={a} onChange={(e) => setA(e.target.value)} />
      <input className="input" placeholder="Category" value={c} onChange={(e) => setC(e.target.value)} />
      <input className="input" placeholder="Description" value={d} onChange={(e) => setD(e.target.value)} />
      <button className="btn pri" onClick={go}>Save expense</button>
      <small className="mut">{m}</small>
    </Shell>
  )
}

function Reorder({ close }) {
  const st = useStore()
  const th = (p) => (num(p.reorder) > 0 ? num(p.reorder) : num(st.settings.lowStock))
  const rows = st.products.filter((p) => isLow(p, st))
  return (
    <Shell t="Reorder list" close={close} w={640}>
      <Tbl name="reorder-list" rows={rows} cols={[['Product', (p) => p.name], ['SKU', (p) => p.sku || ''], ['Stock', (p) => qtyAt(p)], ['Reorder at', (p) => th(p)], ['Suggested', (p) => Math.max(1, th(p) * 2 - qtyAt(p))]]} />
    </Shell>
  )
}

function Notes({ close }) {
  const x = useX()
  return (
    <Shell t="Notes" close={close}>
      <textarea className="input" rows="8" placeholder="Shift handover, reminders, supplier calls..." value={x.notes || ''} onChange={(e) => setX({ notes: e.target.value })} />
    </Shell>
  )
}

function Snap({ close }) {
  const [m, setM] = useState('')
  const L = getSnaps()
  const restore = (sn) => {
    if (!window.confirm('Replace current data with the ' + sn.d + ' snapshot? Product images are kept.')) return
    try {
      const j = JSON.parse(sn.data)
      setState((s) => ({ ...j, settings: { ...s.settings, ...j.settings }, products: (j.products || []).map((p) => ({ ...p, image: (s.products.find((c) => c.id === p.id) || {}).image || '' })) }))
      setM('Restored ' + sn.d)
    } catch (e) { setM('Snapshot is damaged') }
  }
  return (
    <Shell t="Backups and snapshots" close={close}>
      <button className="btn pri" onClick={() => { doBackup(); setM('Backup downloaded') }}>Download full backup (JSON)</button>
      <small className="mut">A snapshot is saved automatically once a day (last 2 kept, without product images).</small>
      {L.length === 0 && <small className="mut">No snapshots yet</small>}
      {L.map((sn) => <div key={sn.d} className="row2"><span>{sn.d} · {Math.round(sn.data.length / 1024)} KB</span><button className="btn bad" onClick={() => restore(sn)}>Restore</button></div>)}
      <small className="mut">{m}</small>
    </Shell>
  )
}

function Prefs({ close }) {
  const [, f] = useState(0)
  const set = (k, v) => { setPref(k, v); applyPrefs(); f((n) => n + 1) }
  const tg = (k, a, b) => set(k, pref(k, a) === a ? b : a)
  return (
    <Shell t="Preferences" close={close} w={420}>
      <button className="btn" onClick={() => tg('theme', 'light', 'dark')}>Theme: {pref('theme', 'light')}</button>
      <button className="btn" onClick={() => tg('dens', 'cozy', 'compact')}>Density: {pref('dens', 'cozy')}</button>
      <button className="btn" onClick={() => tg('snd', '1', '0')}>Beep and vibrate: {pref('snd', '1') === '1' ? 'on' : 'off'}</button>
      <label className="lbl">Daily sales goal<input className="input" type="number" inputMode="decimal" value={pref('goal', '')} onChange={(e) => set('goal', e.target.value)} /></label>
      <label className="lbl">Auto-lock Management after (minutes, 0 = off)<input className="input" type="number" inputMode="numeric" value={pref('idle', '0')} onChange={(e) => set('idle', e.target.value)} /></label>
    </Shell>
  )
}

const TL = [['shift', 'Shift and cash count', 'clock'], ['drawer', 'Cash in / out', 'coin'], ['z', 'Z report', 'report'], ['refund', 'Void / refund', 'box'], ['restock', 'Quick restock', 'warehouse'], ['expense', 'Quick expense', 'tag'], ['reorder', 'Reorder list', 'search'], ['calc', 'Calculator', 'sliders'], ['notes', 'Notes', 'star'], ['snap', 'Backups', 'db'], ['prefs', 'Preferences', 'cog'], ['pal', 'Keypad, price check, exchange', 'register']]
export function ToolsPage() {
  const [t, setT] = useState(null)
  const close = () => setT(null)
  const pick = (k) => { if (k === 'pal') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })); else setT(k) }
  return (
    <>
      <div className="tcards">{TL.map(([k, l, i]) => <button key={k} className="raised tcard" onClick={() => pick(k)}><Icon n={i} s={24} />{l}</button>)}</div>
      {t === 'shift' && <Shift close={close} />}
      {t === 'drawer' && <Drawer close={close} />}
      {t === 'z' && <ZRep close={close} />}
      {t === 'refund' && <Refund close={close} />}
      {t === 'restock' && <Restock close={close} />}
      {t === 'expense' && <Expense close={close} />}
      {t === 'reorder' && <Reorder close={close} />}
      {t === 'calc' && <Calc close={close} />}
      {t === 'notes' && <Notes close={close} />}
      {t === 'snap' && <Snap close={close} />}
      {t === 'prefs' && <Prefs close={close} />}
    </>
  )
}
