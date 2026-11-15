import { useState, useMemo, useRef, useEffect } from 'react'
import Sel from './Sel.jsx'
import { useStore, setState, getState } from './store.js'
import { useX, setX, uid } from './xstore.js'
import { money, num, r2, dkey, isLow, qtyAt, tracked, take, put, mvRow, audit, MAIN, dl, csv, curUser, calcSale } from './inv.js'
import { ono, MLABEL, useCart } from './cart.js'
import { Tbl, Tabs } from './ui.jsx'
import { Sh, R, useMeasure } from './Biz2.jsx'
import { printDoc } from './print.js'
import { pref, setPref, getRollup, getLimit, probeQuota, planArchive, exportArchive, exportOrdersCsv, purgeArchive, importArchive, shrinkImages, doBackup, toast, shareText } from './fx.js'
const sum = (a, f) => r2(a.reduce((s, o) => s + num(f(o)), 0))
const span = (n, off = 0) => { const a = []; for (let i = n - 1 + off; i >= off; i--) { const d = new Date(); d.setDate(d.getDate() - i); a.push(dkey(d)) } return a }
const grp = (os) => { const m = {}; os.forEach((o) => { const k = dkey(o.date); (m[k] || (m[k] = [])).push(o) }); return m }
const Bars = ({ vals, tip }) => { const mx = Math.max(1, ...vals); return <div className="bars">{vals.map((v, i) => <i key={i} title={tip[i]} style={{ height: Math.max(2, (v / mx) * 100) + '%' }} />)}</div> }
const fmt = (st) => (n) => (st.settings.currency || '') + r2(n).toFixed(2)
const readFile = (e, cb) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const r = new FileReader(); r.onload = () => cb(String(r.result)); r.readAsText(f) }
const parseCsv = (txt) => txt.split(/\r?\n/).filter((l) => l.trim()).map((l) => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c.trim()); c = '' } else c += ch } o.push(c.trim()); return o })

