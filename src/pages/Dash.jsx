import { useMemo, useState } from 'react'
import { useStore } from '../store.js'
import { num, r2, money, dkey, isLow } from '../inv.js'
import { MLABEL, ono } from '../cart.js'
import { Tbl } from '../ui.jsx'
const C = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b']
const MS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const kf = (v) => money(v).replace(/\.00$/, '')
const Card = ({ t, children }) => <div className="raised mpanel"><b>{t}</b>{children}</div>
function Lines({ keys, series }) {
  const W = 320, H = 140, L = 6, R = 6, T = 12, B = 16
  const all = series.flatMap((s) => s.v)
  const max = Math.max(1, ...all), min = Math.min(0, ...all)
  const x = (i) => L + (keys.length > 1 ? (i * (W - L - R)) / (keys.length - 1) : (W - L - R) / 2)
  const y = (v) => T + (H - T - B) * (1 - (v - min) / (max - min || 1))
  return (
    <svg className="chart" viewBox={'0 0 ' + W + ' ' + H}>
      {[0, 0.5, 1].map((g) => <line key={g} x1={L} x2={W - R} y1={T + (H - T - B) * g} y2={T + (H - T - B) * g} stroke="#d0d7e3" strokeDasharray="3 4" />)}
      {series.map((s, i) => <path key={i} d={s.v.map((v, j) => (j ? 'L' : 'M') + x(j).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')} fill="none" stroke={s.c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />)}
      <text x={L} y={H - 3} fontSize="8" fill="#6b7280">{keys[0].slice(5)}</text>
      <text x={W - R} y={H - 3} fontSize="8" fill="#6b7280" textAnchor="end">{keys[keys.length - 1].slice(5)}</text>
      <text x={W - R} y={9} fontSize="8" fill="#6b7280" textAnchor="end">max {kf(max)}</text>
    </svg>
  )
}
function Bars({ data }) {
  const W = 320, H = 140, L = 4, B = 16, T = 12
  const max = Math.max(1, ...data.map((d) => d.v))
  const bw = (W - L * 2) / data.length
  const step = Math.ceil(data.length / 10)
  return (
    <svg className="chart" viewBox={'0 0 ' + W + ' ' + H}>
      {data.map((d, i) => {
        const h = ((H - T - B) * d.v) / max
        return (
          <g key={i}>
            <rect x={L + i * bw + bw * 0.15} y={H - B - h} width={bw * 0.7} height={d.v > 0 ? Math.max(h, 1) : 0} rx="2" fill={C[0]} />
            {i % step === 0 && <text x={L + i * bw + bw / 2} y={H - 3} fontSize="8" textAnchor="middle" fill="#6b7280">{d.l}</text>}
          </g>
        )
      })}
      <text x={W - L} y={9} fontSize="8" textAnchor="end" fill="#6b7280">max {kf(max)}</text>
    </svg>
  )
}
function HBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.v))
  return (
    <div className="hb">
      {data.map((d, i) => <div key={i} className="hbr"><span className="hbn">{d.l}</span><div className="hbt"><i style={{ width: (d.v / max) * 100 + '%', background: C[i % C.length] }} /></div><b>{kf(d.v)}</b></div>)}
      {!data.length && <small className="mut">No data</small>}
    </div>
  )
}
function Donut({ data }) {
  const tot = data.reduce((a, d) => a + d.v, 0)
  const R = 42, Cc = 2 * Math.PI * R
  let off = 0
  return (
    <div className="dn">
      <svg viewBox="0 0 120 120" className="chart" style={{ height: 130, maxWidth: 130 }}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(128,128,128,.18)" strokeWidth="16" />
        {tot > 0 && data.map((d, i) => { const len = (Cc * d.v) / tot; const e = <circle key={i} cx="60" cy="60" r={R} fill="none" stroke={C[i % C.length]} strokeWidth="16" strokeDasharray={len + ' ' + (Cc - len)} strokeDashoffset={-off} transform="rotate(-90 60 60)" />; off += len; return e })}
        <text x="60" y="64" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1f2937">{kf(tot)}</text>
      </svg>
      <div className="dl">{data.map((d, i) => <span key={i}><i style={{ background: C[i % C.length] }} />{d.l} {kf(d.v)}</span>)}{!data.length && <small className="mut">No data</small>}</div>
    </div>
  )
}
const top = (o, n) => Object.entries(o).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v).slice(0, n)
export default function Dash() {
  const st = useStore()
  const [days, setDays] = useState(14)
  const D = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1))
    const keys = []
    for (let i = 0; i < days; i++) { const d = new Date(start); d.setDate(start.getDate() + i); keys.push(dkey(d)) }
    const idx = Object.fromEntries(keys.map((k, i) => [k, i]))
    const rev = keys.map(() => 0), prof = keys.map(() => 0), exp = keys.map(() => 0)
    const hours = Array(24).fill(0), wd = Array(7).fill(0)
    const pay = {}, prod = {}, cat = {}, cash = {}
    const byId = Object.fromEntries(st.products.map((p) => [p.id, p]))
    const os = st.orders.filter((o) => new Date(o.date) >= start).sort((a, b) => new Date(b.date) - new Date(a.date))
    let tot = 0, gp = 0, items = 0
    os.forEach((o) => {
      const i = idx[dkey(o.date)]
      const net = o.net ?? r2(o.total - (o.tax || 0))
      const cg = o.cogs ?? r2(o.items.reduce((a, x) => a + num(x.cost) * x.qty, 0))
      if (i !== undefined) { rev[i] += o.total; prof[i] += net - cg }
      const dt = new Date(o.date)
      hours[dt.getHours()] += o.total; wd[dt.getDay()] += o.total
      ;(o.payments || [{ method: o.method, amount: o.paid ?? o.total }]).forEach((p) => { const l = p.method === 'deposit' ? 'Deposit' : MLABEL[p.method] || p.method; pay[l] = (pay[l] || 0) + num(p.amount) })
      const who = o.by || 'Admin'; cash[who] = (cash[who] || 0) + o.total
      o.items.forEach((x) => {
        const amt = x.qty * x.price - (x.bulk || 0)
        const r = prod[x.name] || (prod[x.name] = { q: 0, rev: 0, c: 0 })
        r.q += x.qty; r.rev += amt; r.c += num(x.cost) * x.qty; items += x.qty
        const c = (byId[x.id] && byId[x.id].cat) || 'Uncategorized'; cat[c] = (cat[c] || 0) + amt
      })
      tot += o.total; gp += net - cg
    })
    st.expenses.forEach((e) => { const i = idx[String(e.date).slice(0, 10)]; if (i !== undefined) exp[i] += num(e.amount) })
    const expT = exp.reduce((a, b) => a + b, 0)
    const months = []
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push({ y: d.getFullYear(), m: d.getMonth(), l: MS[d.getMonth()], v: 0 }) }
    st.orders.forEach((o) => { const d = new Date(o.date); const m = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth()); if (m) m.v += o.total })
    return { keys, rev, prof, exp, hours, wd, pay, prod, cat, cash, os, tot, gp, items, expT, months }
  }, [st.orders, st.expenses, st.products, days])
  const owed = st.orders.reduce((a, o) => a + num(o.balance), 0)
  const low = st.products.filter((p) => isLow(p, st)).length
  const kpis = [['Revenue', money(D.tot)], ['Orders', D.os.length], ['Average order', money(D.os.length ? D.tot / D.os.length : 0)], ['Items sold', D.items], ['Gross profit', money(D.gp)], ['Expenses', money(D.expT)], ['Net profit', money(D.gp - D.expT)], ['Unpaid balances', money(owed)], ['Low stock items', low]]
  const prodRows = Object.entries(D.prod).sort((a, b) => b[1].rev - a[1].rev)
  return (
    <div className="grid">
      <select className="input" value={days} onChange={(e) => setDays(+e.target.value)}>{[[7, 'Last 7 days'], [14, 'Last 14 days'], [30, 'Last 30 days'], [90, 'Last 90 days']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <div className="kgrid">{kpis.map(([l, v]) => <div key={l} className="raised stat"><small>{l}</small><b>{v}</b></div>)}</div>
      <div className="dgrid">
        <Card t="Revenue, expenses and profit">
          <Lines keys={D.keys} series={[{ v: D.rev, c: C[0] }, { v: D.exp, c: C[4] }, { v: D.prof, c: C[2] }]} />
          <div className="lg"><span><i className="ld" style={{ background: C[0] }} />Revenue</span><span><i className="ld" style={{ background: C[4] }} />Expenses</span><span><i className="ld" style={{ background: C[2] }} />Gross profit</span></div>
        </Card>
        <Card t="Sales by hour"><Bars data={D.hours.map((v, h) => ({ l: String(h), v }))} /></Card>
        <Card t="Sales by weekday"><Bars data={D.wd.map((v, i) => ({ l: WD[i], v }))} /></Card>
        <Card t="Monthly revenue, 6 months"><Bars data={D.months} /></Card>
        <Card t="Payment methods"><Donut data={top(D.pay, 6)} /></Card>
        <Card t="Sales by category"><Donut data={top(D.cat, 6)} /></Card>
        <Card t="Top products by revenue"><HBars data={prodRows.slice(0, 8).map(([l, r]) => ({ l, v: r.rev }))} /></Card>
        <Card t="Sales by cashier"><HBars data={top(D.cash, 8)} /></Card>
      </div>
      <Tbl name="Product performance" rows={prodRows} cols={[['Product', (x) => x[0]], ['Qty', (x) => x[1].q], ['Revenue', (x) => money(x[1].rev)], ['Cost', (x) => money(x[1].c)], ['Profit', (x) => money(x[1].rev - x[1].c)]]} />
      <Tbl name="Order records" rows={D.os.slice(0, 500)} cols={[['Order', (o) => ono(o.no)], ['Date', (o) => new Date(o.date).toLocaleString()], ['Customer', (o) => o.customerName || 'Walk-in'], ['Cashier', (o) => o.by || 'Admin'], ['Method', (o) => MLABEL[o.method] || o.method], ['Total', (o) => money(o.total)], ['Paid', (o) => money(o.paid ?? o.total)], ['Balance', (o) => money(o.balance || 0)]]} />
    </div>
  )
}
