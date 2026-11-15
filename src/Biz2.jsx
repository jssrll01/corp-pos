import { useState, useEffect, useRef, Component } from 'react'
import Sel from './Sel.jsx'
import { useStore, setState } from './store.js'
import { useX, setX, uid } from './xstore.js'
import { money, num, r2, dkey, isLow, qtyAt, tracked, take, mvRow, audit, inR, RANGES, MAIN } from './inv.js'
import { ono, METHODS, MLABEL } from './cart.js'
import { Tbl, Tabs } from './ui.jsx'
import { pref, setPref, applyPrefs, PRESETS, measure, LIMIT, planArchive, exportArchive, exportOrdersCsv, purgeArchive, importArchive, getRollup, shrinkImages, healthCheck, voidOrder, settleOrder, toast, doBackup, expiring, wakeLock } from './fx.js'
const Sh = ({ t, close, children, w = 520 }) => (
  <div className="overlay" style={{ zIndex: 9500 }} onClick={close}>
    <div className="modal raised" style={{ width: 'min(94vw,' + w + 'px)', maxWidth: 'none', maxHeight: '94dvh', overflow: 'auto', alignContent: 'start' }} onClick={(e) => e.stopPropagation()}>
      <div className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><h2>{t}</h2><button className="btn" style={{ flex: 'none' }} onClick={close}>Close</button></div>
      {children}
    </div>
  </div>
)
const R = ({ a, b, big }) => <div className={'sumline' + (big ? ' big' : '')}><span>{a}</span><span>{b}</span></div>
const sum = (a, f) => r2(a.reduce((s, o) => s + num(f(o)), 0))
const cats = (st) => [...new Set(st.products.map((p) => p.cat).filter(Boolean))]

