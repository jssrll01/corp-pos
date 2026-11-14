import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore, setState, getState } from '../store.js'
import { useCart, setCart, clearCart, addItem, setQty, calc, fmt, ono, METHODS, MLABEL } from '../cart.js'
import { printReceipt } from '../print.js'
import Scanner from './Scanner.jsx'
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const SAMPLE = [['Grilled Chicken', 129, '1001'], ['Beef Burger', 99, '1002'], ['Margherita Pizza', 119, '1003'], ['Caesar Salad', 79, '1004'], ['French Fries', 39, '1005'], ['Chocolate Cake', 59, '1006'], ['Lemonade', 29, '1007'], ['Hot Coffee', 25, '1008']]
const spring = { type: 'spring', damping: 28, stiffness: 260 }
export default function Cashier() {
  const { products, settings } = useStore()
  const cart = useCart()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(null)
  const [scan, setScan] = useState(false)
  const cur = settings.currency
  const t = calc(cart, settings.tax)
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? products.filter((p) => p.name.toLowerCase().includes(s) || String(p.barcode || '').toLowerCase().includes(s)) : products
  }, [q, products])
  const onKey = (e) => {
    if (e.key !== 'Enter') return
    const s = q.trim().toLowerCase()
    if (!s) return
    const hit = products.find((p) => String(p.barcode || '').toLowerCase() === s) || (list.length === 1 ? list[0] : null)
    if (hit) { add(hit); setQ('') }
  }
  const qtyOf = (id) => (cart.items.find((i) => i.id === id) || {}).qty || 0
  const short = cart.method === 'cash' && t.received < t.total
  const canPay = cart.items.length > 0 && !short
  const add = (p) => { if (p.stock != null && p.stock !== '' && qtyOf(p.id) >= p.stock) return; addItem(p) }
  const loadSample = () => setState(() => ({ products: SAMPLE.map(([name, price, barcode]) => ({ id: uid(), name, price, barcode, image: '' })) }))
  const complete = () => {
    if (!canPay) return
    const no = getState().orders.reduce((m, o) => Math.max(m, o.no || 0), 0) + 1
    const order = {
      id: uid(), no, date: new Date().toISOString(), items: cart.items,
      dtype: cart.dtype, dval: parseFloat(cart.dval) || 0, method: cart.method,
      received: cart.method === 'cash' ? t.received : t.total, note: cart.note.trim(),
      sub: t.sub, disc: t.disc, taxPct: settings.tax, tax: t.tax, total: t.total, change: t.change,
    }
    setState((s) => ({ orders: [order, ...s.orders], products: s.products.map((p) => { const it = order.items.find((x) => x.id === p.id); return it && p.stock != null && p.stock !== '' ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p }) }))
    clearCart(); setOpen(false); setDone(order)
  }
  return (
    <div>
      <div className="searchrow">
        <input className="input" placeholder="Search product name or scan barcode" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} inputMode="search" />
        <button className="btn" onClick={() => setScan(true)} aria-label="Scan barcode">📷</button>
      </div>
      {scan && <Scanner onClose={() => setScan(false)} onDetect={(c) => { const hit = products.find((p) => String(p.barcode || '') === c); if (hit) add(hit); else setQ(c); setScan(false) }} />}
      {products.length === 0 ? (
        <div className="raised empty">
          <p>No products yet. Add them in Management, or load samples to test.</p>
          <button className="btn pri" onClick={loadSample}>Load sample products</button>
        </div>
      ) : list.length === 0 ? (
        <p className="mut">No product matches "{q}"</p>
      ) : (
        <div className="pgrid">
          {list.map((p, i) => (
            <motion.button key={p.id} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }} whileTap={{ scale: 0.95 }} className="pcard raised" onClick={() => add(p)}>
              <div className="pimg inset">{p.image ? <img src={p.image} alt="" /> : <span>{p.name.slice(0, 1).toUpperCase()}</span>}</div>
              <div className="pname">{p.name}</div>
              <div className="pprice">{fmt(p.price, cur)}</div>
              {p.stock != null && p.stock !== '' && <small className={'stk' + (p.stock <= 0 ? ' out' : p.stock <= 5 ? ' low' : '')}>{p.stock <= 0 ? 'Out of stock' : p.stock + ' left'}</small>}
              {qtyOf(p.id) > 0 && <motion.span key={qtyOf(p.id)} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="pbadge">{qtyOf(p.id)}</motion.span>}
            </motion.button>
          ))}
        </div>
      )}
      <div className="cartbar">
        <motion.button whileTap={{ scale: 0.97 }} className="btn pri" onClick={() => setOpen(true)}>View Order ({t.count}) · {fmt(t.total, cur)}</motion.button>
      </div>
      <AnimatePresence>
        {open && <motion.div key="s1" className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />}
        {open && (
          <motion.aside key="s2" className="sheet raised" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring}>
            <div className="sheethd"><h2>Current Order</h2><button className="btn" onClick={() => setOpen(false)}>Close</button></div>
            {cart.items.length === 0 && <p className="mut">No items yet</p>}
            {cart.items.map((i) => (
              <motion.div layout key={i.id} className="line inset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="lname"><b>{i.name}</b><small>{fmt(i.price, cur)} each</small></div>
                <div className="qty"><button className="btn" onClick={() => setQty(i.id, i.qty - 1)}>-</button><span>{i.qty}</span><button className="btn" onClick={() => { const pr = products.find((x) => x.id === i.id); if (pr && pr.stock != null && pr.stock !== '' && i.qty >= pr.stock) return; setQty(i.id, i.qty + 1) }}>+</button></div>
                <div className="ltot">{fmt(i.price * i.qty, cur)}</div>
              </motion.div>
            ))}
            <div className="row2">
              <select className="input" value={cart.dtype} onChange={(e) => setCart({ dtype: e.target.value })}>
                <option value="%">Discount %</option>
                <option value="fix">Discount {cur} fixed</option>
              </select>
              <input className="input" type="number" inputMode="decimal" min="0" placeholder="0" value={cart.dval} onChange={(e) => setCart({ dval: e.target.value })} />
            </div>
            <div className="seg">
              {METHODS.map(([k, l]) => <button key={k} className={'btn' + (cart.method === k ? ' on' : '')} onClick={() => setCart({ method: k })}>{l}</button>)}
            </div>
            {cart.method === 'cash' && (
              <div className="row2">
                <input className="input" type="number" inputMode="decimal" min="0" placeholder="Cash received" value={cart.received} onChange={(e) => setCart({ received: e.target.value })} />
                <button className="btn" onClick={() => setCart({ received: String(t.total) })}>Exact</button>
              </div>
            )}
            <textarea className="input" rows="2" placeholder="Note (optional)" value={cart.note} onChange={(e) => setCart({ note: e.target.value })} />
            <div className="sumbox inset">
              <div className="sumline"><span>Sub Total</span><span>{fmt(t.sub, cur)}</span></div>
              <div className="sumline"><span>Discount</span><span>-{fmt(t.disc, cur)}</span></div>
              <div className="sumline"><span>Tax ({settings.tax}%)</span><span>{fmt(t.tax, cur)}</span></div>
              <div className="sumline big"><span>Total</span><span>{fmt(t.total, cur)}</span></div>
              {cart.method === 'cash' && <div className="sumline"><span>{short && t.received > 0 ? 'Short by' : 'Change'}</span><span>{short && t.received > 0 ? fmt(t.total - t.received, cur) : fmt(t.change, cur)}</span></div>}
            </div>
            <div className="row2">
              <button className="btn bad" onClick={clearCart}>Clear</button>
              <button className="btn pri" disabled={!canPay} onClick={complete}>Complete Sale</button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {done && (
          <motion.div key="m" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal raised" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={spring}>
              <motion.div className="check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, ...spring }}>✓</motion.div>
              <h2 style={{ margin: 0 }}>Sale Completed</h2>
              <p className="mut" style={{ margin: 0 }}>Order {ono(done.no)}</p>
              <div className="sumbox inset">
                <div className="sumline big"><span>Total</span><span>{fmt(done.total, cur)}</span></div>
                <div className="sumline"><span>Payment</span><span>{MLABEL[done.method]}</span></div>
                {done.method === 'cash' && <><div className="sumline"><span>Cash</span><span>{fmt(done.received, cur)}</span></div><div className="sumline"><span>Change</span><span>{fmt(done.change, cur)}</span></div></>}
              </div>
              <div className="row2">
                <button className="btn" onClick={() => printReceipt(done, settings, 58)}>Print 58mm</button>
                <button className="btn" onClick={() => printReceipt(done, settings, 60)}>Print 60mm</button>
              </div>
              <button className="btn pri" onClick={() => setDone(null)}>Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
