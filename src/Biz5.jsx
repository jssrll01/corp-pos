import { useState } from 'react'
import Sel from './Sel.jsx'
import { useStore, setState, getState } from './store.js'
import { useX, setX, uid } from './xstore.js'
import { money, num, r2, dkey, tracked, put, mvRow, audit, MAIN, curUser } from './inv.js'
import { ono } from './cart.js'
import { Tbl, Tabs } from './ui.jsx'
import { Sh, R } from './Biz2.jsx'
import { voidOrder } from './fx.js'
const sum = (a, f) => r2(a.reduce((s, o) => s + num(f(o)), 0))
const span = (n) => { const a = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); a.push(dkey(d)) } return a }
const cut = (lots, n) => { let rem = n; return (lots || []).map((l) => { const k = Math.min(rem, num(l.qty)); rem -= k; return { ...l, qty: num(l.qty) - k } }).filter((l) => l.qty > 0) }
const back = (p, wh, i, n) => { let rem = n, q = p; (i.lots || []).forEach((l) => { const k = Math.min(rem, num(l.qty)); if (k > 0) { q = put(q, wh, k, l.no || '', l.exp || ''); rem -= k } }); if (rem > 0) q = put(q, wh, rem, '', ''); return q }

export function Returns2({ close }) {
  const st = useStore(); const x = useX(); const w = st.settings.activeWh || MAIN
  const [t, setT] = useState('new'); const [no, setNo] = useState(''); const [q, setQ] = useState({}); const [cash, setCash] = useState(true); const [m, setM] = useState('')
  const k = parseInt(no.replace(/\D/g, ''), 10)
  const o = k ? st.orders.find((z) => Number(z.no) === k) : null
  const log = x.returns || []
  const sel = o ? o.items.map((i, j) => ({ i, j, n: Math.min(Math.floor(num(q[j])), i.qty) })).filter((z) => z.n > 0) : []
  const gross = o ? o.items.reduce((a, i) => a + num(i.qty) * num(i.price), 0) : 0
  const rg = sel.reduce((a, z) => a + z.n * num(z.i.price), 0)
  const f = gross > 0 ? Math.min(1, rg / gross) : 0
  const full = !!o && sel.length === o.items.length && sel.every((z) => z.n === z.i.qty)
  const refund = o ? r2(num(o.total) * f) : 0
  const go = () => {
    const s0 = getState(); const ord = s0.orders.find((z) => z.id === (o && o.id))
    if (!ord || !sel.length) return setM('Enter a quantity to return')
    const wh = ord.whId || w; const moves = [], map = {}
    sel.forEach(({ i, n }) => { const p = map[i.id] || s0.products.find((z) => z.id === i.id); if (p && tracked(p)) { map[i.id] = back(p, wh, i, n); moves.push(mvRow('return', p, wh, n, 'Return ' + ono(ord.no))) } })
    const when = new Date().toISOString(); const keep = 1 - f; const sc = (v) => r2(num(v) * keep)
    const origPaid = num(ord.paid ?? ord.total); const bal = r2(Math.max(0, num(ord.balance) - refund)); const cashBack = r2(refund - (num(ord.balance) - bal))
    const entries = sel.map(({ i, n }) => ({ id: uid(), date: when, no: ord.no, name: i.name, qty: n, amount: r2(refund * ((n * num(i.price)) / (rg || 1))), cost: r2(n * num(i.cost)), by: curUser().name }))
    setX({ returns: [...entries, ...log].slice(0, 2000) })
    if (full) {
      setState((s) => ({ products: s.products.map((p) => map[p.id] || p), moves: [...moves, ...s.moves].slice(0, 5000) }))
      voidOrder(ord, 'Full return', false)
      audit('Return', ono(ord.no) + ' full ' + money(refund)); setM('Every item returned: the order was voided and moved to the Voided list. Original cash payments are refunded.'); setQ({}); return
    }
    const items = ord.items.map((i, j) => { const z = sel.find((y) => y.j === j); if (!z) return i; const left = i.qty - z.n; return left <= 0 ? null : { ...i, qty: left, bulk: r2((num(i.bulk) * left) / i.qty), lots: cut(i.lots, z.n) } }).filter(Boolean)
    const tax = sc(ord.tax); const total = r2(num(ord.total) - refund)
    const dEarn = Math.floor(num(ord.earned) * f)
    const upd = { ...ord, items, sub: sc(ord.sub), disc: sc(ord.disc), autoDisc: sc(ord.autoDisc), manual: sc(ord.manual), tax, total, net: r2(total - tax), cogs: r2(Math.max(0, num(ord.cogs) - sum(sel, (z) => z.n * num(z.i.cost)))), paid: r2(origPaid - cashBack), balance: bal, earned: Math.max(0, num(ord.earned) - dEarn), returns: [...(ord.returns || []), { id: uid(), date: when, by: curUser().name, amount: refund, items: sel.map((z) => ({ name: z.i.name, qty: z.n })) }] }
    setState((s) => ({
      orders: s.orders.map((z) => (z.id === ord.id ? upd : z)),
      products: s.products.map((p) => map[p.id] || p), moves: [...moves, ...s.moves].slice(0, 5000),
      cashlog: cash && cashBack > 0 ? [{ id: uid(), date: when, type: 'out', amount: cashBack, note: 'Refund ' + ono(ord.no) }, ...s.cashlog] : s.cashlog,
      customers: ord.customerId && dEarn > 0 ? s.customers.map((c) => (c.id === ord.customerId ? { ...c, points: Math.max(0, num(c.points) - dEarn) } : c)) : s.customers,
    }))
    audit('Return', ono(ord.no) + ' ' + money(refund)); setM('Returned ' + money(refund) + '. The order now shows the new total.'); setQ({})
  }
  return (
    <Sh t="Return items" close={close} w={500}>
      <Tabs v={t} on={setT} items={[['new', 'New return'], ['log', 'Returns log']]} />
      {t === 'new' && (<>
        <input className="input" autoFocus placeholder="Order number" value={no} onChange={(e) => setNo(e.target.value)} />
        {no && !o && <small className="mut">Order not found on this device</small>}
        {o && o.items.map((i, j) => <div key={j} className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><span style={{ flex: 1 }}>{i.name}<small className="mut"> · on order {i.qty}</small></span><input className="input" style={{ width: 80 }} type="number" inputMode="numeric" placeholder="0" value={q[j] || ''} onChange={(e) => setQ({ ...q, [j]: e.target.value })} /></div>)}
        {o && (o.returns || []).length > 0 && <small className="mut">Earlier returns on this order: {(o.returns || []).length}</small>}
        {o && sel.length > 0 && <R big a="Refund value" b={money(refund)} />}
        {o && !full && <label className="lbl"><span><input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} /> Pay the refund in cash from the drawer</span></label>}
        {o && full && <small className="mut">Returning every item voids the order and refunds the original cash payments.</small>}
        {o && <button className="btn pri" onClick={go}>Restock and refund</button>}
        <small className="mut">Returns reduce the order itself, so every report, the dashboard and finance already show the corrected sales, tax and cost. Unpaid balance is reduced first. Loyalty points earned are reversed in proportion.</small>
        <small className="mut">{m}</small>
      </>)}
      {t === 'log' && <Tbl name="returns" rows={log} cols={[['Date', (r) => new Date(r.date).toLocaleDateString()], ['Order', (r) => ono(r.no)], ['Item', (r) => r.name], ['Qty', (r) => r.qty], ['Amount', (r) => money(r.amount)], ['By', (r) => r.by]]} />}
    </Sh>
  )
}
export function Commission2({ close }) {
  const st = useStore(); const x = useX(); const [r, setR] = useState('30')
  const ds = span(Number(r)); const cm = x.cmap || {}; const def = num(x.crate); const base = x.cbase || 'net'
  const os = st.orders.filter((o) => ds.includes(dkey(o.date)))
  const bv = (o) => (base === 'gross' ? num(o.total) : base === 'profit' ? num(o.total) - num(o.tax) - num(o.cogs) : num(o.total) - num(o.tax))
  const names = [...new Set([...os.map((o) => o.by || 'Admin'), ...Object.keys(cm)])]
  const rows = names.map((n) => { const s = sum(os.filter((o) => (o.by || 'Admin') === n), bv); const rate = cm[n] !== undefined && cm[n] !== '' ? num(cm[n]) : def; return { n, s, rate, c: r2((s * rate) / 100) } })
  const lbl = base === 'gross' ? 'Sales with tax' : base === 'profit' ? 'Gross profit' : 'Sales without tax'
  return (
    <Sh t="Staff commission" close={close} w={520}>
      <Sel className="input" value={r} onChange={(e) => setR(e.target.value)}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></Sel>
      <Sel className="input" value={base} onChange={(e) => setX({ cbase: e.target.value })}><option value="net">Commission on sales without tax</option><option value="gross">Commission on sales with tax</option><option value="profit">Commission on gross profit</option></Sel>
      <label className="lbl">Default commission %<input className="input" type="number" inputMode="decimal" value={x.crate || ''} onChange={(e) => setX({ crate: e.target.value })} /></label>
      {names.map((n) => <div key={n} className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><span style={{ flex: 1 }}>{n}</span><input className="input" style={{ width: 110 }} type="number" inputMode="decimal" placeholder={'Default ' + def} value={cm[n] ?? ''} onChange={(e) => setX({ cmap: { ...cm, [n]: e.target.value } })} /></div>)}
      <Tbl name="commission" rows={rows} cols={[['Cashier', (z) => z.n], [lbl, (z) => money(z.s)], ['Rate', (z) => z.rate + '%'], ['Commission', (z) => money(z.c)]]} />
      <small className="mut">Returns and voids are already removed from the sales used here.</small>
    </Sh>
  )
}
