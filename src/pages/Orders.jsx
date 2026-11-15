import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store.js'
import { ono, MLABEL } from '../cart.js'
import { money } from '../inv.js'
import { PrintBtns } from '../ui.jsx'
export default function Orders() {
  const { orders } = useStore()
  const [open, setOpen] = useState(null)
  const [q, setQ] = useState('')
  const sorted = useMemo(() => [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).filter((o) => !q || (ono(o.no) + ' ' + (o.customerName || '')).toLowerCase().includes(q.toLowerCase())), [orders, q])
  const top = useMemo(() => {
    const m = {}
    orders.forEach((o) => o.items.forEach((i) => { const r = m[i.name] || (m[i.name] = { name: i.name, qty: 0, rev: 0 }); r.qty += i.qty; r.rev += i.qty * i.price }))
    return Object.values(m).sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [orders])
  const max = top.length ? top[0].qty : 1
  const owed = orders.reduce((a, o) => a + (o.balance || 0), 0)
  return (
    <div>
      <div className="ostats3" style={{ marginTop: 8 }}>
        <div className="raised stat"><small>Orders</small><b>{orders.length}</b></div>
        <div className="raised stat"><small>Revenue</small><b>{money(orders.reduce((a, o) => a + o.total, 0))}</b></div>
        <div className="raised stat"><small>Unpaid</small><b>{money(owed)}</b></div>
      </div>
      <h3>Top Sellers</h3>
      {top.length === 0 ? <p className="mut">No sales yet</p> : (
        <div className="raised toplist">
          {top.map((t, i) => (
            <div key={t.name} className="toprow">
              <span className="rank">{i + 1}</span>
              <div className="topmain">
                <div className="sumline"><b>{t.name}</b><span>{t.qty} sold · {money(t.rev)}</span></div>
                <div className="bar inset"><motion.i initial={{ width: 0 }} animate={{ width: (t.qty / max) * 100 + '%' }} transition={{ duration: 0.5 }} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <h3>Order History</h3>
      <input className="input" placeholder="Search order number or customer" value={q} onChange={(e) => setQ(e.target.value)} />
      {sorted.length === 0 && <p className="mut">No orders yet</p>}
      <div className="hist" style={{ marginTop: 12 }}>
        {sorted.map((o) => (
          <div key={o.id} className="raised hrow">
            <button className="hhead" onClick={() => setOpen(open === o.id ? null : o.id)}>
              <div><b>{ono(o.no)}{o.balance > 0 ? ' · PARTIAL' : ''}</b><small>{new Date(o.date).toLocaleString()}{o.customerName ? ' · ' + o.customerName : ''}</small></div>
              <div className="hright"><b>{money(o.total)}</b><small>{MLABEL[o.method] || o.method}</small></div>
            </button>
            <AnimatePresence initial={false}>
              {open === o.id && (
                <motion.div key="d" className="hbody" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <div className="hin">
                    {o.items.map((it, k) => <div key={k} className="sumline"><span>{it.qty} x {it.name}</span><span>{money(it.qty * it.price - (it.bulk || 0))}</span></div>)}
                    <div className="sumline mut"><span>Sub Total</span><span>{money(o.sub)}</span></div>
                    {o.disc > 0 && <div className="sumline mut"><span>Discount</span><span>-{money(o.disc)}</span></div>}
                    <div className="sumline mut"><span>{o.taxName || 'Tax'} ({o.taxPct}%)</span><span>{money(o.tax)}</span></div>
                    <div className="sumline mut"><span>Paid / Balance</span><span>{money(o.paid ?? o.total)} / {money(o.balance || 0)}</span></div>
                    {o.by && <div className="mut">Cashier: {o.by}</div>}
                    {o.note && <div className="mut">Note: {o.note}</div>}
                    <PrintBtns o={o} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