export function Trends({ close }) {
  const st = useStore(); const [t, setT] = useState('day'); const [n, setN] = useState('14')
  const N = Number(n)
  const ds = span(N), pv = span(N, N)
  const g = useMemo(() => grp(st.orders), [st.orders])
  const os = ds.flatMap((d) => g[d] || [])
  const po = pv.flatMap((d) => g[d] || [])
  const vs = (st.voided || []).filter((o) => ds.includes(dkey(o.voidAt || o.date)))
  const cur = sum(os, (o) => o.total), pre = sum(po, (o) => o.total)
  const ch = pre > 0 ? Math.round(((cur - pre) / pre) * 100) : null
  const per = ds.map((d) => sum(g[d] || [], (o) => o.total))
  let body = null
  if (t === 'day') {
    const act = ds.map((d, i) => [d, per[i]]).filter((x) => x[1] > 0)
    const best = act.reduce((a, b) => (!a || b[1] > a[1] ? b : a), null)
    const worst = act.reduce((a, b) => (!a || b[1] < a[1] ? b : a), null)
    body = (<><Bars vals={per} tip={ds.map((d, i) => d + ': ' + money(per[i]))} />
      <div className="sumbox inset"><R a="Sales in period" b={money(cur)} /><R a="Previous period" b={money(pre)} /><R a="Change" b={ch === null ? 'n/a' : (ch >= 0 ? '+' : '') + ch + '%'} />{best && <R a="Best day" b={best[0] + ' · ' + money(best[1])} />}{worst && <R a="Weakest day" b={worst[0] + ' · ' + money(worst[1])} />}</div></>)
  } else if (t === 'hour') {
    const h = Array(24).fill(0)
    os.forEach((o) => { h[new Date(o.date).getHours()] += num(o.total) })
    const pk = h.indexOf(Math.max(...h))
    body = (<><Bars vals={h} tip={h.map((v, i) => i + ':00 · ' + money(v))} /><div className="hrs mini"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div><R a="Peak hour" b={cur > 0 ? pk + ':00 to ' + (pk + 1) + ':00' : 'no sales'} /></>)
  } else if (t === 'basket') {
    const it = os.reduce((a, o) => a + o.items.reduce((b, i) => b + num(i.qty), 0), 0)
    const all = os.length + vs.length
    body = (<div className="sumbox inset"><R a="Orders" b={os.length} /><R a="Average basket" b={money(os.length ? cur / os.length : 0)} /><R a="Items per order" b={os.length ? (it / os.length).toFixed(1) : '0'} /><R a="Voided orders" b={vs.length} /><R a="Void rate" b={(all ? Math.round((vs.length / all) * 100) : 0) + '%'} /></div>)
  } else if (t === 'tax') {
    const rows = ds.map((d) => ({ d, n: (g[d] || []).length, s: sum(g[d] || [], (o) => o.total), x: sum(g[d] || [], (o) => o.tax) })).filter((r) => r.n)
    body = (<><R big a={(st.settings.taxName || 'Tax') + ' collected'} b={money(sum(os, (o) => o.tax))} /><Tbl name="tax-by-day" rows={rows} cols={[['Date', (r) => r.d], ['Orders', (r) => r.n], ['Sales', (r) => money(r.s)], ['Tax', (r) => money(r.x)]]} /></>)
  } else {
    const rev = sum(os, (o) => num(o.total) - num(o.tax)), cg = sum(os, (o) => o.cogs)
    const ex = sum((st.expenses || []).filter((e) => ds.includes(dkey(e.date))), (e) => e.amount)
    body = (<><div className="sumbox inset"><R a="Revenue (without tax)" b={money(rev)} /><R a="Cost of goods" b={money(cg)} /><R a="Gross profit" b={money(rev - cg)} /><R a="Expenses" b={money(ex)} /><R big a="Net profit" b={money(rev - cg - ex)} /></div><small className="mut">Orders without a recorded cost count as cost 0. Expenses are read from each expense's amount field.</small></>)
  }
  return (
    <Sh t="Trends and profit" close={close} w={680}>
      <Tabs v={t} on={setT} items={[['day', 'Daily'], ['hour', 'Peak hours'], ['basket', 'Basket'], ['tax', 'Tax'], ['pl', 'Profit']]} />
      <Sel className="input" value={n} onChange={(e) => setN(e.target.value)}>{['7', '14', '30', '60', '90'].map((k) => <option key={k} value={k}>Last {k} days</option>)}</Sel>
      {body}
    </Sh>
  )
}
export function Lifetime({ close }) {
  const st = useStore(); const ro = getRollup()
  const y = {}
  const add = (k, n, s, tx, c) => { const o = y[k] || (y[k] = { n: 0, s: 0, t: 0, c: 0 }); o.n += n; o.s = r2(o.s + s); o.t = r2(o.t + tx); o.c = r2(o.c + c) }
  st.orders.forEach((o) => add(dkey(o.date).slice(0, 4), 1, num(o.total), num(o.tax), num(o.cogs)))
  Object.entries(ro).forEach(([k, v]) => add(k.slice(0, 4), v.n, v.s, v.t, v.c))
  const rows = Object.entries(y).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([k, v]) => ({ k, ...v, gp: r2(v.s - v.t - v.c) }))
  const arc = Object.values(ro).reduce((a, v) => a + v.n, 0)
  const tot = rows.reduce((a, r) => ({ n: a.n + r.n, s: a.s + r.s, gp: a.gp + r.gp }), { n: 0, s: 0, gp: 0 })
  return (
    <Sh t="Lifetime totals (with archive)" close={close} w={620}>
      <div className="sumbox inset"><R a="Orders on this device" b={st.orders.length} /><R a="Orders in archive rollup" b={arc} /><R a="All-time orders" b={tot.n} /><R a="All-time sales" b={money(tot.s)} /><R big a="All-time gross profit" b={money(tot.gp)} /></div>
      <Tbl name="sales-by-year" rows={rows} cols={[['Year', (r) => r.k], ['Orders', (r) => r.n], ['Sales', (r) => money(r.s)], ['Tax', (r) => money(r.t)], ['Gross profit', (r) => money(r.gp)]]} />
      <small className="mut">Archived days come from the permanent rollup. Loading an archive file back removes its rollup, so nothing is counted twice.</small>
    </Sh>
  )
}
export function Goals({ close }) {
  const st = useStore(); const [g, setG] = useState(pref('goal', ''))
  const goal = num(g); const now = new Date()
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const w = span(7), mk = dkey(now).slice(0, 7)
  const rows = [['Today', sum(st.orders.filter((o) => dkey(o.date) === dkey(now)), (o) => o.total), goal], ['Last 7 days', sum(st.orders.filter((o) => w.includes(dkey(o.date))), (o) => o.total), goal * 7], ['This month', sum(st.orders.filter((o) => dkey(o.date).slice(0, 7) === mk), (o) => o.total), goal * dim]]
  return (
    <Sh t="Sales goals" close={close} w={460}>
      <label className="lbl">Daily sales goal<input className="input" type="number" inputMode="decimal" value={g} onChange={(e) => { setG(e.target.value); setPref('goal', e.target.value) }} /></label>
      {rows.map(([l, v, tg]) => { const p = tg > 0 ? Math.round((v / tg) * 100) : 0; return (<div key={l}><R a={l + ' · ' + money(v) + (tg > 0 ? ' of ' + money(tg) : '')} b={tg > 0 ? p + '%' : ''} /><div className="meter"><i style={{ width: Math.min(100, p) + '%' }} /></div></div>) })}
    </Sh>
  )
}
export function EndDay({ close }) {
  const st = useStore(); const f = fmt(st); const d = dkey(new Date())
  const os = st.orders.filter((o) => dkey(o.date) === d)
  const vs = (st.voided || []).filter((o) => dkey(o.voidAt || o.date) === d)
  const pm = {}; os.forEach((o) => (o.payments || [{ method: o.method, amount: o.paid ?? o.total }]).forEach((p) => { const k = MLABEL[p.method] || p.method; pm[k] = r2((pm[k] || 0) + num(p.amount)) }))
  const it = {}; os.forEach((o) => o.items.forEach((i) => { it[i.name] = (it[i.name] || 0) + num(i.qty) }))
  const top = Object.entries(it).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const text = [st.settings.name, 'Daily summary ' + d, 'Orders ' + os.length, 'Sales ' + f(sum(os, (o) => o.total)), 'Tax ' + f(sum(os, (o) => o.tax)), 'Discounts ' + f(sum(os, (o) => o.disc)), 'Voids ' + vs.length + ' (' + f(sum(vs, (o) => o.total)) + ')', '', 'Payments', ...Object.entries(pm).map(([k, v]) => k + ' ' + f(v)), '', 'Top items', ...top.map(([k, v]) => v + ' x ' + k)].join('\n')
  return (
    <Sh t="End-of-day summary" close={close} w={440}>
      <pre className="inset" style={{ padding: 12, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{text}</pre>
      <button className="btn pri" onClick={() => shareText(text)}>Copy / share summary</button>
    </Sh>
  )
}
export function CashCount({ close }) {
  const [d, setD] = useState(pref('denoms', '1000,500,200,100,50,20,10,5,1')); const [c, setC] = useState({}); const [ex, setEx] = useState('')
  const dn = d.split(',').map((z) => num(z)).filter((z) => z > 0)
  const tot = r2(dn.reduce((a, v) => a + v * Math.floor(num(c[v])), 0))
  return (
    <Sh t="Cash counter" close={close} w={420}>
      {dn.map((v) => <div key={v} className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><b style={{ width: 70 }}>{v}</b><input className="input" type="number" inputMode="numeric" placeholder="0" value={c[v] || ''} onChange={(e) => setC({ ...c, [v]: e.target.value })} /><span style={{ width: 90, textAlign: 'right' }}>{money(v * Math.floor(num(c[v])))}</span></div>)}
      <R big a="Counted total" b={money(tot)} />
      <input className="input" type="number" inputMode="decimal" placeholder="Expected amount (optional)" value={ex} onChange={(e) => setEx(e.target.value)} />
      {ex !== '' && <R a="Difference" b={money(tot - num(ex))} />}
      <label className="lbl">Denominations (comma separated)<input className="input" value={d} onChange={(e) => { setD(e.target.value); setPref('denoms', e.target.value) }} /></label>
      <button className="btn" onClick={() => setC({})}>Clear counts</button>
    </Sh>
  )
}
export function Calcs({ close }) {
  const st = useStore(); const [t, setT] = useState('tip'); const [a, setA] = useState(''); const [b, setB] = useState('')
  const A = num(a), B = num(b)
  let out = [], ph = ['', '']
  if (t === 'tip') { const p = B || 10; ph = ['Bill amount', 'Tip % (default 10)']; out = [['Tip', money((A * p) / 100)], ['Total with tip', money(A * (1 + p / 100))]] }
  else if (t === 'split') { const n = Math.max(1, Math.floor(B) || 2); ph = ['Total bill', 'People (default 2)']; out = [['Each pays', money(A / n)]] }
  else if (t === 'margin') { ph = ['Cost', 'Selling price']; out = [['Profit per unit', money(B - A)], ['Margin', (B > 0 ? r2(((B - A) / B) * 100) : 0) + '%'], ['Markup', (A > 0 ? r2(((B - A) / A) * 100) : 0) + '%']] }
  else { const rt = B || num(st.settings.tax); ph = ['Amount', 'Tax % (default ' + (st.settings.tax || 0) + ')']; out = [['Tax added', money((A * rt) / 100)], ['Price with tax', money(A * (1 + rt / 100))], ['Tax inside price', money(A - A / (1 + rt / 100))], ['Price without tax', money(A / (1 + rt / 100))]] }
  return (
    <Sh t="Quick calculators" close={close} w={420}>
      <Tabs v={t} on={(k) => { setT(k); setA(''); setB('') }} items={[['tip', 'Tip'], ['split', 'Split'], ['margin', 'Margin'], ['tax', 'Tax']]} />
      <div className="row2"><input className="input" type="number" inputMode="decimal" placeholder={ph[0]} value={a} onChange={(e) => setA(e.target.value)} /><input className="input" type="number" inputMode="decimal" placeholder={ph[1]} value={b} onChange={(e) => setB(e.target.value)} /></div>
      <div className="sumbox inset">{out.map(([k, v]) => <R key={k} a={k} b={v} />)}</div>
    </Sh>
  )
}
export function StockCount({ close }) {
  const st = useStore(); const wh = st.settings.activeWh || MAIN
  const [c, setC] = useState({}); const [q, setQ] = useState(''); const [m, setM] = useState('')
  const cnt = (p) => Math.max(0, Math.floor(num(c[p.id])))
  const list = st.products.filter(tracked).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
  const diffs = st.products.filter((p) => tracked(p) && c[p.id] !== undefined && c[p.id] !== '' && cnt(p) !== qtyAt(p, wh))
  const go = () => {
    if (!diffs.length) return setM('No differences to apply')
    if (!window.confirm('Adjust stock for ' + diffs.length + ' product(s)?')) return
    const moves = [], map = {}
    diffs.forEach((p) => { const d = cnt(p) - qtyAt(p, wh); map[p.id] = d > 0 ? put(p, wh, d, '', '') : take(p, -d, wh).p; moves.push(mvRow('adjust', p, wh, d, 'Stock count')) })
    setState((s) => ({ products: s.products.map((p) => map[p.id] || p), moves: [...moves, ...s.moves].slice(0, 5000) }))
    audit('Stock count', diffs.length + ' adjusted'); setC({}); setM('Adjusted ' + diffs.length + ' product(s)')
  }
  return (
    <Sh t="Stock count" close={close} w={520}>
      <input className="input" placeholder="Search product" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.slice(0, 80).map((p) => <div key={p.id} className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><span style={{ flex: 1 }}>{p.name}<small className="mut"> · system {qtyAt(p, wh)}</small></span><input className="input" style={{ width: 90 }} type="number" inputMode="numeric" placeholder="Counted" value={c[p.id] === undefined ? '' : c[p.id]} onChange={(e) => setC({ ...c, [p.id]: e.target.value })} /></div>)}
      {list.length > 80 && <small className="mut">Showing 80 of {list.length}. Use search.</small>}
      <R a="Products that differ" b={diffs.length} />
      <button className="btn pri" onClick={go}>Apply count adjustments</button>
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function PO({ close }) {
  const st = useStore(); const x = useX(); const [q, setQ] = useState({}); const [sp, setSp] = useState('')
  const low = st.products.filter((p) => isLow(p, st))
  const n = (p) => Math.max(0, Math.floor(num(q[p.id] === undefined ? 10 : q[p.id])))
  const rows = low.filter((p) => n(p) > 0)
  const est = sum(rows, (p) => n(p) * num(p.cost))
  const text = ['PURCHASE ORDER', st.settings.name, new Date().toLocaleDateString(), ...(sp ? ['Supplier: ' + sp] : []), '', ...rows.map((p) => n(p) + ' x ' + p.name + (p.sku ? ' (' + p.sku + ')' : '')), '', 'Estimated cost ' + money(est)].join('\n')
  return (
    <Sh t="Purchase order" close={close} w={520}>
      <Sel className="input" value={sp} onChange={(e) => setSp(e.target.value)}><option value="">No supplier</option>{(x.sup || []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</Sel>
      {low.length === 0 && <small className="mut">Nothing is low on stock.</small>}
      {low.map((p) => <div key={p.id} className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><span style={{ flex: 1 }}>{p.name}<small className="mut"> · have {qtyAt(p)}</small></span><input className="input" style={{ width: 80 }} type="number" inputMode="numeric" value={q[p.id] === undefined ? '10' : q[p.id]} onChange={(e) => setQ({ ...q, [p.id]: e.target.value })} /></div>)}
      <R big a="Estimated cost" b={money(est)} />
      <button className="btn pri" disabled={!rows.length} onClick={() => shareText(text)}>Copy / share order</button>
    </Sh>
  )
}
export function PriceList({ close }) {
  const st = useStore(); const f = fmt(st)
  const cats = {}; st.products.forEach((p) => { (cats[p.cat || 'Other'] = cats[p.cat || 'Other'] || []).push(p) })
  const text = [st.settings.name + ' price list', ...Object.entries(cats).flatMap(([c, a]) => ['', c.toUpperCase(), ...a.map((p) => p.name + '  ' + f(p.price))])].join('\n')
  const html = '<h2>' + st.settings.name + ' price list</h2>' + Object.entries(cats).map(([c, a]) => '<h3>' + c + '</h3>' + a.map((p) => '<div>' + String(p.name).replace(/[&<>]/g, '') + ' <b style="float:right">' + f(p.price) + '</b></div>').join('')).join('')
  return (
    <Sh t="Price list" close={close} w={460}>
      <pre className="inset" style={{ padding: 12, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', maxHeight: '50dvh', overflow: 'auto' }}>{text}</pre>
      <div className="row2"><button className="btn pri" onClick={() => shareText(text)}>Copy / share</button><button className="btn" onClick={() => printDoc(html, 'A4', 'body{font:13px sans-serif;padding:12mm}')}>Print</button></div>
    </Sh>
  )
}
export function Suppliers({ close }) {
  const x = useX(); const [n, setN] = useState(''); const [p, setP] = useState('')
  const l = x.sup || []
  return (
    <Sh t="Suppliers" close={close} w={460}>
      <div className="row2"><input className="input" placeholder="Supplier name" value={n} onChange={(e) => setN(e.target.value)} /><input className="input" inputMode="tel" placeholder="Phone" value={p} onChange={(e) => setP(e.target.value)} /></div>
      <button className="btn pri" onClick={() => { if (n.trim()) { setX({ sup: [{ id: uid(), name: n.trim(), phone: p.trim() }, ...l] }); setN(''); setP('') } }}>Add supplier</button>
      {l.map((s) => <div key={s.id} className="raised prow"><div className="pinfo"><b>{s.name}</b><small>{s.phone}</small></div>{s.phone && <a className="btn sm" href={'tel:' + s.phone}>Call</a>}<button className="btn bad sm" onClick={() => setX({ sup: l.filter((z) => z.id !== s.id) })}>x</button></div>)}
      {!l.length && <small className="mut">No suppliers yet. They appear in Purchase order.</small>}
    </Sh>
  )
}
export function Margins({ close }) {
  const st = useStore(); const [t, setT] = useState('low'); const [th, setTh] = useState('15')
  const d90 = span(90), d30 = span(30)
  let body = null
  if (t === 'low') {
    const rows = st.products.filter((p) => num(p.price) > 0).map((p) => ({ p, m: r2(((num(p.price) - num(p.cost)) / num(p.price)) * 100) })).filter((r) => r.m < num(th)).sort((a, b) => a.m - b.m)
    body = (<><input className="input" type="number" inputMode="numeric" placeholder="Margin below %" value={th} onChange={(e) => setTh(e.target.value)} /><Tbl name="low-margin" rows={rows} cols={[['Product', (r) => r.p.name], ['Cost', (r) => money(r.p.cost)], ['Price', (r) => money(r.p.price)], ['Margin', (r) => r.m + '%']]} /></>)
  } else if (t === 'abc') {
    const m = {}
    st.orders.filter((o) => d90.includes(dkey(o.date))).forEach((o) => o.items.forEach((i) => { m[i.name] = (m[i.name] || 0) + num(i.qty) * num(i.price) - num(i.bulk) }))
    const a = Object.entries(m).sort((x, y) => y[1] - x[1]); const tot = a.reduce((s, z) => s + z[1], 0) || 1
    let cum = 0
    const rows = a.map(([k, v]) => { cum += v; const c = cum - v < tot * 0.8 ? 'A' : cum - v < tot * 0.95 ? 'B' : 'C'; return { k, v, c, s: Math.round((v / tot) * 100) } })
    body = (<><small className="mut">Last 90 days. A = first 80% of revenue, B = next 15%, C = last 5%.</small><Tbl name="abc-analysis" rows={rows} cols={[['Class', (r) => r.c], ['Product', (r) => r.k], ['Revenue', (r) => money(r.v)], ['Share', (r) => r.s + '%']]} /></>)
  } else {
    const m = {}
    st.orders.filter((o) => d30.includes(dkey(o.date))).forEach((o) => o.items.forEach((i) => { m[i.id] = (m[i.id] || 0) + num(i.qty) }))
    const rows = st.products.filter((p) => tracked(p) && m[p.id] > 0).map((p) => ({ p, per: m[p.id] / 30, cov: qtyAt(p) / (m[p.id] / 30) })).sort((a, b) => a.cov - b.cov)
    body = (<><small className="mut">Based on the last 30 days of sales.</small><Tbl name="days-of-cover" rows={rows} cols={[['Product', (r) => r.p.name], ['In stock', (r) => qtyAt(r.p)], ['Sold per day', (r) => r.per.toFixed(1)], ['Days left', (r) => Math.round(r.cov)]]} /></>)
  }
  return (
    <Sh t="Margins and stock cover" close={close} w={680}>
      <Tabs v={t} on={setT} items={[['low', 'Low margin'], ['abc', 'ABC'], ['cover', 'Days of cover']]} />
      {body}
    </Sh>
  )
}
export function Segments({ close }) {
  const st = useStore(); const [t, setT] = useState('seg'); const [d, setD] = useState('30')
  const [tpl, setTpl] = useState('Hi {name}, we miss you at ' + st.settings.name + '! Come visit us again soon.')
  const info = {}
  st.orders.forEach((o) => { if (!o.customerId) return; const a = info[o.customerId] || (info[o.customerId] = { n: 0, s: 0, last: '' }); a.n++; a.s += num(o.total); if (o.date > a.last) a.last = o.date })
  const spent = st.customers.map((c) => (info[c.id] || { s: 0 }).s).sort((a, b) => b - a)
  const vip = spent.length ? spent[Math.max(0, Math.ceil(spent.length * 0.1) - 1)] : 0
  const rows = st.customers.map((c) => { const a = info[c.id] || { n: 0, s: 0, last: '' }; const ag = a.last ? Math.floor((Date.now() - new Date(a.last)) / 864e5) : null; const seg = !a.n ? 'No orders' : ag > 60 ? 'At risk' : a.s >= vip && a.s > 0 ? 'VIP' : a.n <= 1 ? 'New' : 'Regular'; return { c, ...a, ag, seg } })
  const cn = {}; rows.forEach((r) => { cn[r.seg] = (cn[r.seg] || 0) + 1 })
  const win = rows.filter((r) => r.n > 0 && r.ag >= num(d)).sort((a, b) => b.ag - a.ag)
  const link = (r, k) => { const m = tpl.replace('{name}', r.c.name); const ph = String(r.c.phone || '').replace(/[^\d+]/g, ''); return k === 'wa' ? 'https://wa.me/' + ph.replace('+', '') + '?text=' + encodeURIComponent(m) : 'sms:' + ph + '?body=' + encodeURIComponent(m) }
  const pts = st.customers.reduce((a, c) => a + num(c.points), 0)
  return (
    <Sh t="Customer segments" close={close} w={640}>
      <Tabs v={t} on={setT} items={[['seg', 'Segments'], ['win', 'Win-back'], ['pts', 'Loyalty']]} />
      {t === 'seg' && (<><div className="sumbox inset">{Object.entries(cn).map(([k, v]) => <R key={k} a={k} b={v} />)}</div><Tbl name="customer-segments" rows={rows} cols={[['Customer', (r) => r.c.name], ['Segment', (r) => r.seg], ['Orders', (r) => r.n], ['Spent', (r) => money(r.s)], ['Last visit', (r) => (r.ag === null ? '' : r.ag + ' days ago')]]} /></>)}
      {t === 'win' && (<>
        <div className="row2"><input className="input" type="number" inputMode="numeric" value={d} onChange={(e) => setD(e.target.value)} placeholder="Days away" /></div>
        <textarea className="input" style={{ height: 70, padding: 8 }} value={tpl} onChange={(e) => setTpl(e.target.value)} />
        {win.length === 0 && <small className="mut">Nobody has been away that long.</small>}
        {win.map((r) => <div key={r.c.id} className="raised prow"><div className="pinfo"><b>{r.c.name}</b><small>{r.ag} days · {r.c.phone || 'no phone'}</small></div>{r.c.phone && <><a className="btn sm" href={link(r, 'wa')} target="_blank" rel="noreferrer">WhatsApp</a><a className="btn sm" href={link(r, 'sms')}>SMS</a></>}</div>)}
      </>)}
      {t === 'pts' && (<><div className="sumbox inset"><R a="Points outstanding" b={pts} /><R a="Customers holding points" b={st.customers.filter((c) => num(c.points) > 0).length} /></div><Tbl name="top-points" rows={[...st.customers].sort((a, b) => num(b.points) - num(a.points)).slice(0, 10)} cols={[['Customer', (c) => c.name], ['Points', (c) => num(c.points)]]} /></>)}
    </Sh>
  )
}
export function Leaders({ close }) {
  const st = useStore(); const [r, setR] = useState('1')
  const ds = span(Number(r)); const os = st.orders.filter((o) => ds.includes(dkey(o.date)))
  const m = {}; os.forEach((o) => { const a = m[o.by || 'Admin'] || (m[o.by || 'Admin'] = { n: 0, s: 0 }); a.n++; a.s += num(o.total) })
  const tot = Object.values(m).reduce((a, b) => a + b.s, 0) || 1
  const rows = Object.entries(m).sort((a, b) => b[1].s - a[1].s)
  return (
    <Sh t="Cashier leaderboard" close={close} w={520}>
      <Sel className="input" value={r} onChange={(e) => setR(e.target.value)}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></Sel>
      <Tbl name="leaderboard" rows={rows} cols={[['Cashier', (x) => x[0]], ['Orders', (x) => x[1].n], ['Sales', (x) => money(x[1].s)], ['Share', (x) => Math.round((x[1].s / tot) * 100) + '%']]} />
    </Sh>
  )
}
export function TableBoard({ close }) {
  const st = useStore()
  const age = (d) => { const m = Math.floor((Date.now() - new Date(d)) / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min' }
  return (
    <Sh t="Open tables and parked sales" close={close} w={520}>
      {st.parked.length === 0 && <small className="mut">No parked sales.</small>}
      {st.parked.map((p) => <div key={p.id} className="raised prow"><div className="pinfo"><b>{p.label || (p.cart && p.cart.table) || 'Sale ' + p.no}</b><small>{(p.cart && p.cart.otype) || 'Dine-in'} · {(p.cart ? p.cart.items : []).length} lines · waiting {age(p.date)} · {p.by}</small></div><b>{money(sum(p.cart ? p.cart.items : [], (i) => num(i.qty) * num(i.price)))}</b></div>)}
      <button className="btn pri" onClick={() => { window.dispatchEvent(new CustomEvent('pos-nav', { detail: 'hold' })); close() }}>Open Parked page to resume</button>
    </Sh>
  )
}
export function Handover({ close }) {
  const x = useX(); const [v, setV] = useState('')
  const h = x.handover
  return (
    <Sh t="Shift handover note" close={close} w={440}>
      {h && <div className="banner" style={{ cursor: 'default' }}><b>{h.by}</b> · {new Date(h.date).toLocaleString()}<br />{h.t}</div>}
      <textarea className="input" style={{ height: 100, padding: 8 }} placeholder="Note for the next shift" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn pri" onClick={() => { if (v.trim()) { setX({ handover: { t: v.trim(), by: curUser().name, date: new Date().toISOString() } }); setV('') } }}>Save note</button>
    </Sh>
  )
}
export function CustDisplay({ close }) {
  const st = useStore(); const cart = useCart()
  const cust = st.customers.find((c) => c.id === cart.customer)
  const t = calcSale(cart, st, cust)
  return (
    <div className="cdisp">
      <div className="row2" style={{ alignItems: 'center' }}><h1 style={{ margin: 0 }}>{st.settings.name}</h1><button className="btn" style={{ flex: 'none' }} onClick={close}>Exit</button></div>
      <div style={{ overflow: 'auto' }}>{t.lines.length === 0 && <p style={{ fontSize: 24, color: '#94a3b8' }}>Welcome</p>}{t.lines.map((i) => <div key={i.id} className="cl"><span>{i.qty} x {i.name}</span><span>{money(i.gross - i.bulk)}</span></div>)}</div>
      <div className="ct"><span>Total</span><span>{money(t.total)}</span></div>
    </div>
  )
}
export function DataIO({ close }) {
  const st = useStore(); const [m, setM] = useState(''); const fr = useRef(null)
  const wh = st.settings.activeWh || MAIN
  const exP = () => dl('products-' + dkey(new Date()) + '.csv', csv([['Name', 'Price', 'Cost', 'Category', 'Barcode', 'Stock'], ...st.products.map((p) => [p.name, p.price, p.cost, p.cat || '', p.barcode || '', tracked(p) ? qtyAt(p) : ''])]))
  const exC = () => { const sp = {}; st.orders.forEach((o) => { if (o.customerId) sp[o.customerId] = (sp[o.customerId] || 0) + num(o.total) }); dl('customers-' + dkey(new Date()) + '.csv', csv([['Name', 'Phone', 'Points', 'Spent'], ...st.customers.map((c) => [c.name, c.phone || '', num(c.points), r2(sp[c.id] || 0)])])) }
  const imp = (e) => readFile(e, (txt) => {
    const rows = parseCsv(txt); if (rows.length && isNaN(Number(rows[0][1]))) rows.shift()
    const have = new Set(st.products.map((p) => (p.barcode ? 'b' + p.barcode : 'n' + String(p.name).toLowerCase())))
    const add = []
    rows.forEach(([name, price, cost, cat, barcode, stock]) => {
      if (!name || !(num(price) > 0)) return
      const key = barcode ? 'b' + barcode : 'n' + name.toLowerCase(); if (have.has(key)) return; have.add(key)
      let p = { id: uid(), name, price: num(price), cost: num(cost), cat: cat || '', barcode: barcode || '', sku: '', stock: '', lots: [] }
      if (stock !== undefined && stock !== '') { p = { ...p, stock: 0 }; const n = Math.max(0, Math.floor(num(stock))); if (n > 0) p = put(p, wh, n, '', '') }
      add.push(p)
    })
    if (!add.length) return setM('Nothing new to import')
    setState((s) => ({ products: [...add, ...s.products] })); audit('Products imported', add.length + ''); setM('Imported ' + add.length + ' product(s)')
  })
  return (
    <Sh t="Import and export" close={close} w={440}>
      <div className="row2"><button className="btn" onClick={exP}>Products CSV</button><button className="btn" onClick={exC}>Customers CSV</button></div>
      <button className="btn pri" onClick={() => fr.current.click()}>Import products from CSV</button>
      <input ref={fr} type="file" accept=".csv,text/csv" hidden onChange={imp} />
      <small className="mut">Columns: name, price, cost, category, barcode, stock. Stock is optional (blank means not tracked). Products with an existing barcode or name are skipped.</small>
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function DataCenter2({ close }) {
  const st = useStore(); const m = useMeasure()
  const [days, setDays] = useState(pref('archdays', '30'))
  const [plan, setPlan] = useState(null); const [ex, setEx] = useState(false); const [ver, setVer] = useState(false); const [msg, setMsg] = useState(''); const [est, setEst] = useState(null); const [, f] = useState(0)
  const fr = useRef(null), vr = useRef(null), br = useRef(null)
  useEffect(() => { try { navigator.storage && navigator.storage.estimate && navigator.storage.estimate().then(setEst) } catch (e) {} }, [])
  const sizes = useMemo(() => Object.entries(getState()).map(([k, v]) => [k, JSON.stringify(v).length]).sort((a, b) => b[1] - a[1]).slice(0, 7), [st])
  const mon = {}
  Object.entries(getRollup()).forEach(([k, v]) => { const o = mon[k.slice(0, 7)] || (mon[k.slice(0, 7)] = { n: 0, s: 0 }); o.n += v.n; o.s = r2(o.s + v.s) })
  const months = Object.entries(mon).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6)
  const kb = (n) => Math.round(n / 1024) + ' KB'
  const build = () => { setPref('archdays', days); setPlan(planArchive(Math.max(0, num(days)))); setEx(false); setVer(false); setMsg('') }
  const exportIt = () => { exportArchive(plan); setEx(true); setVer(false); toast('Archive file downloaded', 'ok') }
  const verify = (e) => readFile(e, (txt) => {
    try {
      const j = JSON.parse(txt)
      const ok = j && j.app === 'pos-archive' && j.data && Object.keys(plan.ids).every((c) => { const have = new Set((j.data[c] || []).map((x) => x && x.id)); return [...plan.ids[c]].every((id) => have.has(id)) })
      setVer(!!ok); setMsg(ok ? 'File verified: it holds all ' + plan.n + ' records.' : 'That file is missing records. Export again.')
    } catch (err) { setVer(false); setMsg('Could not read that file') }
  })
  const purge = () => {
    if (!ver || !plan) return
    if (!window.confirm('Delete ' + plan.n + ' verified records from this device?')) return
    purgeArchive(plan); setMsg('Done. ' + plan.n + ' records removed from this device.'); setPlan(null); setEx(false); setVer(false)
  }
  const load = (e) => readFile(e, (txt) => { try { setMsg(importArchive(JSON.parse(txt))) } catch (err) { setMsg('Could not read that file') } })
  const restore = (e) => readFile(e, (txt) => {
    try {
      const j = JSON.parse(txt)
      if (!j || j.app !== 'pos' || !Array.isArray(j.products) || !Array.isArray(j.orders)) return setMsg('This is not a valid backup file')
      if (!window.confirm('Replace ALL data on this device with this backup? A copy of the current data is downloaded first.')) return
      doBackup()
      const { app, version, ...rest } = j
      setState(() => rest); setMsg('Backup restored')
    } catch (err) { setMsg('Could not read that file') }
  })
  const shrink = async () => { setMsg('Compressing images...'); const n = await shrinkImages(); setMsg(n > 0 ? 'Freed ' + kb(n) + ' of images' : 'Images are already small') }
  const meas = () => { setMsg('Measuring the real limit...'); setTimeout(() => { const c = probeQuota(); setMsg('Real limit is about ' + (c / 1e6).toFixed(1) + ' M characters'); window.dispatchEvent(new Event('pos-save')); f((n) => n + 1) }, 60) }
  const notif = async () => { try { const p = await Notification.requestPermission(); setMsg(p === 'granted' ? 'System notifications enabled' : 'Notifications were not allowed') } catch (e) { setMsg('Notifications are not supported here') } }
  return (
    <Sh t="Data center" close={close} w={560}>
      <div className={'meter ' + m.level}><i style={{ width: m.pct + '%' }} /></div>
      <R a={'Storage used (' + m.pct + '%)'} b={(m.total / 1e6).toFixed(2) + ' M of ' + (getLimit() / 1e6).toFixed(1) + ' M'} />
      {est && est.quota && <R a="Device storage" b={Math.round(est.usage / 1048576) + ' MB of ' + Math.round(est.quota / 1048576) + ' MB'} />}
      <div className="sumbox inset">{sizes.map(([k, v]) => <R key={k} a={k} b={kb(v)} />)}</div>
      {m.fail && <div className="banner" style={{ background: '#fee2e2' }}>Storage is full. Changes since it filled up are only in memory. Export now.</div>}
      <div className="tsec">Export old data, then free space</div>
      <div className="row2"><label className="lbl">Older than (days)<input className="input" type="number" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></label><button className="btn pri" style={{ alignSelf: 'end' }} onClick={build}>Find old data</button></div>
      {plan && (plan.n === 0 ? <small className="mut">Nothing older than {plan.days} days.</small> : (<>
        <div className="sumbox inset">{Object.entries(plan.data).filter(([, a]) => a.length).map(([k, a]) => <R key={k} a={k} b={a.length} />)}<R big a="Total records / size" b={plan.n + ' / ' + kb(plan.bytes)} /></div>
        <div className="row2"><button className="btn pri" onClick={exportIt}>1. Export file</button><button className="btn" onClick={() => exportOrdersCsv(plan.data.orders, 'archived-orders')}>Orders CSV</button></div>
        <button className="btn" disabled={!ex} onClick={() => vr.current.click()}>2. Pick the saved file to verify it</button>
        <button className="btn bad" disabled={!ver} onClick={purge}>3. Delete verified records from this device</button>
        <small className="mut">Open orders with a balance are never archived.</small>
      </>))}
      <input ref={vr} type="file" accept="application/json,.json" hidden onChange={verify} />
      <div className="tsec">Tools</div>
      <div className="row2"><button className="btn" onClick={() => fr.current.click()}>Load archive file</button><button className="btn" onClick={() => br.current.click()}>Restore backup</button></div>
      <div className="row2"><button className="btn" onClick={() => { doBackup(); setMsg('Full backup downloaded') }}>Full backup</button><button className="btn" onClick={shrink}>Shrink images</button></div>
      <div className="row2"><button className="btn" onClick={meas}>Measure real limit</button><button className="btn" onClick={notif}>Enable notifications</button></div>
      <input ref={fr} type="file" accept="application/json,.json" hidden onChange={load} />
      <input ref={br} type="file" accept="application/json,.json" hidden onChange={restore} />
      {months.length > 0 && <><div className="tsec">Archived history</div>{months.map(([k, v]) => <R key={k} a={k + ' · ' + v.n + ' orders'} b={money(v.s)} />)}</>}
      <small className="mut">{msg}</small>
    </Sh>
  )
}
