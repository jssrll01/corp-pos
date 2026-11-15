import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore, setState, getState } from '../store.js'
import { useCart, setCart, clearCart, addItem, setQty, METHODS, ono } from '../cart.js'
import { uid, num, r2, money, qtyAt, reserved, take, mvRow, curUser, calcSale, priceFor, tracked, isLow, audit } from '../inv.js'
import { PrintBtns, Modal } from '../ui.jsx'
import Scanner from './Scanner.jsx'
const spring = { type: 'spring', damping: 28, stiffness: 260 }
const SL = ({ a, b, big }) => <div className={'sumline' + (big ? ' big' : '')}><span>{a}</span><span>{b}</span></div>
const nav = (p) => window.dispatchEvent(new CustomEvent('pos-nav', { detail: p }))
export default function Cashier() {
  const st = useStore()
  const { products, settings, customers, levels } = st
  const cart = useCart()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(null)
  const [scan, setScan] = useState(false)
  const [freq, setFreq] = useState(false)
  const [rv, setRv] = useState(null)
  const wh = settings.activeWh || 'main'
  const L = settings.loyalty || {}
  const cust = customers.find((c) => c.id === cart.customer)
  const t = calcSale(cart, st, cust)
  const earn = L.on && cust ? Math.floor((t.paidNow + t.dep) / (num(L.per) || 100)) : 0
  const lowN = products.filter((p) => isLow(p, st)).length
  const inCart = (id) => (cart.items.find((i) => i.id === id) || {}).qty || 0
  const av = (p) => qtyAt(p, wh) - reserved(st, p.id, wh)
  const add = (p) => { if (tracked(p) && inCart(p.id) >= av(p)) return; addItem({ ...p, price: priceFor(p, cart.level) }) }
  const plus = (i) => { const p = products.find((x) => x.id === i.id); if (p && tracked(p) && i.qty >= av(p)) return; setQty(i.id, i.qty + 1) }
  const setLevel = (lv) => setCart((s) => ({ level: lv, items: s.items.map((i) => { const p = products.find((x) => x.id === i.id); return p ? { ...i, price: priceFor(p, lv) } : i }) }))
  const pickCust = (id) => { const c = customers.find((x) => x.id === id); setCart({ customer: id, redeem: '', partial: false }); if (c && c.level) setLevel(c.level) }
  const freqIds = useMemo(() => { const m = {}; st.orders.forEach((o) => o.items.forEach((i) => { m[i.id] = (m[i.id] || 0) + i.qty })); return Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 8) }, [st.orders])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = freq ? products.filter((p) => freqIds.includes(p.id)) : products
    return s ? base.filter((p) => [p.name, p.barcode, p.sku].some((v) => String(v || '').toLowerCase().includes(s))) : base
  }, [q, products, freq, freqIds])
  const byCode = (s) => products.find((p) => String(p.barcode || '').toLowerCase() === s || String(p.sku || '').toLowerCase() === s)
  const onKey = (e) => {
    if (e.key !== 'Enter') return
    const s = q.trim().toLowerCase()
    if (!s) return
    const hit = byCode(s) || (list.length === 1 ? list[0] : null)
    if (hit) { add(hit); setQ('') }
  }
  const short = !t.full && !cart.partial
  const canPay = cart.items.length > 0 && (t.balance === 0 || (cart.partial && !!cust))
  const park = () => {
    if (!cart.items.length) return
    const label = window.prompt('Label for this parked sale (optional)', cust ? cust.name : '')
    if (label === null) return
    setState((s) => ({ parked: [{ id: uid(), no: s.parked.reduce((m, p) => Math.max(m, p.no || 0), 0) + 1, date: new Date().toISOString(), label, by: curUser().name, cart }, ...s.parked] }))
    audit('Sale parked', label)
    clearCart(); setOpen(false)
  }
  const saveRv = () => {
    if (!rv.pickup) return window.alert('Pick a pickup date')
    if (!cust && !rv.name.trim()) return window.alert('Enter the customer name')
    const dep = num(rv.dep)
    setState((s) => ({
      reservations: [{ id: uid(), no: s.reservations.reduce((m, r) => Math.max(m, r.no || 0), 0) + 1, date: new Date().toISOString(), pickup: rv.pickup, customerId: cart.customer, name: cust ? cust.name : rv.name.trim(), phone: cust ? cust.phone : rv.phone, items: cart.items, level: cart.level, deposit: dep, status: 'open', whId: wh, by: curUser().name }, ...s.reservations],
      cashlog: dep > 0 ? [{ id: uid(), date: new Date().toISOString(), type: 'in', amount: dep, note: 'Reservation deposit' }, ...s.cashlog] : s.cashlog,
    }))
    audit('Reservation created', cust ? cust.name : rv.name)
    clearCart(); setRv(null); setOpen(false)
  }
  const complete = () => {
    if (!canPay) return
    const s0 = getState()
    const when = new Date().toISOString()
    const no = s0.orders.reduce((m, o) => Math.max(m, o.no || 0), 0) + 1
    const lines = t.lines.map((l) => ({ ...l }))
    const moves = []
    const prods = s0.products.map((p) => {
      const l = lines.find((x) => x.id === p.id)
      if (!l) return p
      l.cost = num(p.cost); l.sku = p.sku || ''
      if (!tracked(p)) return p
      const r = take(p, l.qty, wh)
      l.lots = r.used
      moves.push(mvRow('sale', p, wh, -l.qty, ono(no)))
      return r.p
    })
    const pays = []
    if (t.dep > 0) pays.push({ id: uid(), date: when, amount: t.dep, method: 'deposit', note: 'Reservation deposit' })
    if (t.paidNow > 0) pays.push({ id: uid(), date: when, amount: t.paidNow, method: cart.method, note: '' })
    const order = {
      id: uid(), no, date: when,
      items: lines.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty, bulk: l.bulk, cost: l.cost || 0, sku: l.sku || '', lots: l.lots || [] })),
      dtype: cart.dtype, dval: num(cart.dval), method: cart.method, received: cart.method === 'cash' ? t.rec : t.paidNow, note: cart.note.trim(),
      sub: t.sub, disc: t.disc, autoDisc: r2(t.bulk + t.order), manual: t.manual, redeem: t.redeem, pts: t.pts, earned: earn,
      taxPct: settings.tax, taxName: settings.taxName, taxIncl: !!settings.taxIncl, tax: t.tax, total: t.total, net: r2(t.total - t.tax),
      cogs: r2(lines.reduce((a, l) => a + (l.cost || 0) * l.qty, 0)), change: t.change, paid: r2(t.dep + t.paidNow), balance: t.balance, payments: pays,
      customerId: cust ? cust.id : '', customerName: cust ? cust.name : '', level: cart.level, branchId: settings.activeBranch || 'main', whId: wh, by: curUser().name,
    }
    setState((s) => ({
      orders: [order, ...s.orders], products: prods, moves: [...moves, ...s.moves].slice(0, 5000),
      customers: cust ? s.customers.map((c) => (c.id === cust.id ? { ...c, points: Math.max(0, (c.points || 0) - t.pts + earn) } : c)) : s.customers,
      reservations: cart.resId ? s.reservations.map((r) => (r.id === cart.resId ? { ...r, status: 'done' } : r)) : s.reservations,
    }))
    audit('Sale', ono(no) + ' ' + money(t.total))
    clearCart(); setOpen(false); setDone(order)
  }
  return (
    <div>
      <div className="searchrow">
        <input className="input" placeholder="Search name, SKU or scan barcode" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} inputMode="search" />
        <button className="btn" onClick={() => setScan(true)} aria-label="Scan barcode">📷</button>
      </div>
      {scan && <Scanner onClose={() => setScan(false)} onDetect={(c) => { const hit = byCode(String(c).toLowerCase()); if (hit) add(hit); else setQ(c); setScan(false) }} />}
      <div className="row2" style={{ marginTop: 10 }}>
        <select className="input" value={cart.level} onChange={(e) => setLevel(e.target.value)}><option value="retail">Retail</option>{levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select className="input" value={cart.customer} onChange={(e) => pickCust(e.target.value)}><option value="">Walk-in</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <div className="chips"><button className={'btn' + (freq ? ' on' : '')} onClick={() => setFreq(!freq)}>Frequent items</button></div>
      {lowN > 0 && <div className="banner" onClick={() => nav('manage')}>{lowN} product(s) low on stock. Tap to review in Management.</div>}
      {products.length === 0 ? (
        <div className="raised empty"><p>No products yet. Add them in Management.</p></div>
      ) : list.length === 0 ? (
        <p className="mut">No product matches</p>
      ) : (
        <div className="pgrid">
          {list.map((p) => (
            <button key={p.id} className="pcard raised" onClick={() => add(p)}>
              <div className="pimg inset">{p.image ? <img src={p.image} alt="" /> : <span>{p.name.slice(0, 1).toUpperCase()}</span>}</div>
              <div className="pname">{p.name}</div>
              <div className="pprice">{money(priceFor(p, cart.level))}</div>
              {tracked(p) && <small className={'stk' + (av(p) <= 0 ? ' out' : isLow(p, st) ? ' low' : '')}>{av(p) <= 0 ? 'Out of stock' : av(p) + ' left'}</small>}
              {inCart(p.id) > 0 && <span className="pbadge">{inCart(p.id)}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="cartbar">
        <button className="btn sm" onClick={park} disabled={!cart.items.length}>Park</button>
        <button className="btn pri" onClick={() => setOpen(true)}>View Order ({t.count}) · {money(t.total)}</button>
      </div>
      <AnimatePresence>
        {open && <motion.div key="s1" className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />}
        {open && (
          <motion.aside key="s2" className="sheet raised" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring}>
            <div className="sheethd"><h2>Current Order</h2><button className="btn" onClick={() => setOpen(false)}>Close</button></div>
            {t.lines.length === 0 && <p className="mut">No items yet</p>}
            {t.lines.map((i) => (
              <div key={i.id} className="line inset">
                <div className="lname"><b>{i.name}</b><small>{money(i.price)} each{i.bulk > 0 ? ' · bulk -' + money(i.bulk) : ''}</small></div>
                <div className="qty"><button className="btn" onClick={() => setQty(i.id, i.qty - 1)}>-</button><span>{i.qty}</span><button className="btn" onClick={() => plus(i)}>+</button></div>
                <div className="ltot">{money(i.gross - i.bulk)}</div>
              </div>
            ))}
            <div className="row2">
              <select className="input" value={cart.dtype} onChange={(e) => setCart({ dtype: e.target.value })}><option value="%">Discount %</option><option value="fix">Discount {settings.currency} fixed</option></select>
              <input className="input" type="number" inputMode="decimal" min="0" placeholder="0" value={cart.dval} onChange={(e) => setCart({ dval: e.target.value })} />
            </div>
            {L.on && cust && (
              <div className="row2"><small className="mut" style={{ alignSelf: 'center' }}>{cust.points || 0} points</small><input className="input" type="number" inputMode="numeric" min="0" placeholder="Redeem points" value={cart.redeem} onChange={(e) => setCart({ redeem: e.target.value })} /></div>
            )}
            <div className="seg">{METHODS.map(([k, l]) => <button key={k} className={'btn' + (cart.method === k ? ' on' : '')} onClick={() => setCart({ method: k })}>{l}</button>)}</div>
            <div className="row2">
              <input className="input" type="number" inputMode="decimal" min="0" placeholder={cart.method === 'cash' ? 'Cash received' : 'Amount paid (blank = full)'} value={cart.received} onChange={(e) => setCart({ received: e.target.value })} />
              <button className="btn" onClick={() => setCart({ received: String(t.due) })}>Exact</button>
            </div>
            {cust && <label className="lbl"><span><input type="checkbox" checked={cart.partial} onChange={(e) => setCart({ partial: e.target.checked })} /> Allow partial payment (balance owed by {cust.name})</span></label>}
            <textarea className="input" rows="2" placeholder="Note (optional)" value={cart.note} onChange={(e) => setCart({ note: e.target.value })} />
            <div className="sumbox inset">
              <SL a="Sub Total" b={money(t.sub)} />
              {t.applied.map((a, k) => <SL key={k} a={'Discount: ' + a.name} b={'-' + money(a.amt)} />)}
              {t.manual > 0 && <SL a="Manual discount" b={'-' + money(t.manual)} />}
              {t.redeem > 0 && <SL a={'Points (' + t.pts + ')'} b={'-' + money(t.redeem)} />}
              <SL a={(settings.taxName || 'Tax') + ' (' + settings.tax + '%' + (settings.taxIncl ? ' incl.' : '') + ')'} b={money(t.tax)} />
              <SL big a="Total" b={money(t.total)} />
              {t.dep > 0 && <SL a="Deposit paid" b={'-' + money(t.dep)} />}
              {short && t.rec > 0 ? <SL a="Short by" b={money(t.due - t.rec)} /> : t.balance > 0 ? <SL a="Balance owed" b={money(t.balance)} /> : cart.method === 'cash' && <SL a="Change" b={money(t.change)} />}
              {earn > 0 && <SL a="Points earned" b={String(earn)} />}
            </div>
            <div className="row2"><button className="btn bad" onClick={clearCart}>Clear</button><button className="btn" onClick={park} disabled={!cart.items.length}>Park</button></div>
            <div className="row2">
              <button className="btn" disabled={!cart.items.length} onClick={() => setRv({ pickup: '', dep: '', name: '', phone: '' })}>Reserve</button>
              <button className="btn pri" disabled={!canPay} onClick={complete}>Complete Sale</button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      {rv && (
        <Modal title="Reserve items" onClose={() => setRv(null)}>
          <input className="input" type="date" value={rv.pickup} onChange={(e) => setRv({ ...rv, pickup: e.target.value })} />
          {!cust && <input className="input" placeholder="Customer name" value={rv.name} onChange={(e) => setRv({ ...rv, name: e.target.value })} />}
          {!cust && <input className="input" placeholder="Phone" value={rv.phone} onChange={(e) => setRv({ ...rv, phone: e.target.value })} />}
          <input className="input" type="number" inputMode="decimal" min="0" placeholder="Deposit received (optional)" value={rv.dep} onChange={(e) => setRv({ ...rv, dep: e.target.value })} />
          <button className="btn pri" onClick={saveRv}>Save reservation</button>
        </Modal>
      )}
      {done && (
        <div className="overlay">
          <div className="modal raised">
            <div className="check">✓</div>
            <h2 style={{ margin: 0 }}>Sale Completed</h2>
            <p className="mut" style={{ margin: 0 }}>Order {ono(done.no)}</p>
            <div className="sumbox inset">
              <SL big a="Total" b={money(done.total)} />
              <SL a="Paid" b={money(done.paid)} />
              {done.balance > 0 && <SL a="Balance owed" b={money(done.balance)} />}
              {done.method === 'cash' && <SL a="Change" b={money(done.change)} />}
              {done.earned > 0 && <SL a="Points earned" b={String(done.earned)} />}
            </div>
            <PrintBtns o={done} />
            <button className="btn pri" onClick={() => setDone(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
