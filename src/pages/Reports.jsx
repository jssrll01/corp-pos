import { useState } from 'react'
import { useStore } from '../store.js'
import { num, r2, money, dkey, inR, RANGES, qtyAt, tracked } from '../inv.js'
import { MLABEL } from '../cart.js'
import { Tabs, Tbl } from '../ui.jsx'
const grp = (arr, kf, init, add) => { const m = {}; arr.forEach((x) => { const k = kf(x); m[k] = add(m[k] || init(), x) }); return Object.entries(m) }
const TABS = [['sales', 'Sales'], ['tax', 'Tax'], ['profit', 'Profit'], ['exp', 'Expenses'], ['inv', 'Inventory'], ['emp', 'Employees'], ['audit', 'Audit']]
export default function Reports() {
  const st = useStore()
  const [t, setT] = useState('sales')
  const [r, setR] = useState('30')
  const [br, setBr] = useState('')
  const [au, setAu] = useState('')
  const os = st.orders.filter((o) => inR(o.date, r) && (!br || (o.branchId || 'main') === br))
  const net = (o) => o.net ?? r2(o.total - (o.tax || 0))
  const cogs = (o) => o.cogs ?? r2(o.items.reduce((a, i) => a + num(i.cost) * i.qty, 0))
  const ex = st.expenses.filter((e) => inR(e.date, r) && (!br || (e.branchId || 'main') === br))
  const wo = st.moves.filter((m) => (m.type === 'damaged' || m.type === 'expired') && inR(m.date, r))
  const rev = os.reduce((a, o) => a + net(o), 0), cg = os.reduce((a, o) => a + cogs(o), 0)
  const gp = r2(rev - cg), exT = ex.reduce((a, e) => a + num(e.amount), 0), woT = wo.reduce((a, m) => a + Math.abs(m.qty) * num(m.cost), 0)
  const byDay = grp(os, (o) => dkey(o.date), () => ({ n: 0, sub: 0, disc: 0, tax: 0, tot: 0 }), (a, o) => ({ n: a.n + 1, sub: a.sub + o.sub, disc: a.disc + (o.disc || 0), tax: a.tax + (o.tax || 0), tot: a.tot + o.total })).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  const byMethod = grp(os.flatMap((o) => o.payments || [{ method: o.method, amount: o.paid ?? o.total }]), (p) => MLABEL[p.method] || p.method, () => 0, (a, p) => a + num(p.amount))
  const byProd = grp(os.flatMap((o) => o.items), (i) => i.name, () => ({ q: 0, rev: 0, c: 0 }), (a, i) => ({ q: a.q + i.qty, rev: a.rev + i.qty * i.price - (i.bulk || 0), c: a.c + num(i.cost) * i.qty })).sort((a, b) => b[1].rev - a[1].rev)
  const byCat = grp(ex, (e) => e.cat, () => 0, (a, e) => a + num(e.amount))
  const names = [...new Set([...st.employees.map((e) => e.name), ...os.map((o) => o.by || 'Admin')])]
  const emp = names.map((n) => {
    const mine = os.filter((o) => (o.by || 'Admin') === n)
    const hrs = st.attendance.filter((a) => a.name === n && a.out && inR(a.in, r)).reduce((a, x) => a + (new Date(x.out) - new Date(x.in)) / 36e5, 0)
    return { n, c: mine.length, tot: mine.reduce((a, o) => a + o.total, 0), disc: mine.reduce((a, o) => a + (o.disc || 0), 0), hrs, acts: st.audit.filter((a) => a.user === n && inR(a.date, r)).length }
  })
  const inv = []
  st.products.filter(tracked).forEach((p) => st.warehouses.forEach((w) => { const q = qtyAt(p, w.id); if (q > 0) inv.push({ p, w, q }) }))
  const aud = st.audit.filter((a) => inR(a.date, r) && (!au || a.user === au))
  const pl = [['Revenue (net of tax)', money(rev)], ['Cost of goods sold', money(cg)], ['Gross profit', money(gp)], ['Gross margin', rev > 0 ? r2((gp / rev) * 100) + '%' : '-'], ['Operating expenses', money(exT)], ['Damaged and expired write-offs', money(woT)], ['Net profit', money(gp - exT - woT)]]
  return (
    <div>
      <Tabs v={t} on={setT} items={TABS} />
      <div className="row2" style={{ marginBottom: 12 }}>
        <select className="input" value={r} onChange={(e) => setR(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select className="input" value={br} onChange={(e) => setBr(e.target.value)}><option value="">All branches</option>{st.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      </div>
      <div className="grid">
        {t === 'sales' && <>
          <Tbl name="Sales by day" rows={byDay} cols={[['Date', (x) => x[0]], ['Orders', (x) => x[1].n], ['Gross', (x) => money(x[1].sub)], ['Discounts', (x) => money(x[1].disc)], ['Tax', (x) => money(x[1].tax)], ['Total', (x) => money(x[1].tot)]]} />
          <Tbl name="Payments by method" rows={byMethod} cols={[['Method', (x) => x[0]], ['Amount', (x) => money(x[1])]]} />
          <Tbl name="Sales by product" rows={byProd} cols={[['Product', (x) => x[0]], ['Qty', (x) => x[1].q], ['Revenue', (x) => money(x[1].rev)]]} />
        </>}
        {t === 'tax' && <Tbl name="Tax collected" rows={byDay} cols={[['Date', (x) => x[0]], ['Orders', (x) => x[1].n], ['Sales total', (x) => money(x[1].tot)], ['Tax', (x) => money(x[1].tax)]]} />}
        {t === 'profit' && <>
          <Tbl name="Profit and loss" rows={pl} cols={[['Item', (x) => x[0]], ['Amount', (x) => x[1]]]} />
          <Tbl name="Gross profit by product (before order discounts)" rows={byProd} cols={[['Product', (x) => x[0]], ['Qty', (x) => x[1].q], ['Revenue', (x) => money(x[1].rev)], ['Cost', (x) => money(x[1].c)], ['Profit', (x) => money(x[1].rev - x[1].c)]]} />
        </>}
        {t === 'exp' && <>
          <Tbl name="Expenses by category" rows={byCat} cols={[['Category', (x) => x[0]], ['Amount', (x) => money(x[1])]]} />
          <Tbl name="Expense list" rows={ex} cols={[['Date', (e) => e.date], ['Category', (e) => e.cat], ['Description', (e) => e.desc], ['Amount', (e) => money(e.amount)]]} />
        </>}
        {t === 'inv' && <>
          <Tbl name="Inventory valuation" rows={inv} cols={[['Product', (x) => x.p.name], ['Warehouse', (x) => x.w.name], ['Qty', (x) => x.q], ['Cost value', (x) => money(x.q * num(x.p.cost))], ['Retail value', (x) => money(x.q * num(x.p.price))]]} />
          <small className="mut">Total at cost {money(inv.reduce((a, x) => a + x.q * num(x.p.cost), 0))} · at retail {money(inv.reduce((a, x) => a + x.q * num(x.p.price), 0))}</small>
        </>}
        {t === 'emp' && <Tbl name="Employee report" rows={emp} cols={[['Employee', (e) => e.n], ['Sales', (e) => e.c], ['Sales total', (e) => money(e.tot)], ['Average sale', (e) => money(e.c ? e.tot / e.c : 0)], ['Discounts given', (e) => money(e.disc)], ['Hours worked', (e) => e.hrs.toFixed(2)], ['Actions logged', (e) => e.acts]]} />}
        {t === 'audit' && <>
          <select className="input" value={au} onChange={(e) => setAu(e.target.value)}><option value="">All users</option>{[...new Set(st.audit.map((a) => a.user))].map((u) => <option key={u} value={u}>{u}</option>)}</select>
          <Tbl name="Audit log" rows={aud} cols={[['Date', (a) => new Date(a.date).toLocaleString()], ['User', (a) => a.user], ['Action', (a) => a.action], ['Detail', (a) => a.detail]]} />
        </>}
      </div>
    </div>
  )
}
