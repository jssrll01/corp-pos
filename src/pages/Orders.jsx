import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sel from '../Sel.jsx'
import { useStore } from '../store.js'
import { ono, MLABEL } from '../cart.js'
import { money, inR, RANGES } from '../inv.js'
import { PrintBtns, Tabs } from '../ui.jsx'
import { receiptText, shareText, exportOrdersCsv } from '../fx.js'
import { VoidBox, Settle } from '../Biz2.jsx'
export default function Orders() {
  const st = useStore()
  const [tab, setTab] = useState('orders')
  const [open, setOpen] = useState(null)
  const [q, setQ] = useState('')
  const [r, setR] = useState('30')
  const [m, setM] = useState('')
  const [sv, setSv] = useState('')
  const [vo, setVo] = useState(null)
  const [se, setSe] = useState(null)
  const src = tab === 'orders' ? st.orders : st.voided || []
  const rows = useMemo(() => {
    const k = q.trim().toLowerCase()
    return src.filter((o) => inR(tab === 'orders' ? o.date : o.voidAt || o.date, r) && (!m || o.method === m) && (!sv || (sv === 'unpaid' ? o.balance > 0 : !(o.balance > 0))) && (!k || (ono(o.no) + ' ' + (o.customerName || '') + ' ' + (o.table || '')).toLowerCase().includes(k))).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [src, q, r, m, sv, tab])
  const top = useMemo(() => {
    const t = {}
    st.orders.forEach((o) => o.items.forEach((i) => { const z = t[i.name] || (t[i.name] = { name: i.name, qty: 0, rev: 0 }); z.qty += i.qty; z.rev += i.qty * i.price }))
    return Object.values(t).sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [st.orders])
  const max = top.length ? top[0].qty : 1
  return (
    <div>
      <div className="ostats3" style={{ marginTop: 4 }}>
        <div className="raised stat"><small>Orders shown</small><b>{rows.length}</b></div>
        <div className="raised stat"><small>Revenue shown</small><b>{money(rows.reduce((a, o) => a + o.total, 0))}</b></div>
        <div className="raised stat"><small>Unpaid shown</small><b>{money(rows.reduce((a, o) => a + (o.balance || 0), 0))}</b></div>
      </div>
      {tab === 'orders' && top.length > 0 && (
        <div className="raised toplist" style={{ marginTop: 10 }}>
          <b>Top sellers</b>
          {top.map((t, i) => (
            <div key={t.name} className="toprow"><span className="rank">{i + 1}</span><div className="topmain"><div className="sumline"><b>{t.name}</b><span>{t.qty} sold · {money(t.rev)}</span></div><div className="bar inset"><motion.i initial={{ width: 0 }} animate={{ width: (t.qty / max) * 100 + '%' }} transition={{ duration: 0.5 }} /></div></div></div>
          ))}
        </div>
      )}
      <div style={{ margin: '10px 0 6px' }}><Tabs v={tab} on={setTab} items={[['orders', 'Orders'], ['voided', 'Voided (' + (st.voided || []).length + ')']]} /></div>
      <div className="row2">
        <input className="input" placeholder="Search order, customer or table" value={q} onChange={(e) => setQ(e.target.value)} />
        <Sel className="input" value={r} onChange={(e) => setR(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Sel>
        <Sel className="input" value={m} onChange={(e) => setM(e.target.value)}><option value="">All methods</option>{Object.entries(MLABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Sel>
        <Sel className="input" value={sv} onChange={(e) => setSv(e.target.value)}><option value="">Paid and unpaid</option><option value="unpaid">Unpaid only</option><option value="paid">Paid only</option></Sel>
        <button className="btn" disabled={!rows.length} onClick={() => exportOrdersCsv(rows, tab)}>CSV</button>
      </div>
      {rows.length === 0 && <p className="mut">No orders match</p>}
      <div className="hist" style={{ marginTop: 10 }}>
        {rows.map((o) => (
          <div key={o.id} className="raised hrow">
            <button className="hhead" onClick={() => setOpen(open === o.id ? null : o.id)}>
              <div><b>{ono(o.no)}{o.balance > 0 ? ' · PARTIAL' : ''}{o.otype ? ' · ' + o.otype : ''}{o.table ? ' ' + o.table : ''}</b><small>{new Date(o.date).toLocaleString()}{o.customerName ? ' · ' + o.customerName : ''}</small></div>
              <div className="hright"><b>{money(o.total)}</b><small>{MLABEL[o.method] || o.method}</small></div>
            </button>
            <AnimatePresence initial={false}>
              {open === o.id && (
                <motion.div key="d" className="hbody" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <div className="hin">
                    {o.items.map((it, k) => <div key={k} className="sumline"><span>{it.qty} x {it.name}{it.note ? ' (' + it.note + ')' : ''}</span><span>{money(it.qty * it.price - (it.bulk || 0))}</span></div>)}
                    <div className="sumline mut"><span>Sub Total</span><span>{money(o.sub)}</span></div>
                    {o.disc > 0 && <div className="sumline mut"><span>Discount</span><span>-{money(o.disc)}</span></div>}
                    <div className="sumline mut"><span>{o.taxName || 'Tax'} ({o.taxPct}%)</span><span>{money(o.tax)}</span></div>
                    <div className="sumline mut"><span>Paid / Balance</span><span>{money(o.paid ?? o.total)} / {money(o.balance || 0)}</span></div>
                    {o.by && <div className="mut">Cashier: {o.by}</div>}
                    {o.note && <div className="mut">Note: {o.note}</div>}
                    {o.voided && <div className="mut">Voided {new Date(o.voidAt).toLocaleString()} by {o.voidBy} · {o.voidReason || 'no reason'} · cash refunded {money(o.refundCash || 0)}</div>}
                    {!o.voided && <PrintBtns o={o} />}
                    <div className="row2">
                      <button className="btn" onClick={() => shareText(receiptText(o))}>Copy / share receipt</button>
                      {!o.voided && o.balance > 0 && <button className="btn pri" onClick={() => setSe(o)}>Collect balance</button>}
                      {!o.voided && <button className="btn bad" onClick={() => setVo(o)}>Void</button>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      {vo && <VoidBox o={vo} close={() => setVo(null)} />}
      {se && <Settle o={se} close={() => setSe(null)} />}
    </div>
  )
}
