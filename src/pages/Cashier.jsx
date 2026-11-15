import Sel from '../Sel.jsx'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useStore, setState, getState } from '../store.js'
import { useCart, setCart, clearCart, addItem, setQty, METHODS, ono } from '../cart.js'
import { uid, num, r2, money, qtyAt, reserved, take, mvRow, curUser, calcSale, priceFor, tracked, isLow, audit } from '../inv.js'
import { PrintBtns, Modal } from '../ui.jsx'
import { useX, setX } from '../xstore.js'
import { beep, pref, setPref } from '../fx.js'
import Scanner from './Scanner.jsx'
import Icon from '../icons.jsx'
import Ic from '../icons2.jsx'
const SL = ({ a, b, big }) => <div className={'sumline' + (big ? ' big' : '')}><span>{a}</span><span>{b}</span></div>
const nav = (p) => window.dispatchEvent(new CustomEvent('pos-nav', { detail: p }))
export default function Cashier() {
  const st = useStore()
  const x = useX()
  const { products, settings, customers, levels } = st
  const cart = useCart()
  const [q, setQ] = useState('')
  const [done, setDone] = useState(null)
  const [scan, setScan] = useState(false)
  const [cf, setCf] = useState('')
  const [rv, setRv] = useState(null)
  const [nc, setNc] = useState(null)
  const [lv, setLv] = useState(pref('lv', 'grid'))
  const sref = useRef(null)
  const kref = useRef(null)
  const wh = settings.activeWh || 'main'
  const L = settings.loyalty || {}
  const fav = x.fav || []
  const cust = customers.find((c) => c.id === cart.customer)
  const t = calcSale(cart, st, cust)
  const earn = L.on && cust ? Math.floor((t.paidNow + t.dep) / (num(L.per) || 100)) : 0
  const lowN = products.filter((p) => isLow(p, st)).length
  const nextNo = st.orders.reduce((m, o) => Math.max(m, o.no || 0), 0) + 1
  const inCart = (id) => (cart.items.find((i) => i.id === id) || {}).qty || 0
  const av = (p) => qtyAt(p, wh) - reserved(st, p.id, wh)
  const add = (p) => { if (tracked(p) && inCart(p.id) >= av(p)) { beep(200, 120); return } beep(); addItem({ ...p, price: priceFor(p, cart.level) }) }
  const plus = (i) => { const p = products.find((z) => z.id === i.id); if (p && tracked(p) && i.qty >= av(p)) return; setQty(i.id, i.qty + 1) }
  const setLevel = (l) => setCart((s) => ({ level: l, items: s.items.map((i) => { const p = products.find((z) => z.id === i.id); return p ? { ...i, price: priceFor(p, l) } : i }) }))
  const pickCust = (id) => { const c = customers.find((z) => z.id === id); setCart({ customer: id, redeem: '', partial: false }); if (c && c.level) setLevel(c.level) }
  const togFav = (id) => setX((s) => ({ fav: (s.fav || []).includes(id) ? (s.fav || []).filter((i) => i !== id) : [...(s.fav || []), id] }))
  const freqIds = useMemo(() => { const m = {}; st.orders.forEach((o) => o.items.forEach((i) => { m[i.id] = (m[i.id] || 0) + i.qty })); return Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 8) }, [st.orders])
  const cats = useMemo(() => [...new Set(products.map((p) => p.cat).filter(Boolean))], [products])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    let base = products
    if (cf === '*fav') base = base.filter((p) => fav.includes(p.id))
    else if (cf === '*freq') base = base.filter((p) => freqIds.includes(p.id))
    else if (cf) base = base.filter((p) => p.cat === cf)
    return s ? base.filter((p) => [p.name, p.barcode, p.sku].some((v) => String(v || '').toLowerCase().includes(s))) : base
  }, [q, products, cf, freqIds, fav])
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
    clearCart()
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
    clearCart(); setRv(null)
  }
  const saveCust = () => {
    if (!nc.name.trim()) return window.alert('Enter the customer name')
    const id = uid()
    setState((s) => ({ customers: [{ id, name: nc.name.trim(), phone: nc.phone.trim(), points: 0 }, ...s.customers] }))
    audit('Customer added', nc.name); setCart({ customer: id }); setNc(null)
  }
  const complete = () => {
    if (!canPay) return
    const s0 = getState()
    const when = new Date().toISOString()
    const no = s0.orders.reduce((m, o) => Math.max(m, o.no || 0), 0) + 1
    const lines = t.lines.map((l) => ({ ...l }))
    const moves = []
    const prods = s0.products.map((p) => {
      const l = lines.find((z) => z.id === p.id)
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
      dtype: cart.dtype, dval: num(cart.dval), method: cart.method, received: cart.method === 'cash' ? t.rec : t.paidNow,
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
    beep(1200, 120)
    clearCart(); setDone(order)
  }
  kref.current = (e) => {
    if (done || rv || nc || scan) return
    if (e.key === 'F2') { e.preventDefault(); sref.current && sref.current.focus() }
    else if (e.key === 'F4') { e.preventDefault(); complete() }
    else if (e.key === 'F8') { e.preventDefault(); park() }
    else if (e.key === 'F9') { e.preventDefault(); clearCart() }
    else if (e.key === 'Escape') setQ('')
  }
  useEffect(() => { const h = (e) => kref.current(e); document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h) }, [])
  const toggleLv = () => { const n = lv === 'grid' ? 'list' : 'grid'; setPref('lv', n); setLv(n) }
  const qc = [...new Set([t.due, Math.ceil(t.due / 50) * 50, Math.ceil(t.due / 100) * 100, Math.ceil(t.due / 500) * 500, Math.ceil(t.due / 1000) * 1000].filter((v) => v > 0).map(r2))].slice(0, 5)
  return (
    <div className="reg">
      <div className="reg-l">
        <div className="searchrow">
          <input ref={sref} className="input" placeholder="Search or scan (F2)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} inputMode="search" />
          <button className="btn" onClick={() => setScan(true)} aria-label="Scan"><Icon n="camera" /></button>
          <button className="btn" onClick={toggleLv} aria-label="Layout"><Ic n={lv === 'grid' ? 'list' : 'grid'} /></button>
          <button className="btn" disabled={!st.orders.length} onClick={() => setDone({ ...st.orders[0], re: true })} aria-label="Reprint last"><Ic n="receipt" /></button>
        </div>
        {scan && <div className="scanfix"><button className="btn scanclose" onClick={() => setScan(false)}><Icon n="close" s={18} /> Close</button><Scanner onClose={() => setScan(false)} onDetect={(c) => { const hit = byCode(String(c).toLowerCase()); if (hit) add(hit); else setQ(c); setScan(false) }} /></div>}
        <div className="chips">
          <button className={'btn' + (cf === '' ? ' on' : '')} onClick={() => setCf('')}>All</button>
          <button className={'btn' + (cf === '*fav' ? ' on' : '')} onClick={() => setCf('*fav')}>★ Favorites</button>
          <button className={'btn' + (cf === '*freq' ? ' on' : '')} onClick={() => setCf('*freq')}>Frequent</button>
          {cats.map((c) => <button key={c} className={'btn' + (cf === c ? ' on' : '')} onClick={() => setCf(c)}>{c}</button>)}
        </div>
        {lowN > 0 && <div className="banner" onClick={() => nav('manage')}>{lowN} product(s) low on stock. Tap to review.</div>}
        {!x.shift && <div className="banner" onClick={() => nav('tools')}>No shift open. Tap to open one in Tools.</div>}
        {products.length === 0 ? <div className="raised empty"><p>No products yet. Add them in Management.</p></div> : list.length === 0 ? <p className="mut">No product matches</p> : (
          <div className={'pgrid cashscroll' + (lv === 'list' ? ' list' : '')}>
            {list.map((p) => (
              <button key={p.id} className="pcard raised" onClick={() => add(p)}>
                <span role="button" className="fav" onClick={(e) => { e.stopPropagation(); togFav(p.id) }}>{fav.includes(p.id) ? '★' : '☆'}</span>
                <div className="pimg inset">{p.image ? <img src={p.image} alt="" /> : <span>{p.name.slice(0, 1).toUpperCase()}</span>}</div>
                <div className="pname">{p.name}</div>
                <div className="pprice">{money(priceFor(p, cart.level))}</div>
                {tracked(p) && <small className={'stk' + (av(p) <= 0 ? ' out' : isLow(p, st) ? ' low' : '')}>{av(p) <= 0 ? 'Out of stock' : av(p) + ' left'}</small>}
                {inCart(p.id) > 0 && <span className="pbadge">{inCart(p.id)}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <aside className="reg-r raised">
        <div className="ordhd"><b>Order {ono(nextNo)}</b><span className="mut">{t.count} items</span></div>
        <div className="ordscroll">
          <Sel className="input" value={cart.level} onChange={(e) => setLevel(e.target.value)}><option value="retail">Retail</option>{levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Sel>
          <div className="row2" style={{ flexWrap: 'nowrap' }}>
            <Sel className="input" value={cart.customer} onChange={(e) => pickCust(e.target.value)}><option value="">Walk-in</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel>
            <button className="btn" style={{ flex: 'none', minWidth: 0 }} onClick={() => setNc({ name: '', phone: '' })} aria-label="New customer">+</button>
          </div>
          {t.lines.length === 0 && <p className="mut">Tap a product to add it</p>}
          {t.lines.map((i) => (
            <div key={i.id} className="line inset">
              <div className="lname"><b>{i.name}</b><small>{money(i.price)}{i.bulk > 0 ? ' · bulk -' + money(i.bulk) : ''}</small></div>
              <div className="qty"><button className="btn" onClick={() => setQty(i.id, i.qty - 1)}>-</button><span>{i.qty}</span><button className="btn" onClick={() => plus(i)}>+</button></div>
              <div className="ltot">{money(i.gross - i.bulk)}</div>
            </div>
          ))}
          <div className="row2">
            <Sel className="input" value={cart.dtype} onChange={(e) => setCart({ dtype: e.target.value })}><option value="%">Discount %</option><option value="fix">Discount {settings.currency}</option></Sel>
            <input className="input" type="number" inputMode="decimal" min="0" placeholder="0" value={cart.dval} onChange={(e) => setCart({ dval: e.target.value })} />
          </div>
          {L.on && cust && <div className="row2"><small className="mut">{cust.points || 0} points</small><input className="input" type="number" inputMode="numeric" min="0" placeholder="Redeem points" value={cart.redeem} onChange={(e) => setCart({ redeem: e.target.value })} /></div>}
          <div className="seg">{METHODS.map(([k, l]) => <button key={k} className={'btn' + (cart.method === k ? ' on' : '')} onClick={() => setCart({ method: k })}>{l}</button>)}</div>
          <input className="input" type="number" inputMode="decimal" min="0" placeholder={cart.method === 'cash' ? 'Cash received' : 'Amount paid (blank = full)'} value={cart.received} onChange={(e) => setCart({ received: e.target.value })} />
          {cart.items.length > 0 && <div className="cc">{qc.map((v, k) => <button key={v} className="btn" onClick={() => setCart({ received: String(v) })}>{k === 0 ? 'Exact' : money(v)}</button>)}</div>}
          {cust && <label className="lbl"><span><input type="checkbox" checked={cart.partial} onChange={(e) => setCart({ partial: e.target.checked })} /> Allow partial payment (owed by {cust.name})</span></label>}
          <div className="sumbox inset">
            <SL a="Sub Total" b={money(t.sub)} />
            {t.applied.map((a, k) => <SL key={k} a={'Discount: ' + a.name} b={'-' + money(a.amt)} />)}
            {t.manual > 0 && <SL a="Manual discount" b={'-' + money(t.manual)} />}
            {t.redeem > 0 && <SL a={'Points (' + t.pts + ')'} b={'-' + money(t.redeem)} />}
            <SL a={(settings.taxName || 'Tax') + ' (' + settings.tax + '%' + (settings.taxIncl ? ' incl.' : '') + ')'} b={money(t.tax)} />
            {t.dep > 0 && <SL a="Deposit paid" b={'-' + money(t.dep)} />}
            {short && t.rec > 0 ? <SL a="Short by" b={money(t.due - t.rec)} /> : t.balance > 0 ? <SL a="Balance owed" b={money(t.balance)} /> : cart.method === 'cash' && <SL a="Change" b={money(t.change)} />}
            {earn > 0 && <SL a="Points earned" b={String(earn)} />}
          </div>
        </div>
        <div className="ordfoot">
          <div className="totbig"><span>Total</span><span>{money(t.total)}</span></div>
          <div className="row2" style={{ flexWrap: 'nowrap' }}>
            <button className="btn bad" onClick={clearCart} title="F9">Clear</button>
            <button className="btn" onClick={park} disabled={!cart.items.length} title="F8">Park</button>
            <button className="btn" disabled={!cart.items.length} onClick={() => setRv({ pickup: '', dep: '', name: '', phone: '' })}>Reserve</button>
          </div>
          <button className="btn pri" style={{ height: 44, fontSize: 16 }} disabled={!canPay} onClick={complete} title="F4">Complete Sale (F4)</button>
        </div>
      </aside>
      {rv && (
        <Modal title="Reserve items" onClose={() => setRv(null)}>
          <input className="input" type="date" value={rv.pickup} onChange={(e) => setRv({ ...rv, pickup: e.target.value })} />
          {!cust && <input className="input" placeholder="Customer name" value={rv.name} onChange={(e) => setRv({ ...rv, name: e.target.value })} />}
          {!cust && <input className="input" placeholder="Phone" value={rv.phone} onChange={(e) => setRv({ ...rv, phone: e.target.value })} />}
          <input className="input" type="number" inputMode="decimal" min="0" placeholder="Deposit received (optional)" value={rv.dep} onChange={(e) => setRv({ ...rv, dep: e.target.value })} />
          <button className="btn pri" onClick={saveRv}>Save reservation</button>
        </Modal>
      )}
      {nc && (
        <Modal title="New customer" onClose={() => setNc(null)}>
          <input className="input" autoFocus placeholder="Name" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
          <input className="input" inputMode="tel" placeholder="Phone" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} />
          <button className="btn pri" onClick={saveCust}>Save and select</button>
        </Modal>
      )}
      {done && (
        <div className="overlay">
          <div className="modal raised">
            <div className="check">✓</div>
            <h2 style={{ margin: 0 }}>{done.re ? 'Last Receipt' : 'Sale Completed'}</h2>
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