export class Boundary extends Component {
  state = { e: null }
  static getDerivedStateFromError(e) { return { e } }
  render() {
    if (!this.state.e) return this.props.children
    return (
      <div style={{ padding: 16 }}>
        <div className="raised lockbox">
          <h2>Something went wrong</h2>
          <small className="mut">{String(this.state.e && this.state.e.message)}</small>
          <button className="btn pri" onClick={() => location.reload()}>Reload app</button>
          <button className="btn" onClick={() => doBackup()}>Download emergency backup</button>
          <button className="btn bad" onClick={() => { try { localStorage.removeItem('pos_cart'); localStorage.removeItem('pos_p_page') } catch (e) {} location.reload() }}>Clear register and reload</button>
        </div>
      </div>
    )
  }
}
export function Toaster() {
  const [l, setL] = useState([])
  useEffect(() => {
    const h = (e) => { const id = uid(); setL((x) => [...x, { id, ...e.detail }]); setTimeout(() => setL((x) => x.filter((t) => t.id !== id)), 3500) }
    window.addEventListener('pos-toast', h)
    return () => window.removeEventListener('pos-toast', h)
  }, [])
  return <div className="toasts">{l.map((t) => <div key={t.id} className={'toast ' + (t.k || '')}>{t.m}</div>)}</div>
}
export function useMeasure() {
  const st = useStore()
  const [m, setM] = useState(() => measure())
  useEffect(() => { const t = setTimeout(() => setM(measure()), 700); return () => clearTimeout(t) }, [st])
  useEffect(() => {
    const f = () => setM(measure())
    const i = setInterval(f, 30000)
    window.addEventListener('pos-save', f)
    return () => { clearInterval(i); window.removeEventListener('pos-save', f) }
  }, [])
  return m
}
export function StorageStrip({ m, onOpen }) {
  const msg = m.fail ? 'Storage is full. New changes cannot be saved on this device.' : m.pct >= 50 ? 'Storage is ' + m.pct + '% full.' : m.old + ' old orders are stored on this device.'
  useEffect(() => {
    if (m.level === 'ok') return
    const today = dkey(new Date()), key = 'warn_' + m.level
    if (pref(key) === today) return
    setPref(key, today)
    toast(msg + ' Export and free space.', 'bad')
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('RestoPOS', { body: msg + ' Export old data now.' }) } catch (e) {}
  }, [m.level, m.fail])
  return <div className="sw">{m.level !== 'ok' && <div className={'strip ' + m.level} onClick={onOpen}><span>{msg}</span><u>Export and free space</u></div>}</div>
}
export function Bell2({ go, m, openData }) {
  const st = useStore(); const x = useX()
  const [o, setO] = useState(false)
  const low = st.products.filter((p) => isLow(p, st))
  const unpaid = st.orders.filter((z) => z.balance > 0)
  const res = st.reservations.filter((r) => r.status === 'open' && r.pickup && r.pickup <= dkey(new Date()))
  const ex = expiring(num(st.settings.expDays) || 7)
  const tasks = (x.tasks || []).filter((t) => !t.done && t.due && t.due <= dkey(new Date()))
  const n = low.length + unpaid.length + res.length + st.parked.length + ex.length + tasks.length + (m.level !== 'ok' ? 1 : 0)
  const nav = (p) => { setO(false); go(p) }
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn ib" onClick={() => setO(!o)} aria-label="Alerts"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 17v-6a6 6 0 0112 0v6l2 2H4z" /><path d="M10 21h4" /></svg>{n > 0 && <i className="bdg">{n}</i>}</button>
      {o && <><div className="popbg" onClick={() => setO(false)} /><div className="pop raised">
        {n === 0 && <small className="mut">All clear</small>}
        {m.level !== 'ok' && <button className="btn" onClick={() => { setO(false); openData() }}>Storage {m.pct}% full. Export and free space</button>}
        {low.length > 0 && <button className="btn" onClick={() => nav('manage')}>{low.length} product(s) low on stock</button>}
        {ex.length > 0 && <button className="btn" onClick={() => nav('tools')}>{ex.length} batch(es) expiring soon</button>}
        {unpaid.length > 0 && <button className="btn" onClick={() => nav('orders')}>{unpaid.length} unpaid order(s) · {money(sum(unpaid, (z) => z.balance))}</button>}
        {res.length > 0 && <button className="btn" onClick={() => nav('hold')}>{res.length} reservation(s) due</button>}
        {st.parked.length > 0 && <button className="btn" onClick={() => nav('hold')}>{st.parked.length} parked sale(s)</button>}
        {tasks.length > 0 && <button className="btn" onClick={() => nav('tools')}>{tasks.length} task(s) due</button>}
      </div></>}
    </div>
  )
}
export function Settle({ o, close }) {
  const [a, setA] = useState(String(o.balance))
  const [mt, setMt] = useState('cash')
  const go = () => {
    const v = r2(num(a))
    if (v <= 0 || v > r2(o.balance) + 0.001) return toast('Amount must be between 0 and ' + money(o.balance), 'bad')
    settleOrder(o.id, v, mt); toast('Payment of ' + money(v) + ' recorded', 'ok'); close()
  }
  return (
    <Sh t={'Collect balance ' + ono(o.no)} close={close} w={400}>
      <R a="Total" b={money(o.total)} /><R big a="Balance" b={money(o.balance)} />
      <div className="seg">{METHODS.map(([k, l]) => <button key={k} className={'btn' + (mt === k ? ' on' : '')} onClick={() => setMt(k)}>{l}</button>)}</div>
      <input className="input" type="number" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
      <button className="btn pri" onClick={go}>Record payment</button>
    </Sh>
  )
}
export function VoidBox({ o, close }) {
  const st = useStore()
  const [pin, setPin] = useState(''); const [why, setWhy] = useState('Customer request')
  const go = () => {
    if (pin !== String(st.settings.pin)) return toast('Wrong manager PIN', 'bad')
    voidOrder(o, why); toast('Order ' + ono(o.no) + ' voided and restocked', 'ok'); close()
  }
  return (
    <Sh t={'Void ' + ono(o.no)} close={close} w={400}>
      <R big a="Total" b={money(o.total)} />
      <Sel className="input" value={why} onChange={(e) => setWhy(e.target.value)}>{['Customer request', 'Wrong item', 'Duplicate order', 'Price error', 'Other'].map((k) => <option key={k} value={k}>{k}</option>)}</Sel>
      <input className="input" type="password" inputMode="numeric" placeholder="Manager PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
      <button className="btn bad" onClick={go}>Void and return items to stock</button>
    </Sh>
  )
}
export function RefundTool({ close }) {
  const st = useStore(); const [no, setNo] = useState(''); const [v, setV] = useState(null)
  const k = parseInt(no.replace(/\D/g, ''), 10)
  const o = k ? st.orders.find((z) => Number(z.no) === k) : null
  return (
    <Sh t="Void / refund order" close={close} w={420}>
      <input className="input" autoFocus placeholder="Order number" value={no} onChange={(e) => setNo(e.target.value)} />
      {no && !o && <small className="mut">Order not found on this device</small>}
      {o && <div className="sumbox inset">{o.items.map((i, j) => <R key={j} a={i.qty + ' x ' + i.name} b={money(i.qty * i.price)} />)}<R big a="Total" b={money(o.total)} /></div>}
      {o && <button className="btn bad" onClick={() => setV(o)}>Void this order</button>}
      {v && <VoidBox o={v} close={() => { setV(null); setNo('') }} />}
    </Sh>
  )
}
export function DataCenter({ close }) {
  const st = useStore(); const m = useMeasure()
  const [days, setDays] = useState(pref('archdays', '30'))
  const [plan, setPlan] = useState(null); const [ex, setEx] = useState(false); const [msg, setMsg] = useState(''); const [est, setEst] = useState(null)
  const fr = useRef(null)
  useEffect(() => { try { navigator.storage && navigator.storage.estimate && navigator.storage.estimate().then(setEst) } catch (e) {} }, [])
  const mon = {}
  Object.entries(getRollup()).forEach(([k, v]) => { const o = mon[k.slice(0, 7)] || (mon[k.slice(0, 7)] = { n: 0, s: 0 }); o.n += v.n; o.s = r2(o.s + v.s) })
  const months = Object.entries(mon).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6)
  const build = () => { setPref('archdays', days); setPlan(planArchive(Math.max(0, num(days)))); setEx(false); setMsg('') }
  const exportIt = () => { exportArchive(plan); setEx(true); toast('Archive file downloaded', 'ok') }
  const purge = () => {
    if (!ex || !plan) return
    if (!window.confirm('Delete ' + plan.n + ' exported records from this device? Only do this if the downloaded file is saved.')) return
    purgeArchive(plan); setMsg('Done. ' + plan.n + ' records removed from this device.'); setPlan(null); setEx(false)
  }
  const load = (e) => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    const r = new FileReader()
    r.onload = () => { try { setMsg(importArchive(JSON.parse(r.result))) } catch (err) { setMsg('Could not read that file') } }
    r.readAsText(f)
  }
  const shrink = async () => { setMsg('Compressing images...'); const n = await shrinkImages(); setMsg(n > 0 ? 'Freed ' + Math.round(n / 1024) + ' KB of images' : 'Images are already small') }
  const notif = async () => { try { const p = await Notification.requestPermission(); setMsg(p === 'granted' ? 'System notifications enabled' : 'Notifications were not allowed') } catch (e) { setMsg('Notifications are not supported here') } }
  const kb = (n) => Math.round(n / 1024) + ' KB'
  return (
    <Sh t="Data center" close={close} w={560}>
      <div className={'meter ' + m.level}><i style={{ width: m.pct + '%' }} /></div>
      <R a={'Storage used (' + m.pct + '%)'} b={(m.total / 1e6).toFixed(2) + ' M of about 5 M'} />
      <R a="Database / product images" b={kb(m.db) + ' / ' + kb(m.img)} />
      {est && est.quota && <R a="Device storage" b={Math.round(est.usage / 1048576) + ' MB of ' + Math.round(est.quota / 1048576) + ' MB'} />}
      {m.fail && <div className="banner" style={{ background: '#fee2e2' }}>Storage is full. Changes since it filled up are only in memory. Export now.</div>}
      <div className="tsec">Export old data, then free space</div>
      <div className="row2"><label className="lbl">Export data older than (days)<input className="input" type="number" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></label><button className="btn pri" style={{ alignSelf: 'end' }} onClick={build}>Find old data</button></div>
      {plan && (plan.n === 0 ? <small className="mut">Nothing older than {plan.days} days.</small> : (<>
        <div className="sumbox inset">{Object.entries(plan.data).filter(([, a]) => a.length).map(([k, a]) => <R key={k} a={k} b={a.length} />)}<R big a="Total records / size" b={plan.n + ' / ' + kb(plan.bytes)} /></div>
        <div className="row2"><button className="btn pri" onClick={exportIt}>1. Export file</button><button className="btn" onClick={() => exportOrdersCsv(plan.data.orders, 'archived-orders')}>Orders CSV</button></div>
        <button className="btn bad" disabled={!ex} onClick={purge}>2. I saved the file. Delete from this device</button>
        <small className="mut">Open orders with a balance are never archived. Reports and Finance only cover data still on this device; archived totals stay under Analytics, Months.</small>
      </>))}
      <div className="tsec">Tools</div>
      <div className="row2"><button className="btn" onClick={() => fr.current.click()}>Load archive file</button><button className="btn" onClick={shrink}>Shrink images</button></div>
      <div className="row2"><button className="btn" onClick={() => { doBackup(); setMsg('Full backup downloaded') }}>Full backup</button><button className="btn" onClick={notif}>Enable notifications</button></div>
      <input ref={fr} type="file" accept="application/json,.json" hidden onChange={load} />
      {months.length > 0 && <><div className="tsec">Archived history</div>{months.map(([k, v]) => <R key={k} a={k + ' · ' + v.n + ' orders'} b={money(v.s)} />)}</>}
      <small className="mut">{msg}</small>
    </Sh>
  )
}
export function Waste({ close }) {
  const st = useStore(); const x = useX()
  const [id, setId] = useState(''); const [q, setQ] = useState(''); const [why, setWhy] = useState('Spoiled'); const [m, setM] = useState('')
  const wh = st.settings.activeWh || MAIN
  const go = () => {
    const p = st.products.find((z) => z.id === id); const n = Math.floor(num(q))
    if (!p || n < 1) return setM('Pick a product and quantity')
    const r = take(p, n, wh)
    if (r.short > 0) return setM('Only ' + (n - r.short) + ' in stock here')
    setState((s) => ({ products: s.products.map((z) => (z.id === id ? r.p : z)), moves: [mvRow('waste', p, wh, -n, why), ...s.moves].slice(0, 5000) }))
    setX((s) => ({ waste: [{ id: uid(), date: new Date().toISOString(), name: p.name, qty: n, cost: r2(num(p.cost) * n), why }, ...(s.waste || [])].slice(0, 300) }))
    audit('Waste', p.name + ' -' + n + ' ' + why); setM('Recorded'); setQ('')
  }
  const wl = (x.waste || []).filter((w) => w.date.slice(0, 7) === new Date().toISOString().slice(0, 7))
  return (
    <Sh t="Record waste" close={close}>
      <Sel className="input" value={id} onChange={(e) => setId(e.target.value)}><option value="">Select product</option>{st.products.filter(tracked).map((p) => <option key={p.id} value={p.id}>{p.name} ({qtyAt(p, wh)})</option>)}</Sel>
      <div className="row2"><input className="input" type="number" inputMode="numeric" placeholder="Quantity" value={q} onChange={(e) => setQ(e.target.value)} /><Sel className="input" value={why} onChange={(e) => setWhy(e.target.value)}>{['Spoiled', 'Damaged', 'Expired', 'Staff meal', 'Other'].map((k) => <option key={k} value={k}>{k}</option>)}</Sel></div>
      <button className="btn pri" onClick={go}>Remove from stock</button>
      <small className="mut">{m}</small>
      <R a="Waste cost this month" b={money(sum(wl, (w) => w.cost))} />
      {(x.waste || []).slice(0, 6).map((w) => <small key={w.id} className="mut">{new Date(w.date).toLocaleDateString()} · {w.qty} x {w.name} · {w.why} · {money(w.cost)}</small>)}
    </Sh>
  )
}
export function BulkPrice({ close }) {
  const st = useStore()
  const [c, setC] = useState(''); const [pc, setPc] = useState(''); const [rd, setRd] = useState(false); const [m, setM] = useState('')
  const tg = st.products.filter((p) => !c || p.cat === c)
  const f = (v) => { const n = r2(num(v) * (1 + num(pc) / 100)); return rd ? Math.round(n) : n }
  const go = () => {
    if (!num(pc) || num(pc) <= -100) return setM('Enter a percent such as 5 or -10')
    if (!window.confirm('Change the price of ' + tg.length + ' product(s) by ' + pc + '%?')) return
    const ids = new Set(tg.map((p) => p.id))
    setState((s) => ({ products: s.products.map((p) => (ids.has(p.id) ? { ...p, price: f(p.price), prices: Object.fromEntries(Object.entries(p.prices || {}).map(([k, v]) => [k, f(v)])) } : p)) }))
    audit('Bulk price change', (c || 'All') + ' ' + pc + '%'); setM('Updated ' + tg.length + ' products')
  }
  return (
    <Sh t="Bulk price change" close={close}>
      <Sel className="input" value={c} onChange={(e) => setC(e.target.value)}><option value="">All categories</option>{cats(st).map((k) => <option key={k} value={k}>{k}</option>)}</Sel>
      <input className="input" type="number" inputMode="decimal" placeholder="Percent, e.g. 5 or -10" value={pc} onChange={(e) => setPc(e.target.value)} />
      <label className="lbl"><span><input type="checkbox" checked={rd} onChange={(e) => setRd(e.target.checked)} /> Round to whole numbers</span></label>
      {num(pc) !== 0 && tg.slice(0, 5).map((p) => <R key={p.id} a={p.name} b={money(p.price) + ' to ' + money(f(p.price))} />)}
      <button className="btn pri" onClick={go}>Apply to {tg.length} product(s)</button>
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function Dup({ close }) {
  const st = useStore(); const [id, setId] = useState(''); const [nm, setNm] = useState(''); const [m, setM] = useState('')
  const p = st.products.find((z) => z.id === id)
  const go = () => {
    if (!p || !nm.trim()) return setM('Pick a product and enter a name')
    setState((s) => ({ products: [{ ...p, id: uid(), name: nm.trim(), barcode: '', sku: '', stock: tracked(p) ? 0 : '', lots: [] }, ...s.products] }))
    audit('Product duplicated', p.name + ' to ' + nm.trim()); setM('Created ' + nm.trim() + '. Barcode and SKU are blank, stock starts at 0.'); setId(''); setNm('')
  }
  return (
    <Sh t="Duplicate product" close={close} w={440}>
      <Sel className="input" value={id} onChange={(e) => { setId(e.target.value); const z = st.products.find((q) => q.id === e.target.value); setNm(z ? z.name + ' copy' : '') }}><option value="">Select product</option>{st.products.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</Sel>
      <input className="input" placeholder="New name" value={nm} onChange={(e) => setNm(e.target.value)} />
      <button className="btn pri" onClick={go}>Create copy</button>
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function StockReports({ close }) {
  const st = useStore(); const [t, setT] = useState('val'); const [d, setD] = useState('30')
  const tr = st.products.filter(tracked)
  let body = null
  if (t === 'val') {
    const m = {}
    tr.forEach((p) => { const k = p.cat || 'Uncategorized'; const q = qtyAt(p); const a = m[k] || (m[k] = { q: 0, c: 0, r: 0 }); a.q += q; a.c += q * num(p.cost); a.r += q * num(p.price) })
    const rows = Object.entries(m).map(([k, a]) => ({ k, ...a }))
    const tc = rows.reduce((a, r) => a + r.c, 0), trv = rows.reduce((a, r) => a + r.r, 0)
    body = (<><div className="sumbox inset"><R a="Stock at cost" b={money(tc)} /><R a="Stock at retail" b={money(trv)} /><R big a="Potential profit" b={money(trv - tc)} /></div>
      <Tbl name="stock-valuation" rows={rows} cols={[['Category', (r) => r.k], ['Units', (r) => r.q], ['At cost', (r) => money(r.c)], ['At retail', (r) => money(r.r)]]} /></>)
  } else if (t === 'dead') {
    const last = {}
    st.orders.forEach((o) => o.items.forEach((i) => { if (!last[i.id] || o.date > last[i.id]) last[i.id] = o.date }))
    const cut = new Date(Date.now() - num(d) * 864e5).toISOString()
    const rows = tr.filter((p) => qtyAt(p) > 0 && (!last[p.id] || last[p.id] < cut))
    body = (<><input className="input" type="number" inputMode="numeric" value={d} onChange={(e) => setD(e.target.value)} placeholder="Days without a sale" />
      <Tbl name="dead-stock" rows={rows} cols={[['Product', (p) => p.name], ['Units', (p) => qtyAt(p)], ['Last sold', (p) => (last[p.id] ? new Date(last[p.id]).toLocaleDateString() : 'never')], ['Value at cost', (p) => money(qtyAt(p) * num(p.cost))]]} /></>)
  } else {
    const rows = expiring(num(d) || 14).sort((a, b) => (a.l.exp < b.l.exp ? -1 : 1))
    body = (<><input className="input" type="number" inputMode="numeric" value={d} onChange={(e) => setD(e.target.value)} placeholder="Days ahead" />
      <Tbl name="expiring-batches" rows={rows} cols={[['Product', (r) => r.p.name], ['Batch', (r) => r.l.no || ''], ['Expires', (r) => r.l.exp], ['Units', (r) => r.l.qty]]} /></>)
  }
  return (
    <Sh t="Stock reports" close={close} w={680}>
      <Tabs v={t} on={(k) => { setT(k); setD(k === 'dead' ? '30' : '14') }} items={[['val', 'Valuation'], ['dead', 'Dead stock'], ['exp', 'Expiry']]} />
      {body}
    </Sh>
  )
}
export function Analytics({ close }) {
  const st = useStore(); const [t, setT] = useState('profit'); const [r, setR] = useState('30')
  const os = st.orders.filter((o) => inR(o.date, r))
  const vs = (st.voided || []).filter((o) => inR(o.voidAt || o.date, r))
  const cat = Object.fromEntries(st.products.map((p) => [p.id, p.cat || 'Uncategorized']))
  const prof = (kf) => {
    const m = {}
    os.forEach((o) => o.items.forEach((i) => { const k = kf(i); const a = m[k] || (m[k] = { q: 0, rev: 0, cost: 0 }); a.q += num(i.qty); a.rev += num(i.qty) * num(i.price) - num(i.bulk); a.cost += num(i.qty) * num(i.cost) }))
    return Object.entries(m).map(([k, a]) => ({ k, ...a, gp: a.rev - a.cost })).sort((a, b) => b.gp - a.gp)
  }
  const pc = [['Qty', (x) => x.q], ['Revenue', (x) => money(x.rev)], ['Cost', (x) => money(x.cost)], ['Profit', (x) => money(x.gp)], ['Margin', (x) => (x.rev > 0 ? Math.round((x.gp / x.rev) * 100) : 0) + '%']]
  let body = null
  if (t === 'profit') body = <Tbl name="profit-by-product" rows={prof((i) => i.name)} cols={[['Product', (x) => x.k], ...pc]} />
  else if (t === 'cat') body = <Tbl name="profit-by-category" rows={prof((i) => cat[i.id] || 'Uncategorized')} cols={[['Category', (x) => x.k], ...pc]} />
  else if (t === 'wd') {
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const rows = wd.map((d, i) => { const a = os.filter((o) => new Date(o.date).getDay() === i); return { d, n: a.length, s: sum(a, (o) => o.total) } })
    body = <Tbl name="sales-by-weekday" rows={rows} cols={[['Day', (x) => x.d], ['Orders', (x) => x.n], ['Sales', (x) => money(x.s)], ['Average', (x) => money(x.n ? x.s / x.n : 0)]]} />
  } else if (t === 'pay') {
    const m = {}
    os.forEach((o) => (o.payments || [{ method: o.method, amount: o.paid ?? o.total }]).forEach((p) => { const k = MLABEL[p.method] || (p.method === 'deposit' ? 'Deposit' : p.method); m[k] = r2((m[k] || 0) + num(p.amount)) }))
    const tot = Object.values(m).reduce((a, b) => a + b, 0) || 1
    body = <Tbl name="payment-methods" rows={Object.entries(m)} cols={[['Method', (x) => x[0]], ['Amount', (x) => money(x[1])], ['Share', (x) => Math.round((x[1] / tot) * 100) + '%']]} />
  } else if (t === 'months') {
    const mon = {}
    const add = (k, n, s) => { const o = mon[k] || (mon[k] = { n: 0, s: 0 }); o.n += n; o.s = r2(o.s + s) }
    st.orders.forEach((o) => add(dkey(o.date).slice(0, 7), 1, num(o.total)))
    Object.entries(getRollup()).forEach(([k, v]) => add(k.slice(0, 7), v.n, v.s))
    const asc = Object.entries(mon).sort((a, b) => (a[0] < b[0] ? -1 : 1))
    const rows = asc.map(([k, v], i) => ({ k, ...v, ch: i && asc[i - 1][1].s > 0 ? Math.round(((v.s - asc[i - 1][1].s) / asc[i - 1][1].s) * 100) : null })).reverse().slice(0, 18)
    body = <Tbl name="monthly-sales-incl-archive" rows={rows} cols={[['Month', (x) => x.k], ['Orders', (x) => x.n], ['Sales', (x) => money(x.s)], ['Vs previous', (x) => (x.ch === null ? '' : (x.ch >= 0 ? '+' : '') + x.ch + '%')]]} />
  } else if (t === 'staff') {
    const m = {}
    const g = (k) => m[k] || (m[k] = { n: 0, s: 0, i: 0, v: 0 })
    os.forEach((o) => { const a = g(o.by || 'Admin'); a.n++; a.s += num(o.total); a.i += o.items.reduce((b, i) => b + num(i.qty), 0) })
    vs.forEach((o) => { g(o.voidBy || 'Admin').v++ })
    body = <Tbl name="cashier-performance" rows={Object.entries(m)} cols={[['Cashier', (x) => x[0]], ['Orders', (x) => x[1].n], ['Sales', (x) => money(x[1].s)], ['Avg basket', (x) => money(x[1].n ? x[1].s / x[1].n : 0)], ['Items', (x) => x[1].i], ['Voids', (x) => x[1].v]]} />
  } else {
    const vr = {}
    vs.forEach((o) => { const k = o.voidReason || 'No reason'; const a = vr[k] || (vr[k] = { n: 0, s: 0 }); a.n++; a.s += num(o.total) })
    body = (<><div className="sumbox inset"><R a="Total discounts" b={money(sum(os, (o) => o.disc))} /><R a="Automatic rules and bulk" b={money(sum(os, (o) => o.autoDisc))} /><R a="Manual" b={money(sum(os, (o) => o.manual))} /><R a="Points redeemed" b={money(sum(os, (o) => o.redeem))} /></div>
      <Tbl name="voids-by-reason" rows={Object.entries(vr)} cols={[['Reason', (x) => x[0]], ['Voids', (x) => x[1].n], ['Amount', (x) => money(x[1].s)]]} /></>)
  }
  return (
    <Sh t="Analytics" close={close} w={760}>
      <Tabs v={t} on={setT} items={[['profit', 'Products'], ['cat', 'Categories'], ['wd', 'Weekdays'], ['pay', 'Payments'], ['months', 'Months'], ['staff', 'Cashiers'], ['disc', 'Discounts and voids']]} />
      {t !== 'months' && <Sel className="input" value={r} onChange={(e) => setR(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Sel>}
      {body}
      {(t === 'profit' || t === 'cat') && <small className="mut">Profit is before order-level discounts. Old orders without a recorded cost show cost 0.</small>}
    </Sh>
  )
}
export function CustInsight({ close }) {
  const st = useStore(); const [t, setT] = useState('top'); const [id, setId] = useState(''); const [se, setSe] = useState(null)
  const spend = {}
  st.orders.forEach((o) => { if (!o.customerId) return; const a = spend[o.customerId] || (spend[o.customerId] = { n: 0, s: 0 }); a.n++; a.s += num(o.total) })
  const top = st.customers.map((c) => ({ c, ...(spend[c.id] || { n: 0, s: 0 }) })).sort((a, b) => b.s - a.s)
  const unpaid = st.orders.filter((o) => o.balance > 0).sort((a, b) => new Date(a.date) - new Date(b.date))
  const c = st.customers.find((z) => z.id === id)
  const rows = c ? st.orders.filter((o) => o.customerId === id).sort((a, b) => new Date(b.date) - new Date(a.date)) : []
  return (
    <Sh t="Customer insights" close={close} w={640}>
      <Tabs v={t} on={setT} items={[['top', 'Top customers'], ['owe', 'Owing'], ['stmt', 'Statement']]} />
      {t === 'top' && <Tbl name="top-customers" rows={top} cols={[['Customer', (x) => x.c.name], ['Orders', (x) => x.n], ['Spent', (x) => money(x.s)], ['Points', (x) => x.c.points || 0]]} />}
      {t === 'owe' && (<>{unpaid.length === 0 && <small className="mut">Nobody owes anything</small>}{unpaid.map((o) => (
        <div key={o.id} className="raised prow"><div className="pinfo"><b>{ono(o.no)} {o.customerName || 'Walk-in'}</b><small>{new Date(o.date).toLocaleDateString()} · total {money(o.total)}</small></div><b>{money(o.balance)}</b><button className="btn pri" onClick={() => setSe(o)}>Collect</button></div>))}</>)}
      {t === 'stmt' && (<>
        <Sel className="input" value={id} onChange={(e) => setId(e.target.value)}><option value="">Select customer</option>{st.customers.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</Sel>
        {c && <R big a={'Balance owed by ' + c.name} b={money(sum(rows, (o) => o.balance || 0))} />}
        {c && <Tbl name={'statement-' + c.name} rows={rows} cols={[['Order', (o) => ono(o.no)], ['Date', (o) => new Date(o.date).toLocaleDateString()], ['Total', (o) => money(o.total)], ['Paid', (o) => money(o.paid ?? o.total)], ['Balance', (o) => money(o.balance || 0)]]} />}
      </>)}
      {se && <Settle o={se} close={() => setSe(null)} />}
    </Sh>
  )
}
export function Checklist({ close }) {
  const x = useX(); const [v, setV] = useState('')
  const items = x.chk || []; const today = dkey(new Date())
  const done = x.chkd && x.chkd.d === today ? x.chkd.ids : []
  const toggle = (id) => setX({ chkd: { d: today, ids: done.includes(id) ? done.filter((i) => i !== id) : [...done, id] } })
  const add = (t) => setX({ chk: [...items, ...t.map((s) => ({ id: uid(), t: s }))] })
  return (
    <Sh t="Daily checklist" close={close} w={440}>
      <R a="Done today" b={done.filter((i) => items.some((z) => z.id === i)).length + ' / ' + items.length} />
      {items.map((z) => (
        <div key={z.id} className="raised prow"><label className="pinfo" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={done.includes(z.id)} onChange={() => toggle(z.id)} />{z.t}</label><button className="btn bad sm" onClick={() => setX({ chk: items.filter((q) => q.id !== z.id) })}>x</button></div>))}
      <div className="row2"><input className="input" placeholder="New item" value={v} onChange={(e) => setV(e.target.value)} /><button className="btn pri" onClick={() => { if (v.trim()) { add([v.trim()]); setV('') } }}>Add</button></div>
      {!items.length && <button className="btn" onClick={() => add(['Count cash drawer', 'Check stock levels', 'Test receipt printer', 'Clean counter', 'Review reservations'])}>Add standard items</button>}
      <small className="mut">Ticks reset every day.</small>
    </Sh>
  )
}
export function Tasks({ close }) {
  const x = useX(); const [v, setV] = useState(''); const [d, setD] = useState('')
  const l = x.tasks || []; const today = dkey(new Date())
  const up = (id, p) => setX({ tasks: l.map((t) => (t.id === id ? { ...t, ...p } : t)) })
  const sorted = [...l].sort((a, b) => (a.done - b.done) || String(a.due || '9').localeCompare(String(b.due || '9')))
  return (
    <Sh t="Tasks and reminders" close={close} w={460}>
      <div className="row2"><input className="input" placeholder="Task" value={v} onChange={(e) => setV(e.target.value)} /><input className="input" type="date" value={d} onChange={(e) => setD(e.target.value)} /></div>
      <button className="btn pri" onClick={() => { if (v.trim()) { setX({ tasks: [{ id: uid(), t: v.trim(), due: d, done: false }, ...l] }); setV(''); setD('') } }}>Add task</button>
      {sorted.map((t) => (
        <div key={t.id} className="raised prow"><label className="pinfo" style={{ display: 'flex', gap: 8, alignItems: 'center', textDecoration: t.done ? 'line-through' : 'none' }}><input type="checkbox" checked={!!t.done} onChange={() => up(t.id, { done: !t.done })} />{t.t}</label>{t.due && <span className={'chip ' + (!t.done && t.due <= today ? 'bad' : '')}>{t.due}</span>}<button className="btn bad sm" onClick={() => setX({ tasks: l.filter((q) => q.id !== t.id) })}>x</button></div>))}
      {!l.length && <small className="mut">No tasks</small>}
    </Sh>
  )
}
export function Health({ close }) {
  const [list, setList] = useState(() => healthCheck()); const [m, setM] = useState('')
  const shrink = async () => { setM('Compressing images...'); const n = await shrinkImages(); setM(n > 0 ? 'Freed ' + Math.round(n / 1024) + ' KB' : 'Images are already small'); setList(healthCheck()) }
  const persist = async () => { try { const ok = await navigator.storage.persist(); setM(ok ? 'Data is protected from automatic clearing' : 'The browser did not grant protection') } catch (e) { setM('Not supported here') } }
  return (
    <Sh t="Health check" close={close} w={460}>
      {list.map((x, i) => <div key={i} className="banner" style={{ cursor: 'default', color: '#1f2937', background: x.l === 'bad' ? '#fee2e2' : x.l === 'ok' ? '#dcfce7' : '#fff4d6' }}>{x.m}</div>)}
      <div className="row2"><button className="btn" onClick={() => setList(healthCheck())}>Run again</button><button className="btn" onClick={shrink}>Shrink images</button><button className="btn" onClick={persist}>Protect data</button></div>
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function Prefs2({ close }) {
  const [, f] = useState(0)
  const set = (k, v) => { setPref(k, v); applyPrefs(); f((n) => n + 1) }
  const cur = pref('ac', '#2563eb')
  return (
    <Sh t="Preferences" close={close} w={460}>
      <button className="btn" onClick={() => set('theme', pref('theme', 'light') === 'light' ? 'dark' : 'light')}>Theme: {pref('theme', 'light')}</button>
      <div className="seg">{[['compact', 'Compact'], ['cozy', 'Normal'], ['large', 'Large touch']].map(([k, l]) => <button key={k} className={'btn' + (pref('dens', 'cozy') === k ? ' on' : '')} onClick={() => set('dens', k)}>{l}</button>)}</div>
      <div className="seg">{PRESETS.map(([n, a, b]) => <button key={n} className={'btn' + (cur === a ? ' on' : '')} onClick={() => { setPref('ac', a); setPref('acs', b); applyPrefs(); f((x) => x + 1) }}><i className="ld" style={{ background: a }} />{n}</button>)}</div>
      <button className="btn" onClick={() => set('snd', pref('snd', '1') === '1' ? '0' : '1')}>Beep and vibrate: {pref('snd', '1') === '1' ? 'on' : 'off'}</button>
      <button className="btn" onClick={() => { const v = pref('wake', '1') === '1' ? '0' : '1'; set('wake', v); wakeLock(v === '1') }}>Keep screen on: {pref('wake', '1') === '1' ? 'on' : 'off'}</button>
      <label className="lbl">Daily sales goal<input className="input" type="number" inputMode="decimal" value={pref('goal', '')} onChange={(e) => set('goal', e.target.value)} /></label>
      <label className="lbl">Auto-lock Management after (minutes, 0 = off)<input className="input" type="number" inputMode="numeric" value={pref('idle', '0')} onChange={(e) => set('idle', e.target.value)} /></label>
    </Sh>
  )
}
const KEYS = [['F2', 'Focus product search'], ['F4', 'Complete sale'], ['F8', 'Park sale'], ['F9', 'Clear order'], ['3*code', 'Add 3 of a product by barcode or SKU'], ['Ctrl+K', 'Command palette'], ['?', 'This help']]
export function Help({ close }) {
  return <Sh t="Shortcuts" close={close} w={420}>{KEYS.map(([k, l]) => <R key={k} a={<b>{k}</b>} b={l} />)}</Sh>
}
