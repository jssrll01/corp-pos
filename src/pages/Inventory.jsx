import Sel from '../Sel.jsx'
import { useState } from 'react'
import { useStore, setState } from '../store.js'
import { uid, num, r2, money, dkey, tracked, qtyAt, isLow, lotsOf, withLots, take, put, mvRow, curUser, audit, inR, RANGES } from '../inv.js'
import { Tabs, Tbl, Fld } from '../ui.jsx'
import { printLabels } from '../barcode.js'
const wn = (st, id) => (st.warehouses.find((w) => w.id === id) || {}).name || id
function WhSel({ v, on, all }) {
  const { warehouses } = useStore()
  return <Sel className="input" value={v} onChange={(e) => on(e.target.value)}>{all && <option value="">All warehouses</option>}{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Sel>
}
function PSel({ v, on }) {
  const { products } = useStore()
  return <Sel className="input" value={v} onChange={(e) => on(e.target.value)}><option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ' (' + p.sku + ')' : ''}</option>)}</Sel>
}
function Stock() {
  const st = useStore()
  const [w, setW] = useState('')
  const [q, setQ] = useState('')
  const [fl, setFl] = useState('all')
  const rows = st.products.filter((p) => (!q || (p.name + ' ' + (p.sku || '') + ' ' + (p.barcode || '')).toLowerCase().includes(q.toLowerCase())) && (fl === 'all' || (fl === 'low' && isLow(p, st)) || (fl === 'out' && tracked(p) && qtyAt(p, w) <= 0)))
  const val = rows.reduce((a, p) => a + (tracked(p) ? qtyAt(p, w) * num(p.cost) : 0), 0)
  return (
    <div className="grid">
      <div className="row2"><input className="input" placeholder="Search name, SKU, barcode" value={q} onChange={(e) => setQ(e.target.value)} /><WhSel all v={w} on={setW} /></div>
      <div className="chips">{[['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([k, l]) => <button key={k} className={'btn' + (fl === k ? ' on' : '')} onClick={() => setFl(k)}>{l}</button>)}</div>
      <small className="mut">Stock value at cost: {money(val)}</small>
      <Tbl name="Stock" rows={rows} cols={[['Product', (p) => p.name], ['SKU', (p) => p.sku || ''], ['Qty', (p) => (tracked(p) ? qtyAt(p, w) : 'n/a')], ['Reorder', (p) => p.reorder || st.settings.lowStock], ['Value', (p) => (tracked(p) ? money(qtyAt(p, w) * num(p.cost)) : '')], ['Status', (p) => (!tracked(p) ? '' : qtyAt(p, w) <= 0 ? 'OUT' : isLow(p, st) ? 'LOW' : 'OK')]]} />
    </div>
  )
}
function Adjust() {
  const st = useStore()
  const [f, setF] = useState({ pid: '', wh: st.settings.activeWh || 'main', typ: 'add', qty: '', note: '', batch: '', exp: '' })
  const [msg, setMsg] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const go = () => {
    const p = st.products.find((x) => x.id === f.pid)
    const n = parseInt(f.qty, 10)
    if (!p || !(n > 0)) return setMsg('Pick a product and a quantity')
    let np, d = n
    if (f.typ === 'add') np = put(p, f.wh, n, f.batch.trim(), f.exp)
    else {
      if (!tracked(p)) return setMsg('This product has no tracked stock')
      const r = take(p, n, f.wh)
      if (r.short > 0) return setMsg('Only ' + qtyAt(p, f.wh) + ' in this warehouse')
      np = r.p; d = -n
    }
    setState((s) => ({ products: s.products.map((x) => (x.id === p.id ? np : x)), moves: [mvRow(f.typ, p, f.wh, d, f.note), ...s.moves] }))
    audit('Stock ' + f.typ, p.name + ' ' + d)
    setF((x) => ({ ...x, qty: '', note: '', batch: '', exp: '' })); setMsg('Done')
  }
  return (
    <div className="raised mpanel">
      <PSel v={f.pid} on={(v) => set('pid', v)} />
      <WhSel v={f.wh} on={(v) => set('wh', v)} />
      <Sel className="input" value={f.typ} onChange={(e) => set('typ', e.target.value)}><option value="add">Stock in (add)</option><option value="remove">Remove (correction)</option><option value="damaged">Damaged</option><option value="expired">Expired</option></Sel>
      <input className="input" type="number" inputMode="numeric" min="1" placeholder="Quantity" value={f.qty} onChange={(e) => set('qty', e.target.value)} />
      {f.typ === 'add' && <div className="row2"><input className="input" placeholder="Batch no" value={f.batch} onChange={(e) => set('batch', e.target.value)} /><Fld l="Expiry"><input className="input" type="date" value={f.exp} onChange={(e) => set('exp', e.target.value)} /></Fld></div>}
      <input className="input" placeholder="Note / reason" value={f.note} onChange={(e) => set('note', e.target.value)} />
      {msg && <small className="mut">{msg}</small>}
      <button className="btn pri" onClick={go}>Apply adjustment</button>
    </div>
  )
}
function Receive() {
  const st = useStore()
  const [h, setH] = useState({ sup: '', wh: st.settings.activeWh || 'main', ref: '', paid: '', method: 'cash' })
  const [ln, setLn] = useState([])
  const [d, setD] = useState({ pid: '', qty: '', cost: '', no: '', exp: '', ser: '' })
  const [msg, setMsg] = useState('')
  const hs = (k, v) => setH((x) => ({ ...x, [k]: v }))
  const ds = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const total = r2(ln.reduce((a, l) => a + l.qty * l.cost, 0))
  const addL = () => {
    const p = st.products.find((x) => x.id === d.pid)
    const sers = d.ser.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean)
    const q = sers.length || parseInt(d.qty, 10)
    if (!p || !(q > 0)) return setMsg('Pick a product and a quantity (or serial numbers)')
    setLn((l) => [...l, { pid: p.id, name: p.name, qty: q, cost: num(d.cost) || num(p.cost), no: d.no.trim(), exp: d.exp, sers }])
    setD({ pid: '', qty: '', cost: '', no: '', exp: '', ser: '' }); setMsg('')
  }
  const save = () => {
    if (!ln.length) return setMsg('Add at least one line')
    const sup = st.suppliers.find((x) => x.id === h.sup)
    const paid = h.paid === '' ? total : Math.min(num(h.paid), total)
    const no = st.purchases.reduce((m, p) => Math.max(m, p.no || 0), 0) + 1
    const moves = []
    let prods = st.products
    ln.forEach((l) => {
      prods = prods.map((p) => {
        if (p.id !== l.pid) return p
        let np = { ...p, cost: l.cost }
        if (l.sers.length) l.sers.forEach((sn) => { np = put(np, h.wh, 1, sn, l.exp) })
        else np = put(np, h.wh, l.qty, l.no, l.exp)
        moves.push(mvRow('purchase', p, h.wh, l.qty, 'PO#' + no + (sup ? ' ' + sup.name : ''), { cost: l.cost }))
        return np
      })
    })
    setState((s) => ({ products: prods, moves: [...moves, ...s.moves], purchases: [{ id: uid(), no, date: new Date().toISOString(), supplierId: h.sup, supplierName: sup ? sup.name : '', wh: h.wh, ref: h.ref, lines: ln, total, paid, ip: paid, method: h.method, by: curUser().name }, ...s.purchases] }))
    audit('Stock received', 'PO#' + no + ' ' + money(total))
    setLn([]); setH((x) => ({ ...x, ref: '', paid: '' })); setMsg('Received PO#' + no)
  }
  const pay = (p) => {
    const bal = r2(p.total - p.paid)
    const a = Math.min(num(window.prompt('Pay supplier (balance ' + money(bal) + ')', bal)), bal)
    if (!(a > 0)) return
    setState((s) => ({ purchases: s.purchases.map((x) => (x.id === p.id ? { ...x, paid: r2(x.paid + a) } : x)), cashlog: [{ id: uid(), date: new Date().toISOString(), type: 'out', amount: a, note: 'Supplier payment PO#' + p.no }, ...s.cashlog] }))
    audit('Supplier paid', 'PO#' + p.no + ' ' + money(a))
  }
  return (
    <div className="grid">
      <div className="raised mpanel">
        <h3 style={{ margin: 0 }}>Receive stock (purchase)</h3>
        <Sel className="input" value={h.sup} onChange={(e) => hs('sup', e.target.value)}><option value="">No supplier</option>{st.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Sel>
        <div className="row2"><WhSel v={h.wh} on={(v) => hs('wh', v)} /><input className="input" placeholder="Invoice / ref no" value={h.ref} onChange={(e) => hs('ref', e.target.value)} /></div>
        <PSel v={d.pid} on={(v) => ds('pid', v)} />
        <div className="row2"><input className="input" type="number" inputMode="numeric" placeholder="Qty" value={d.qty} onChange={(e) => ds('qty', e.target.value)} /><input className="input" type="number" inputMode="decimal" placeholder="Unit cost" value={d.cost} onChange={(e) => ds('cost', e.target.value)} /></div>
        <div className="row2"><input className="input" placeholder="Batch no" value={d.no} onChange={(e) => ds('no', e.target.value)} /><Fld l="Expiry"><input className="input" type="date" value={d.exp} onChange={(e) => ds('exp', e.target.value)} /></Fld></div>
        <textarea className="input" rows="2" placeholder="Serial numbers (one per line or comma separated, sets the quantity)" value={d.ser} onChange={(e) => ds('ser', e.target.value)} />
        <button className="btn" onClick={addL}>Add line</button>
        {ln.map((l, i) => <div key={i} className="sumline"><span>{l.qty} x {l.name}{l.no ? ' [' + l.no + ']' : ''}{l.sers.length ? ' (serials)' : ''}</span><span>{money(l.qty * l.cost)}</span></div>)}
        <div className="row2"><input className="input" type="number" inputMode="decimal" placeholder={'Paid now (blank = ' + money(total) + ')'} value={h.paid} onChange={(e) => hs('paid', e.target.value)} /><Sel className="input" value={h.method} onChange={(e) => hs('method', e.target.value)}><option value="cash">Cash</option><option value="ewallet">E-Wallet</option><option value="bank">Bank</option></Sel></div>
        {msg && <small className="mut">{msg}</small>}
        <button className="btn pri" onClick={save}>Save purchase {ln.length ? '(' + money(total) + ')' : ''}</button>
      </div>
      {st.purchases.map((p) => (
        <div key={p.id} className="raised prow">
          <div className="pinfo"><b>PO#{p.no} {p.supplierName || 'No supplier'}</b><small>{new Date(p.date).toLocaleDateString()} · {wn(st, p.wh)} · {money(p.total)} · balance {money(p.total - p.paid)}</small></div>
          {p.total - p.paid > 0 && <button className="btn" onClick={() => pay(p)}>Pay</button>}
        </div>
      ))}
    </div>
  )
}
function Transfer() {
  const st = useStore()
  const [h, setH] = useState({ from: st.settings.activeWh || 'main', to: '' })
  const [ln, setLn] = useState([])
  const [d, setD] = useState({ pid: '', qty: '' })
  const [msg, setMsg] = useState('')
  const addL = () => {
    const p = st.products.find((x) => x.id === d.pid)
    const q = parseInt(d.qty, 10)
    if (!p || !(q > 0)) return setMsg('Pick a product and a quantity')
    if (!tracked(p)) return setMsg('Only products with tracked stock can be transferred')
    if (q > qtyAt(p, h.from)) return setMsg('Only ' + qtyAt(p, h.from) + ' available in the source warehouse')
    setLn((l) => [...l, { pid: p.id, name: p.name, qty: q }]); setD({ pid: '', qty: '' }); setMsg('')
  }
  const save = () => {
    if (!h.to || h.to === h.from) return setMsg('Choose two different warehouses')
    if (!ln.length) return setMsg('Add at least one line')
    const no = st.transfers.reduce((m, t) => Math.max(m, t.no || 0), 0) + 1
    const moves = [], lines = []
    let prods = st.products
    ln.forEach((l) => { prods = prods.map((p) => { if (p.id !== l.pid) return p; const r = take(p, l.qty, h.from); lines.push({ pid: p.id, name: p.name, qty: l.qty, lots: r.used }); moves.push(mvRow('transfer_out', p, h.from, -l.qty, 'TR#' + no)); return r.p }) })
    setState((s) => ({ products: prods, moves: [...moves, ...s.moves], transfers: [{ id: uid(), no, date: new Date().toISOString(), from: h.from, to: h.to, lines, status: 'transit', by: curUser().name }, ...s.transfers] }))
    audit('Transfer created', 'TR#' + no)
    setLn([]); setMsg('Created TR#' + no)
  }
  const recv = (t) => {
    const moves = []
    let prods = st.products
    t.lines.forEach((l) => { prods = prods.map((p) => { if (p.id !== l.pid) return p; let np = p; l.lots.forEach((u) => { np = put(np, t.to, u.qty, u.no, u.exp) }); moves.push(mvRow('transfer_in', p, t.to, l.qty, 'TR#' + t.no)); return np }) })
    setState((s) => ({ products: prods, moves: [...moves, ...s.moves], transfers: s.transfers.map((x) => (x.id === t.id ? { ...x, status: 'received', rdate: new Date().toISOString() } : x)) }))
    audit('Transfer received', 'TR#' + t.no)
  }
  return (
    <div className="grid">
      <div className="raised mpanel">
        <h3 style={{ margin: 0 }}>New stock transfer</h3>
        <div className="row2"><WhSel v={h.from} on={(v) => setH({ ...h, from: v })} /><Sel className="input" value={h.to} onChange={(e) => setH({ ...h, to: e.target.value })}><option value="">To warehouse</option>{st.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Sel></div>
        <PSel v={d.pid} on={(v) => setD({ ...d, pid: v })} />
        <input className="input" type="number" inputMode="numeric" placeholder="Quantity" value={d.qty} onChange={(e) => setD({ ...d, qty: e.target.value })} />
        <button className="btn" onClick={addL}>Add line</button>
        {ln.map((l, i) => <div key={i} className="sumline"><span>{l.name}</span><span>{l.qty}</span></div>)}
        {msg && <small className="mut">{msg}</small>}
        <button className="btn pri" onClick={save}>Create transfer</button>
      </div>
      {st.transfers.map((t) => (
        <div key={t.id} className="raised prow">
          <div className="pinfo"><b>TR#{t.no} · {t.status}</b><small>{wn(st, t.from)} to {wn(st, t.to)} · {t.lines.map((l) => l.qty + 'x ' + l.name).join(', ')}</small></div>
          {t.status === 'transit' && <button className="btn pri" onClick={() => recv(t)}>Receive</button>}
        </div>
      ))}
    </div>
  )
}
function Count() {
  const st = useStore()
  const [w, setW] = useState(st.settings.activeWh || 'main')
  const [m, setM] = useState({})
  const [msg, setMsg] = useState('')
  const ps = st.products.filter(tracked)
  const go = () => {
    const lines = [], moves = []
    let prods = st.products
    ps.forEach((p) => {
      if (m[p.id] === undefined || m[p.id] === '') return
      const c = Math.max(0, parseInt(m[p.id], 10) || 0), sys = qtyAt(p, w), v = c - sys
      lines.push({ pid: p.id, name: p.name, sys, counted: c, v })
      if (!v) return
      prods = prods.map((x) => { if (x.id !== p.id) return x; moves.push(mvRow('count', p, w, v, 'Physical count')); return v > 0 ? put(x, w, v) : take(x, -v, w).p })
    })
    if (!lines.length) return setMsg('Enter counted quantities first')
    setState((s) => ({ products: prods, moves: [...moves, ...s.moves], counts: [{ id: uid(), date: new Date().toISOString(), wh: w, lines, by: curUser().name }, ...s.counts] }))
    audit('Stock count applied', wn(st, w) + ' ' + lines.length + ' items')
    setM({}); setMsg('Count applied: ' + lines.filter((l) => l.v).length + ' adjustment(s)')
  }
  return (
    <div className="grid">
      <WhSel v={w} on={setW} />
      {!ps.length && <p className="mut">No tracked products to count</p>}
      {ps.map((p) => (
        <div key={p.id} className="raised prow">
          <div className="pinfo"><b>{p.name}</b><small>System: {qtyAt(p, w)}{m[p.id] !== undefined && m[p.id] !== '' ? ' · variance ' + ((parseInt(m[p.id], 10) || 0) - qtyAt(p, w)) : ''}</small></div>
          <input className="input" style={{ width: 90 }} type="number" inputMode="numeric" min="0" placeholder="Counted" value={m[p.id] ?? ''} onChange={(e) => setM({ ...m, [p.id]: e.target.value })} />
        </div>
      ))}
      {msg && <small className="mut">{msg}</small>}
      <button className="btn pri" onClick={go}>Apply count</button>
      <Tbl name="Count history" rows={st.counts} cols={[['Date', (c) => new Date(c.date).toLocaleString()], ['Warehouse', (c) => wn(st, c.wh)], ['Items', (c) => c.lines.length], ['Net variance', (c) => c.lines.reduce((a, l) => a + l.v, 0)], ['By', (c) => c.by]]} />
    </div>
  )
}
function Expiry() {
  const st = useStore()
  const lim = new Date()
  lim.setDate(lim.getDate() + num(st.settings.expDays))
  const limS = dkey(lim), td = dkey(new Date())
  const rows = []
  st.products.forEach((p) => lotsOf(p).forEach((l) => { if (l.exp && l.qty > 0 && l.exp <= limS) rows.push({ p, l }) }))
  rows.sort((a, b) => (a.l.exp < b.l.exp ? -1 : 1))
  const off = ({ p, l }) => {
    if (!window.confirm('Write off ' + l.qty + ' x ' + p.name + ' (batch ' + (l.no || '-') + ') as expired?')) return
    setState((s) => ({ products: s.products.map((x) => (x.id === p.id ? withLots(x, lotsOf(x).map((y) => (y.id === l.id ? { ...y, qty: 0 } : y))) : x)), moves: [mvRow('expired', p, l.wh, -l.qty, 'Batch ' + l.no), ...s.moves] }))
    audit('Expired write-off', p.name + ' ' + l.qty)
  }
  return (
    <div className="grid">
      <small className="mut">Showing expired items and items expiring within {st.settings.expDays} days.</small>
      {!rows.length && <p className="mut">Nothing expiring soon</p>}
      {rows.map(({ p, l }) => (
        <div key={p.id + l.id} className="raised prow">
          <div className="pinfo"><b>{p.name}</b><small>Batch {l.no || '-'} · {wn(st, l.wh)} · qty {l.qty} · {l.exp}{l.exp < td ? ' · EXPIRED' : ''}</small></div>
          {l.exp < td && <button className="btn bad" onClick={() => off({ p, l })}>Write off</button>}
        </div>
      ))}
    </div>
  )
}
function History() {
  const st = useStore()
  const [ty, setTy] = useState('all')
  const [r, setR] = useState('30')
  const types = ['all', 'sale', 'purchase', 'add', 'remove', 'damaged', 'expired', 'transfer_out', 'transfer_in', 'count', 'adjust', 'opening']
  const rows = st.moves.filter((m) => (ty === 'all' || m.type === ty) && inR(m.date, r))
  const loss = st.moves.filter((m) => (m.type === 'damaged' || m.type === 'expired') && inR(m.date, r)).reduce((a, m) => a + Math.abs(m.qty) * num(m.cost), 0)
  return (
    <div className="grid">
      <Sel className="input" value={r} onChange={(e) => setR(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Sel>
      <div className="chips">{types.map((k) => <button key={k} className={'btn' + (ty === k ? ' on' : '')} onClick={() => setTy(k)}>{k}</button>)}</div>
      <small className="mut">Damaged and expired loss at cost in this period: {money(loss)}</small>
      <Tbl name="Stock movements" rows={rows} cols={[['Date', (m) => new Date(m.date).toLocaleString()], ['Type', (m) => m.type], ['Product', (m) => m.name], ['Warehouse', (m) => wn(st, m.wh)], ['Qty', (m) => m.qty], ['Cost value', (m) => money(Math.abs(m.qty) * num(m.cost))], ['User', (m) => m.user], ['Note', (m) => m.note]]} />
    </div>
  )
}
function Labels() {
  const st = useStore()
  const [c, setC] = useState({})
  const [mode, setMode] = useState('a4')
  const [pr, setPr] = useState(true)
  const go = () => {
    const items = st.products.filter((p) => num(c[p.id]) > 0 && (p.barcode || p.sku)).map((p) => ({ name: p.name, code: p.barcode || p.sku, price: money(p.price), copies: Math.min(200, num(c[p.id])) }))
    if (!items.length) return window.alert('Set copies for products that have a barcode or SKU')
    printLabels(items, { mode, price: pr })
  }
  return (
    <div className="grid">
      <Sel className="input" value={mode} onChange={(e) => setMode(e.target.value)}><option value="a4">A4 sheet (50x30mm labels)</option><option value="50x30">Label roll 50x30mm</option><option value="40x25">Label roll 40x25mm</option></Sel>
      <label className="lbl"><span><input type="checkbox" checked={pr} onChange={(e) => setPr(e.target.checked)} /> Show price</span></label>
      {st.products.map((p) => (
        <div key={p.id} className="raised prow">
          <div className="pinfo"><b>{p.name}</b><small>{p.barcode || p.sku || 'no barcode or SKU'}</small></div>
          <input className="input" style={{ width: 80 }} type="number" inputMode="numeric" min="0" placeholder="Copies" value={c[p.id] ?? ''} onChange={(e) => setC({ ...c, [p.id]: e.target.value })} />
        </div>
      ))}
      <button className="btn pri" onClick={go}>Print labels</button>
    </div>
  )
}
const TABS = [['stock', 'Stock'], ['adjust', 'Adjust'], ['receive', 'Receive'], ['transfer', 'Transfers'], ['count', 'Count'], ['expiry', 'Expiry'], ['history', 'History'], ['labels', 'Labels']]
export default function Inventory() {
  const [t, setT] = useState('stock')
  return (
    <div>
      <Tabs v={t} on={setT} items={TABS} />
      {t === 'stock' && <Stock />}
      {t === 'adjust' && <Adjust />}
      {t === 'receive' && <Receive />}
      {t === 'transfer' && <Transfer />}
      {t === 'count' && <Count />}
      {t === 'expiry' && <Expiry />}
      {t === 'history' && <History />}
      {t === 'labels' && <Labels />}
    </div>
  )
}
