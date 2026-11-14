import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store.js'
import { fmt, ono, MLABEL } from '../cart.js'
import { printReceipt } from '../print.js'
export default function Orders() {
  const { orders, settings } = useStore()
  const [open, setOpen] = useState(null)
  const cur = settings.currency
  const sorted = useMemo(() => [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)), [orders])
  const top = useMemo(() => {
    const m = {}
    orders.forEach((o) => o.items.forEach((i) => {
      const r = m[i.name] || (m[i.name] = { name: i.name, qty: 0, rev: 0 })
      r.qty += i.qty; r.rev += i.qty * i.price
    }))
    return Object.values(m).sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [orders])
  const max = top.length ? top[0].qty : 1
  const revenue = orders.reduce((a, o) => a + o.total, 0)
  return (
    <div>
      <div className="ostats">
        <div className="raised stat"><small>Orders</small><b>{orders.length}</b></div>
        <div className="raised stat"><small>Revenue</small><b>{fmt(revenue, cur)}</b></div>
      </div>
      <h3>Top Sellers</h3>
      {top.length === 0 ? <p className="mut">No sales yet</p> : (
        <div className="raised toplist">
          {top.map((t, i) => (
            <div key={t.name} className="toprow">
              <span className="rank">{i + 1}</span>
              <div className="topmain">
                <div className="sumline"><b>{t.name}</b><span>{t.qty} sold · {fmt(t.rev, cur)}</span></div>
                <div className="bar inset"><motion.i initial={{ width: 0 }} animate={{ width: (t.qty / max) * 100 + '%' }} transition={{ duration: 0.6, delay: i * 0.08 }} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <h3>Order History</h3>
      {sorted.length === 0 && <p className="mut">No orders yet</p>}
      <div className="hist">
        {sorted.map((o, i) => (
          <motion.div key={o.id} className="raised hrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
            <button className="hhead" onClick={() => setOpen(open === o.id ? null : o.id)}>
              <div><b>{ono(o.no)}</b><small>{new Date(o.date).toLocaleString()}</small></div>
              <div className="hright"><b>{fmt(o.total, cur)}</b><small>{MLABEL[o.method]}</small></div>
            </button>
            <AnimatePresence initial={false}>
              {open === o.id && (
                <motion.div key="d" className="hbody" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <div className="hin">
                    {o.items.map((it, k) => <div key={k} className="sumline"><span>{it.qty} x {it.name}</span><span>{fmt(it.qty * it.price, cur)}</span></div>)}
                    <div className="sumline mut"><span>Sub Total</span><span>{fmt(o.sub, cur)}</span></div>
                    {o.disc > 0 && <div className="sumline mut"><span>Discount</span><span>-{fmt(o.disc, cur)}</span></div>}
                    <div className="sumline mut"><span>Tax ({o.taxPct}%)</span><span>{fmt(o.tax, cur)}</span></div>
                    {o.method === 'cash' && <div className="sumline mut"><span>Cash / Change</span><span>{fmt(o.received, cur)} / {fmt(o.change, cur)}</span></div>}
                    {o.note && <div className="mut">Note: {o.note}</div>}
                    <div className="row2" style={{ marginTop: 8 }}>
                      <button className="btn" onClick={() => printReceipt(o, settings, 58)}>Print 58mm</button>
                      <button className="btn" onClick={() => printReceipt(o, settings, 60)}>Print 60mm</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
