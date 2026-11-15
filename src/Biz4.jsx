import { useState, useEffect } from 'react'
import Sel from './Sel.jsx'
import { useStore, setState, getState } from './store.js'
import { useX, setX, uid } from './xstore.js'
import { money, num, r2, dkey, isLow, qtyAt, tracked, take, put, mvRow, audit, MAIN, dl, csv, curUser } from './inv.js'
import { ono, METHODS } from './cart.js'
import { Tbl, Tabs } from './ui.jsx'
import { Sh, R } from './Biz2.jsx'
import { printDoc } from './print.js'
import { pref, getRollup, settleOrder, shareText } from './fx.js'
const sum = (a, f) => r2(a.reduce((s, o) => s + num(f(o)), 0))
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const span = (n) => { const a = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); a.push(dkey(d)) } return a }
const whOf = (st) => st.settings.activeWh || MAIN
const TYPES = ['Retail', 'Wholesale', 'Delivery']
const typeOf = (o) => (TYPES.includes(o.otype) ? o.otype : 'Retail')
const pays = (o) => o.payments || [{ date: o.date, method: o.method, amount: o.paid ?? o.total }]
const cats = (st) => [...new Set(st.products.map((p) => p.cat).filter(Boolean))]
const fm = (st) => (n) => (st.settings.currency || '') + r2(n).toFixed(2)
const Bars = ({ vals, tip }) => { const mx = Math.max(1, ...vals); return <div className="bars">{vals.map((v, i) => <i key={i} title={tip[i]} style={{ height: Math.max(2, (v / mx) * 100) + '%' }} />)}</div> }
const SLIP = 'body{width:76mm;padding:3mm;font:12px/1.4 monospace;color:#000}.c{text-align:center}.b{font-weight:700}.r{display:flex;justify-content:space-between;gap:6px}hr{border:0;border-top:1px dashed #000}'

export const quoteDoc = (t, cart, cust, no) => {
  const st = getState().settings; const f = fm({ settings: st })
  const rows = t.lines.map((i) => '<div class="r"><span>' + i.qty + ' x ' + esc(i.name) + '</span><span>' + f(i.gross - i.bulk) + '</span></div>').join('')
  printDoc('<div class="c b" style="font-size:15px">' + esc(st.name) + '</div><div class="c b">QUOTATION</div><div class="c">Q-' + no + ' · ' + new Date().toLocaleDateString() + '</div>' + (cust ? '<div>Customer: ' + esc(cust.name) + '</div>' : '') + '<hr>' + rows + '<hr><div class="r"><span>Sub total</span><span>' + f(t.sub) + '</span></div>' + (t.disc > 0 ? '<div class="r"><span>Discount</span><span>-' + f(t.disc) + '</span></div>' : '') + '<div class="r"><span>' + esc(st.taxName || 'Tax') + '</span><span>' + f(t.tax) + '</span></div><div class="r b"><span>TOTAL</span><span>' + f(t.total) + '</span></div><hr><div class="c">Valid for 7 days. Prices may change without notice.</div>', '80mm auto', SLIP)
}
export function Landscape() {
  const [p, setP] = useState(false)
  const lock = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}) } catch (e) {} }
  const full = () => { try { const h = document.documentElement; if (!document.fullscreenElement && h.requestFullscreen) { h.requestFullscreen().then(lock).catch(lock); return } } catch (e) {} lock() }
  useEffect(() => {
    const chk = () => setP(window.innerHeight > window.innerWidth && window.matchMedia('(pointer:coarse)').matches)
    const first = () => { if (pref('fs1', '1') === '1') full(); else lock() }
    chk(); lock()
    window.addEventListener('resize', chk); window.addEventListener('orientationchange', chk)
    document.addEventListener('pointerdown', first, { once: true })
    return () => { window.removeEventListener('resize', chk); window.removeEventListener('orientationchange', chk); document.removeEventListener('pointerdown', first) }
  }, [])
  if (!p) return null
  return (
    <div className="rot">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
      <h2>Rotate your device</h2>
      <div>This POS works in landscape.</div>
      <button className="btn pri" onClick={full}>Go landscape</button>
    </div>
  )
}
export function Utang({ close }) {
  const st = useStore(); const x = useX()
  const [t, setT] = useState('book'); const [cid, setCid] = useState(null); const [a, setA] = useState(''); const [mt, setMt] = useState('cash'); const [m, setM] = useState('')
  const lim = x.climit || {}
  const open = st.orders.filter((o) => o.balance > 0)
  const by = {}
  open.forEach((o) => { const k = o.customerId || ''; const r = by[k] || (by[k] = { id: k, name: o.customerName || 'Walk-in', owed: 0, n: 0, oldest: o.date }); r.owed = r2(r.owed + o.balance); r.n++; if (o.date < r.oldest) r.oldest = o.date })
  const rows = Object.values(by).map((r) => { const c = st.customers.find((z) => z.id === r.id); return { ...r, phone: c ? c.phone : '', days: Math.floor((Date.now() - new Date(r.oldest)) / 864e5) } }).sort((p, q) => q.owed - p.owed)
  const total = sum(rows, (r) => r.owed)
  const pay = () => {
    const v = r2(num(a)); const r = rows.find((z) => z.id === cid)
    if (!r || v <= 0 || v > r.owed + 0.001) return setM('Enter an amount up to ' + money(r ? r.owed : 0))
    let rem = v
    open.filter((o) => (o.customerId || '') === cid).sort((p, q) => new Date(p.date) - new Date(q.date)).forEach((o) => { const k = r2(Math.min(o.balance, rem)); if (k > 0) { settleOrder(o.id, k, mt); rem = r2(rem - k) } })
    setM('Recorded ' + money(v)); setA(''); setCid(null)
  }
  const note = (r) => 'Hi ' + r.name + ', your balance at ' + st.settings.name + ' is ' + money(r.owed) + '. Thank you!'
  const link = (r, k) => { const ph = String(r.phone || '').replace(/[^\d+]/g, ''); return k === 'wa' ? 'https://wa.me/' + ph.replace('+', '') + '?text=' + encodeURIComponent(note(r)) : 'sms:' + ph + '?body=' + encodeURIComponent(note(r)) }
  const bk = [['0 to 7 days', 0, 7], ['8 to 30 days', 8, 30], ['31 days and over', 31, 99999]].map(([l, lo, hi]) => { const a2 = open.filter((o) => { const d = Math.floor((Date.now() - new Date(o.date)) / 864e5); return d >= lo && d <= hi }); return { l, n: a2.length, s: sum(a2, (o) => o.balance) } })
  return (
    <Sh t="Utang book" close={close} w={620}>
      <Tabs v={t} on={setT} items={[['book', 'Balances'], ['age', 'Aging'], ['lim', 'Credit limits']]} />
      {t === 'book' && (<>
        <R big a="Total owed to you" b={money(total)} />
        {rows.length === 0 && <small className="mut">Nobody owes anything.</small>}
        {rows.map((r) => (
          <div key={r.id} className="raised prow"><div className="pinfo"><b>{r.name}</b><small>{r.n} order(s) · oldest {r.days} days{lim[r.id] ? ' · limit ' + money(lim[r.id]) : ''}</small></div><b>{money(r.owed)}</b>
            {r.id && <button className="btn pri sm" onClick={() => { setCid(r.id); setA(String(r.owed)) }}>Collect</button>}
            {r.phone && <><a className="btn sm" href={link(r, 'wa')} target="_blank" rel="noreferrer">WhatsApp</a><a className="btn sm" href={link(r, 'sms')}>SMS</a></>}
          </div>))}
        {cid && (<div className="sumbox inset"><div className="seg">{METHODS.map(([k, l]) => <button key={k} className={'btn' + (mt === k ? ' on' : '')} onClick={() => setMt(k)}>{l}</button>)}</div><input className="input" type="number" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} /><button className="btn pri" onClick={pay}>Record payment (oldest orders first)</button></div>)}
        <button className="btn" disabled={!rows.length} onClick={() => dl('utang-' + dkey(new Date()) + '.csv', csv([['Customer', 'Phone', 'Orders', 'Oldest days', 'Owed'], ...rows.map((r) => [r.name, r.phone, r.n, r.days, r.owed])]))}>Export CSV</button>
        <small className="mut">{m}</small>
      </>)}
      {t === 'age' && <Tbl name="utang-aging" rows={bk} cols={[['Age', (r) => r.l], ['Orders', (r) => r.n], ['Owed', (r) => money(r.s)]]} />}
      {t === 'lim' && (<>
        <small className="mut">Blank or 0 means no limit. The register blocks new credit above the limit.</small>
        {st.customers.map((c) => <div key={c.id} className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><span style={{ flex: 1 }}>{c.name}</span><input className="input" style={{ width: 120 }} type="number" inputMode="decimal" placeholder="No limit" value={lim[c.id] || ''} onChange={(e) => setX({ climit: { ...lim, [c.id]: e.target.value } })} /></div>)}
      </>)}
    </Sh>
  )
}
export function Pricing({ close }) {
  const st = useStore(); const f = fm(st)
  const [t, setT] = useState('tier'); const [c, setC] = useState(''); const [lv, setLv] = useState('retail'); const [n, setN] = useState(''); const [step, setStep] = useState('1'); const [m, setM] = useState('')
  const [tg, setTg] = useState({ pack: '', pcs: '', mg: '25' })
  const tgt = st.products.filter((p) => !c || p.cat === c)
  const pf = (p, l) => (l === 'retail' ? num(p.price) : num((p.prices || {})[l]) || num(p.price))
  const apply = (label, fn) => {
    if (!window.confirm(label + ' for ' + tgt.length + ' product(s)?')) return
    const ids = new Set(tgt.map((p) => p.id))
    setState((s) => ({ products: s.products.map((p) => (ids.has(p.id) ? fn(p) : p)) }))
    audit('Pricing', label + ' ' + (c || 'all')); setM('Updated ' + tgt.length + ' product(s)')
  }
  const sc = (l) => Math.max(0.01, num(step) || 1)
  const rnd = (v) => r2(Math.round(num(v) / sc()) * sc())
  const text = [st.settings.name + ' price list' + (lv !== 'retail' ? ' (' + ((st.levels.find((z) => z.id === lv) || {}).name || '') + ')' : ''), ...tgt.map((p) => p.name + '  ' + f(pf(p, lv)))].join('\n')
  const html = '<h2>' + esc(st.settings.name) + '</h2>' + tgt.map((p) => '<div>' + esc(p.name) + ' <b style="float:right">' + f(pf(p, lv)) + '</b></div>').join('')
  const pc = num(tg.pack) / Math.max(1, num(tg.pcs)); const raw = tg.mg < 100 ? pc / (1 - num(tg.mg) / 100) : 0
  const catSel = <Sel className="input" value={c} onChange={(e) => setC(e.target.value)}><option value="">All categories</option>{cats(st).map((k) => <option key={k} value={k}>{k}</option>)}</Sel>
  const lvSel = (all) => <Sel className="input" value={lv} onChange={(e) => setLv(e.target.value)}>{all && <option value="retail">Retail</option>}{st.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Sel>
  return (
    <Sh t="Pricing tools" close={close} w={700}>
      <Tabs v={t} on={(k) => { setT(k); setM(''); if (k === 'level' && lv === 'retail' && st.levels[0]) setLv(st.levels[0].id) }} items={[['tier', 'Compare'], ['list', 'Price list'], ['level', 'Level prices'], ['cost', 'Cost-plus'], ['round', 'Rounding'], ['tingi', 'Tingi']]} />
      {t === 'tier' && <Tbl name="price-tiers" rows={st.products} cols={[['Product', (p) => p.name], ['Cost', (p) => money(p.cost)], ['Retail', (p) => money(p.price)], ...st.levels.map((l) => [l.name, (p) => ((p.prices || {})[l.id] ? money(p.prices[l.id]) : '-')]), ['Margin', (p) => (num(p.price) > 0 ? Math.round(((num(p.price) - num(p.cost)) / num(p.price)) * 100) : 0) + '%']]} />}
      {t === 'list' && (<>{catSel}{lvSel(true)}<pre className="inset" style={{ padding: 12, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', maxHeight: '40dvh', overflow: 'auto' }}>{text}</pre><div className="row2"><button className="btn pri" onClick={() => shareText(text)}>Copy / share</button><button className="btn" onClick={() => printDoc(html, 'A4', 'body{font:13px sans-serif;padding:12mm}')}>Print</button></div></>)}
      {t === 'level' && (<>{catSel}{lvSel(false)}{st.levels.length === 0 && <small className="mut">Add a price level (for example Wholesale) in Management first.</small>}<input className="input" type="number" inputMode="decimal" placeholder="Percent of retail price, e.g. 90" value={n} onChange={(e) => setN(e.target.value)} /><button className="btn pri" disabled={!st.levels.length || !(num(n) > 0)} onClick={() => apply('Set level prices to ' + n + '% of retail', (p) => ({ ...p, prices: { ...(p.prices || {}), [lv]: r2((num(p.price) * num(n)) / 100) } }))}>Apply to {tgt.length} product(s)</button></>)}
      {t === 'cost' && (<>{catSel}<input className="input" type="number" inputMode="decimal" placeholder="Markup on cost %, e.g. 30" value={n} onChange={(e) => setN(e.target.value)} />{num(n) > 0 && tgt.filter((p) => num(p.cost) > 0).slice(0, 4).map((p) => <R key={p.id} a={p.name} b={money(p.price) + ' to ' + money(r2(num(p.cost) * (1 + num(n) / 100)))} />)}<button className="btn pri" disabled={!(num(n) > 0)} onClick={() => apply('Retail price = cost + ' + n + '%', (p) => (num(p.cost) > 0 ? { ...p, price: r2(num(p.cost) * (1 + num(n) / 100)) } : p))}>Apply (products without cost are skipped)</button></>)}
      {t === 'round' && (<>{catSel}<Sel className="input" value={step} onChange={(e) => setStep(e.target.value)}>{['0.25', '0.5', '1', '5', '10'].map((k) => <option key={k} value={k}>Round to nearest {k}</option>)}</Sel>{tgt.slice(0, 4).map((p) => <R key={p.id} a={p.name} b={money(p.price) + ' to ' + money(rnd(p.price))} />)}<button className="btn pri" onClick={() => apply('Round prices to ' + step, (p) => ({ ...p, price: rnd(p.price), prices: Object.fromEntries(Object.entries(p.prices || {}).map(([k, v]) => [k, rnd(v)])) }))}>Apply (all price levels)</button></>)}
      {t === 'tingi' && (<>
        <div className="row2"><input className="input" type="number" inputMode="decimal" placeholder="Pack or case cost" value={tg.pack} onChange={(e) => setTg({ ...tg, pack: e.target.value })} /><input className="input" type="number" inputMode="numeric" placeholder="Pieces inside" value={tg.pcs} onChange={(e) => setTg({ ...tg, pcs: e.target.value })} /></div>
        <input className="input" type="number" inputMode="decimal" placeholder="Margin on price %" value={tg.mg} onChange={(e) => setTg({ ...tg, mg: e.target.value })} />
        {num(tg.pack) > 0 && num(tg.pcs) > 0 && <div className="sumbox inset"><R a="Cost per piece" b={money(pc)} /><R a="Price for that margin" b={money(raw)} /><R a="Rounded up to 0.50" b={money(Math.ceil(raw * 2) / 2)} /><R big a="Rounded up to 1" b={money(Math.ceil(raw))} /></div>}
      </>)}
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function BreakBulk({ close }) {
  const st = useStore(); const w = whOf(st)
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [q, setQ] = useState(''); const [u, setU] = useState(''); const [m, setM] = useState('')
  const opts = st.products.filter(tracked)
  const go = () => {
    const ps = st.products.find((z) => z.id === a), pd = st.products.find((z) => z.id === b)
    const n = Math.floor(num(q)), k = Math.floor(num(u))
    if (!ps || !pd || ps.id === pd.id || n < 1 || k < 1) return setM('Pick two different products, a quantity and pieces per unit')
    const r = take(ps, n, w)
    if (r.short > 0) return setM('Only ' + (n - r.short) + ' of ' + ps.name + ' in stock here')
    const add = put(pd, w, n * k, '', '')
    const nd = { ...add, cost: num(pd.cost) > 0 ? pd.cost : r2(num(ps.cost) / k) }
    setState((s) => ({ products: s.products.map((p) => (p.id === ps.id ? r.p : p.id === pd.id ? nd : p)), moves: [mvRow('adjust', ps, w, -n, 'Break bulk'), mvRow('adjust', pd, w, n * k, 'Break bulk'), ...s.moves].slice(0, 5000) }))
    audit('Break bulk', ps.name + ' x' + n + ' to ' + pd.name + ' x' + n * k); setM('Done: ' + n + ' x ' + ps.name + ' became ' + n * k + ' x ' + pd.name); setQ('')
  }
  return (
    <Sh t="Break bulk (case to pieces)" close={close} w={460}>
      <Sel className="input" value={a} onChange={(e) => setA(e.target.value)}><option value="">From (case, sack, box)</option>{opts.map((p) => <option key={p.id} value={p.id}>{p.name} ({qtyAt(p, w)})</option>)}</Sel>
      <Sel className="input" value={b} onChange={(e) => setB(e.target.value)}><option value="">To (piece, kilo, tingi)</option>{opts.map((p) => <option key={p.id} value={p.id}>{p.name} ({qtyAt(p, w)})</option>)}</Sel>
      <div className="row2"><input className="input" type="number" inputMode="numeric" placeholder="How many to open" value={q} onChange={(e) => setQ(e.target.value)} /><input className="input" type="number" inputMode="numeric" placeholder="Pieces per one" value={u} onChange={(e) => setU(e.target.value)} /></div>
      <button className="btn pri" onClick={go}>Convert stock</button>
      <small className="mut">If the piece product has no cost yet, it gets the case cost divided by the pieces.</small>
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function Receive({ close }) {
  const st = useStore(); const x = useX(); const w = whOf(st)
  const [pid, setPid] = useState(''); const [q, setQ] = useState(''); const [c, setC] = useState(''); const [ex, setEx] = useState('')
  const [lines, setLines] = useState([]); const [sp, setSp] = useState(''); const [inv, setInv] = useState(''); const [cr, setCr] = useState(false); const [m, setM] = useState('')
  const total = sum(lines, (l) => l.q * l.c)
  const addLine = () => {
    const p = st.products.find((z) => z.id === pid); const n = Math.floor(num(q))
    if (!p || n < 1) return setM('Pick a product and quantity')
    setLines([...lines, { k: uid(), id: p.id, name: p.name, q: n, c: num(c) || num(p.cost), ex }]); setPid(''); setQ(''); setC(''); setEx(''); setM('')
  }
  const go = () => {
    if (!lines.length) return
    const moves = [], map = {}
    lines.forEach((l) => {
      const orig = st.products.find((z) => z.id === l.id); if (!orig) return
      let p = map[l.id] || orig
      if (tracked(p)) { p = put(p, w, l.q, inv, l.ex || ''); moves.push(mvRow('receive', orig, w, l.q, 'Received ' + (inv || sp))) }
      map[l.id] = { ...p, cost: l.c > 0 ? l.c : p.cost }
    })
    setState((s) => ({ products: s.products.map((p) => map[p.id] || p), moves: [...moves, ...s.moves].slice(0, 5000) }))
    if (cr && total > 0) setX({ pay: [{ id: uid(), date: new Date().toISOString(), supplier: sp || 'Supplier', ref: inv, amount: total, paid: 0 }, ...(x.pay || [])] })
    audit('Stock received', lines.length + ' lines ' + money(total)); setLines([]); setInv(''); setM('Stock received and costs updated')
  }
  return (
    <Sh t="Receive delivery" close={close} w={560}>
      <div className="row2"><Sel className="input" value={sp} onChange={(e) => setSp(e.target.value)}><option value="">Supplier</option>{(x.sup || []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</Sel><input className="input" placeholder="Invoice / DR no." value={inv} onChange={(e) => setInv(e.target.value)} /></div>
      <div className="sumbox inset">
        <Sel className="input" value={pid} onChange={(e) => { setPid(e.target.value); const p = st.products.find((z) => z.id === e.target.value); setC(p ? String(p.cost || '') : '') }}><option value="">Product</option>{st.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Sel>
        <div className="row2"><input className="input" type="number" inputMode="numeric" placeholder="Qty" value={q} onChange={(e) => setQ(e.target.value)} /><input className="input" type="number" inputMode="decimal" placeholder="Unit cost" value={c} onChange={(e) => setC(e.target.value)} /><input className="input" type="date" value={ex} onChange={(e) => setEx(e.target.value)} title="Expiry (optional)" /></div>
        <button className="btn" onClick={addLine}>Add line</button>
      </div>
      {lines.map((l) => <div key={l.k} className="raised prow"><div className="pinfo"><b>{l.q} x {l.name}</b><small>{money(l.c)} each{l.ex ? ' · exp ' + l.ex : ''}</small></div><b>{money(l.q * l.c)}</b><button className="btn bad sm" onClick={() => setLines(lines.filter((z) => z.k !== l.k))}>x</button></div>)}
      <R big a="Delivery total" b={money(total)} />
      <label className="lbl"><span><input type="checkbox" checked={cr} onChange={(e) => setCr(e.target.checked)} /> Not yet paid (add to supplier payables)</span></label>
      <button className="btn pri" disabled={!lines.length} onClick={go}>Receive into stock</button>
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function Payables({ close }) {
  const x = useX(); const [sp, setSp] = useState(''); const [ref, setRef] = useState(''); const [am, setAm] = useState(''); const [dr, setDr] = useState(false); const [m, setM] = useState('')
  const l = x.pay || []; const owed = (b) => r2(num(b.amount) - num(b.paid))
  const total = sum(l, owed)
  const addBill = () => { if (!(num(am) > 0)) return setM('Enter an amount'); setX({ pay: [{ id: uid(), date: new Date().toISOString(), supplier: sp.trim() || 'Supplier', ref, amount: num(am), paid: 0 }, ...l] }); setSp(''); setRef(''); setAm(''); setM('') }
  const payBill = (b) => {
    const v = r2(num(window.prompt('Payment amount (owed ' + owed(b) + ')', owed(b))))
    if (!(v > 0) || v > owed(b) + 0.001) return
    setX({ pay: l.map((z) => (z.id === b.id ? { ...z, paid: r2(num(z.paid) + v) } : z)) })
    if (dr) setState((s) => ({ cashlog: [{ id: uid(), date: new Date().toISOString(), type: 'out', amount: v, note: 'Supplier payment ' + b.supplier }, ...s.cashlog] }))
    audit('Supplier paid', b.supplier + ' ' + v)
  }
  return (
    <Sh t="Supplier payables" close={close} w={520}>
      <R big a="Total you owe suppliers" b={money(total)} />
      <div className="row2"><input className="input" placeholder="Supplier" value={sp} onChange={(e) => setSp(e.target.value)} /><input className="input" placeholder="Ref / invoice" value={ref} onChange={(e) => setRef(e.target.value)} /><input className="input" type="number" inputMode="decimal" placeholder="Amount" value={am} onChange={(e) => setAm(e.target.value)} /></div>
      <button className="btn pri" onClick={addBill}>Add bill</button>
      <label className="lbl"><span><input type="checkbox" checked={dr} onChange={(e) => setDr(e.target.checked)} /> Payments come out of the cash drawer</span></label>
      {l.filter((b) => owed(b) > 0).map((b) => <div key={b.id} className="raised prow"><div className="pinfo"><b>{b.supplier}</b><small>{b.ref} · {new Date(b.date).toLocaleDateString()} · bill {money(b.amount)}</small></div><b>{money(owed(b))}</b><button className="btn pri sm" onClick={() => payBill(b)}>Pay</button></div>)}
      {!l.some((b) => owed(b) > 0) && <small className="mut">No unpaid bills.</small>}
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function SmartReorder({ close }) {
  const st = useStore(); const [d, setD] = useState('14'); const f = fm(st)
  const ds = span(30); const sold = {}
  st.orders.filter((o) => ds.includes(dkey(o.date))).forEach((o) => o.items.forEach((i) => { sold[i.id] = (sold[i.id] || 0) + num(i.qty) }))
  const rows = st.products.filter(tracked).map((p) => { const v = (sold[p.id] || 0) / 30; const need = Math.ceil(v * num(d)) - qtyAt(p); return { p, v, need, cost: need * num(p.cost) } }).filter((r) => r.need > 0).sort((a, b) => b.cost - a.cost)
  const total = sum(rows, (r) => r.cost)
  const text = ['PURCHASE ORDER', st.settings.name, new Date().toLocaleDateString(), '', ...rows.map((r) => r.need + ' x ' + r.p.name), '', 'Estimated cost ' + f(total)].join('\n')
  return (
    <Sh t="Smart reorder" close={close} w={620}>
      <input className="input" type="number" inputMode="numeric" value={d} onChange={(e) => setD(e.target.value)} placeholder="Days of stock to cover" />
      <small className="mut">Based on the last 30 days of sales. Quantity = daily sales x days, minus what you have.</small>
      <Tbl name="smart-reorder" rows={rows} cols={[['Product', (r) => r.p.name], ['In stock', (r) => qtyAt(r.p)], ['Sold/day', (r) => r.v.toFixed(1)], ['Order', (r) => r.need], ['Cost', (r) => money(r.cost)]]} />
      <R big a="Estimated total" b={money(total)} />
      <button className="btn pri" disabled={!rows.length} onClick={() => shareText(text)}>Copy / share purchase order</button>
    </Sh>
  )
}
export function PriceEditor({ close }) {
  const st = useStore(); const [ed, setEd] = useState({}); const [q, setQ] = useState(''); const [m, setM] = useState('')
  const s0 = q.trim().toLowerCase()
  const list = st.products.filter((p) => !s0 || p.name.toLowerCase().includes(s0) || String(p.barcode || '').includes(s0)).slice(0, 60)
  const val = (p, k) => (ed[p.id] && ed[p.id][k] !== undefined ? ed[p.id][k] : p[k])
  const set = (p, k, v) => setEd({ ...ed, [p.id]: { ...(ed[p.id] || {}), [k]: v } })
  const n = Object.keys(ed).length
  const save = () => {
    setState((s) => ({ products: s.products.map((p) => { const e = ed[p.id]; return e ? { ...p, price: e.price !== undefined && e.price !== '' ? num(e.price) : p.price, cost: e.cost !== undefined && e.cost !== '' ? num(e.cost) : p.cost } : p }) }))
    audit('Quick price edit', n + ' products'); setM('Saved ' + n + ' product(s)'); setEd({})
  }
  return (
    <Sh t="Quick price editor" close={close} w={560}>
      <input className="input" placeholder="Search name or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row2 mini" style={{ flexWrap: 'nowrap' }}><span style={{ flex: 1 }}>Product</span><span style={{ width: 90 }}>Cost</span><span style={{ width: 90 }}>Price</span></div>
      {list.map((p) => <div key={p.id} className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><span style={{ flex: 1 }}>{p.name}</span><input className="input" style={{ width: 90 }} type="number" inputMode="decimal" value={val(p, 'cost') ?? ''} onChange={(e) => set(p, 'cost', e.target.value)} /><input className="input" style={{ width: 90 }} type="number" inputMode="decimal" value={val(p, 'price') ?? ''} onChange={(e) => set(p, 'price', e.target.value)} /></div>)}
      {st.products.length > 60 && <small className="mut">Showing up to 60. Use search.</small>}
      <button className="btn pri" disabled={!n} onClick={save}>Save {n} change(s)</button>
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function Catalog({ close }) {
  const st = useStore(); const x = useX(); const f = fm(st); const w = whOf(st)
  const [t, setT] = useState('clean'); const [c, setC] = useState(''); const [m, setM] = useState('')
  const noBc = st.products.filter((p) => !p.barcode), noCost = st.products.filter((p) => !(num(p.cost) > 0)), noCat = st.products.filter((p) => !p.cat), below = st.products.filter((p) => num(p.cost) > num(p.price))
  const sel = st.products.filter((p) => !c || p.cat === c)
  const names = (a) => a.slice(0, 6).map((p) => p.name).join(', ') + (a.length > 6 ? '...' : '')
  const assign = () => {
    if (!noBc.length) return setM('All products already have barcodes')
    let mx = 0; st.products.forEach((p) => { if (/^2900\d{5}$/.test(String(p.barcode || ''))) mx = Math.max(mx, Number(String(p.barcode).slice(4))) })
    const map = {}; noBc.forEach((p, i) => { map[p.id] = '2900' + String(mx + i + 1).padStart(5, '0') })
    setState((s) => ({ products: s.products.map((p) => (map[p.id] ? { ...p, barcode: map[p.id] } : p)) }))
    audit('Barcodes assigned', noBc.length + ''); setM('Assigned internal barcodes to ' + noBc.length + ' product(s)')
  }
  const pin = () => {
    const cnt = {}; st.orders.forEach((o) => o.items.forEach((i) => { cnt[i.id] = (cnt[i.id] || 0) + num(i.qty) }))
    const top = Object.keys(cnt).filter((id) => st.products.some((p) => p.id === id)).sort((a, b) => cnt[b] - cnt[a]).slice(0, 12)
    setX({ fav: [...new Set([...(x.fav || []), ...top])] }); setM('Pinned ' + top.length + ' best sellers as favorites')
  }
  const oos = st.products.filter((p) => tracked(p) && qtyAt(p, w) <= 0)
  const tags = () => printDoc('<div style="display:flex;flex-wrap:wrap;gap:3mm">' + sel.map((p) => '<div style="width:44mm;height:26mm;border:1px solid #000;padding:2mm;box-sizing:border-box"><div style="font-size:11px;height:8mm;overflow:hidden">' + esc(p.name) + '</div><div style="font-size:22px;font-weight:700">' + f(p.price) + '</div><div style="font-size:9px">' + esc(p.barcode || p.sku || '') + '</div></div>').join('') + '</div>', 'A4', 'body{font-family:sans-serif;padding:8mm}')
  const sheet = () => printDoc('<h3>Stock count sheet ' + new Date().toLocaleDateString() + '</h3><table style="width:100%;border-collapse:collapse">' + sel.filter(tracked).map((p) => '<tr><td style="border:1px solid #000;padding:4px">' + esc(p.name) + '</td><td style="border:1px solid #000;padding:4px;width:60px;text-align:right">' + qtyAt(p, w) + '</td><td style="border:1px solid #000;width:90px"></td></tr>').join('') + '</table>', 'A4', 'body{font:12px sans-serif;padding:10mm}')
  const catSel = <Sel className="input" value={c} onChange={(e) => setC(e.target.value)}><option value="">All categories</option>{cats(st).map((k) => <option key={k} value={k}>{k}</option>)}</Sel>
  return (
    <Sh t="Catalog tools" close={close} w={560}>
      <Tabs v={t} on={(k) => { setT(k); setM('') }} items={[['clean', 'Cleanup'], ['print', 'Print'], ['quick', 'Quick actions']]} />
      {t === 'clean' && (<>
        <R a={'No barcode (' + noBc.length + ')'} b="" /><small className="mut">{names(noBc)}</small>
        <R a={'No cost (' + noCost.length + ')'} b="" /><small className="mut">{names(noCost)}</small>
        <R a={'No category (' + noCat.length + ')'} b="" /><small className="mut">{names(noCat)}</small>
        <R a={'Cost above price (' + below.length + ')'} b="" /><small className="mut">{names(below)}</small>
      </>)}
      {t === 'print' && (<>{catSel}<div className="row2"><button className="btn pri" onClick={tags}>Print shelf tags ({sel.length})</button><button className="btn" onClick={sheet}>Print count sheet</button></div></>)}
      {t === 'quick' && (<>
        <button className="btn pri" onClick={assign}>Assign internal barcodes to {noBc.length} product(s)</button>
        <button className="btn" onClick={pin}>Pin top 12 best sellers as favorites</button>
        <button className="btn" disabled={!oos.length} onClick={() => shareText('Out of stock ' + new Date().toLocaleDateString() + '\n' + oos.map((p) => p.name).join('\n'))}>Copy out-of-stock list ({oos.length})</button>
      </>)}
      <small className="mut">{m}</small>
    </Sh>
  )
}
export function Deliveries({ close }) {
  const st = useStore(); const x = useX(); const [all, setAll] = useState(false); const f = fm(st)
  const dv = x.deliv || {}
  const rows = st.orders.filter((o) => o.otype === 'Delivery' && (all || !dv[o.id])).slice(0, 100)
  const slip = (o) => printDoc('<div class="c b" style="font-size:15px">' + esc(st.settings.name) + '</div><div class="c b">DELIVERY SLIP</div><div class="c">' + esc(ono(o.no)) + ' · ' + new Date(o.date).toLocaleDateString() + '</div><hr><div>To: ' + esc(o.customerName || 'Customer') + '</div><div>Address: ' + esc(o.table || '') + '</div><hr>' + o.items.map((i) => '<div class="r"><span>' + i.qty + ' x ' + esc(i.name) + '</span><span>' + f(i.qty * i.price - (i.bulk || 0)) + '</span></div>').join('') + '<hr><div class="r b"><span>TOTAL</span><span>' + f(o.total) + '</span></div><div class="r"><span>Paid</span><span>' + f(o.paid ?? o.total) + '</span></div><div class="r b"><span>Collect on delivery</span><span>' + f(o.balance || 0) + '</span></div><hr><div>Received by: ______________</div><div>Date: ______________</div>', '80mm auto', SLIP)
  return (
    <Sh t="Deliveries" close={close} w={560}>
      <label className="lbl"><span><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show delivered too</span></label>
      {rows.length === 0 && <small className="mut">No pending deliveries. Choose Delivery on the register and put the address in the reference box.</small>}
      {rows.map((o) => <div key={o.id} className="raised prow"><label className="pinfo" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!dv[o.id]} onChange={() => setX({ deliv: { ...dv, [o.id]: !dv[o.id] } })} /><span><b>{ono(o.no)} {o.customerName || ''}</b><br /><small>{o.table || 'no address'} · {money(o.total)}{o.balance > 0 ? ' · collect ' + money(o.balance) : ''}</small></span></label><button className="btn sm" onClick={() => slip(o)}>Slip</button></div>)}
    </Sh>
  )
}
export function Returns({ close }) {
  const st = useStore(); const x = useX(); const w = whOf(st)
  const [t, setT] = useState('new'); const [no, setNo] = useState(''); const [q, setQ] = useState({}); const [cash, setCash] = useState(true); const [m, setM] = useState('')
  const k = parseInt(no.replace(/\D/g, ''), 10)
  const o = k ? st.orders.find((z) => Number(z.no) === k) : null
  const log = x.returns || []
  const done = (name) => log.filter((r) => r.no === k && r.name === name).reduce((a, r) => a + r.qty, 0)
  const go = () => {
    if (!o) return
    const sel = o.items.map((i, j) => ({ i, n: Math.min(Math.floor(num(q[j])), i.qty - done(i.name)) })).filter((z) => z.n > 0)
    if (!sel.length) return setM('Enter a quantity to return')
    const moves = [], map = {}
    sel.forEach(({ i, n }) => { const p = map[i.id] || st.products.find((z) => z.id === i.id); if (p && tracked(p)) { map[i.id] = put(p, o.whId || w, n, '', ''); moves.push(mvRow('return', p, o.whId || w, n, 'Return ' + ono(o.no))) } })
    const amt = sum(sel, ({ i, n }) => n * i.price), cost = sum(sel, ({ i, n }) => n * num(i.cost)); const when = new Date().toISOString()
    setState((s) => ({ products: s.products.map((p) => map[p.id] || p), moves: [...moves, ...s.moves].slice(0, 5000), cashlog: cash ? [{ id: uid(), date: when, type: 'out', amount: amt, note: 'Refund ' + ono(o.no) }, ...s.cashlog] : s.cashlog }))
    setX({ returns: [...sel.map(({ i, n }) => ({ id: uid(), date: when, no: k, name: i.name, qty: n, amount: r2(n * i.price), cost: r2(n * num(i.cost)), by: curUser().name })), ...log].slice(0, 2000) })
    audit('Return', ono(o.no) + ' ' + money(amt)); setM('Returned ' + money(amt) + (cash ? ' and paid out from the drawer' : '')); setQ({})
  }
  return (
    <Sh t="Return items" close={close} w={500}>
      <Tabs v={t} on={setT} items={[['new', 'New return'], ['log', 'Returns log']]} />
      {t === 'new' && (<>
        <input className="input" autoFocus placeholder="Order number" value={no} onChange={(e) => setNo(e.target.value)} />
        {no && !o && <small className="mut">Order not found on this device</small>}
        {o && o.items.map((i, j) => <div key={j} className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><span style={{ flex: 1 }}>{i.name}<small className="mut"> · sold {i.qty}, returned {done(i.name)}</small></span><input className="input" style={{ width: 80 }} type="number" inputMode="numeric" placeholder="0" value={q[j] || ''} onChange={(e) => setQ({ ...q, [j]: e.target.value })} /></div>)}
        {o && <label className="lbl"><span><input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} /> Refund cash from the drawer</span></label>}
        {o && <button className="btn pri" onClick={go}>Restock and refund</button>}
        <small className="mut">The original order stays as it was. Returns are logged and counted in the Business report.</small>
        <small className="mut">{m}</small>
      </>)}
      {t === 'log' && <Tbl name="returns" rows={log} cols={[['Date', (r) => new Date(r.date).toLocaleDateString()], ['Order', (r) => ono(r.no)], ['Item', (r) => r.name], ['Qty', (r) => r.qty], ['Amount', (r) => money(r.amount)], ['By', (r) => r.by]]} />}
    </Sh>
  )
}
export function Report({ close }) {
  const st = useStore(); const x = useX(); const [t, setT] = useState('sum'); const [r, setR] = useState('1')
  const ds = span(Number(r)); const inD = (d) => ds.includes(dkey(d))
  const os = st.orders.filter((o) => inD(o.date))
  const sales = sum(os, (o) => o.total), tax = sum(os, (o) => o.tax), cogs = sum(os, (o) => o.cogs)
  const gross = r2(sales - tax - cogs)
  const py = st.orders.flatMap((o) => pays(o).map((p) => ({ ...p, d: p.date || o.date }))).filter((p) => inD(p.d))
  const cashIn = sum(py.filter((p) => p.method === 'cash'), (p) => p.amount)
  const otherIn = sum(py.filter((p) => p.method !== 'cash' && p.method !== 'deposit'), (p) => p.amount)
  const collected = sum(py.filter((p) => p.note === 'Balance payment'), (p) => p.amount)
  const given = sum(os, (o) => o.balance)
  const ex = (st.expenses || []).filter((e) => inD(e.date)); const exAmt = sum(ex, (e) => e.amount)
  const feeAmt = sum((x.svc || []).filter((s) => inD(s.date)), (s) => s.fee)
  const rets = (x.returns || []).filter((z) => inD(z.date)); const retLoss = r2(sum(rets, (z) => z.amount) - sum(rets, (z) => z.cost))
  const net = r2(gross - exAmt + feeAmt - retLoss)
  let body = null
  if (t === 'sum') body = (<div className="sumbox inset"><R a="Orders" b={os.length} /><R a="Sales" b={money(sales)} /><R a="Cost of goods" b={money(cogs)} /><R a="Gross profit (without tax)" b={money(gross)} /><R a="Expenses" b={money(exAmt)} /><R a="Service fees earned" b={money(feeAmt)} /><R a="Returns (lost margin)" b={money(retLoss)} /><R big a="Net kita" b={money(net)} /><R a="Cash received" b={money(cashIn)} /><R a="Other methods received" b={money(otherIn)} /><R a="Credit (utang) still unpaid" b={money(given)} /><R a="Utang collected" b={money(collected)} /></div>)
  else if (t === 'type') { const m = {}; os.forEach((o) => { const a = m[typeOf(o)] || (m[typeOf(o)] = { n: 0, s: 0 }); a.n++; a.s += num(o.total) }); body = <Tbl name="sales-by-type" rows={Object.entries(m)} cols={[['Type', (z) => z[0]], ['Orders', (z) => z[1].n], ['Sales', (z) => money(z[1].s)]]} /> }
  else if (t === 'exp') { const m = {}; ex.forEach((e) => { const k = e.cat || e.category || e.name || e.note || 'Other'; m[k] = r2((m[k] || 0) + num(e.amount)) }); body = <><R big a="Total expenses" b={money(exAmt)} /><Tbl name="expense-breakdown" rows={Object.entries(m).sort((a, b) => b[1] - a[1])} cols={[['Expense', (z) => z[0]], ['Amount', (z) => money(z[1])]]} /></> }
  else if (t === 'disc') { const rows = os.filter((o) => o.disc > 0).map((o) => ({ o, pc: num(o.sub) > 0 ? Math.round((o.disc / o.sub) * 100) : 0 })).sort((a, b) => b.pc - a.pc); body = <Tbl name="discount-audit" rows={rows} cols={[['Order', (z) => ono(z.o.no)], ['Cashier', (z) => z.o.by || ''], ['Sub total', (z) => money(z.o.sub)], ['Discount', (z) => money(z.o.disc)], ['%', (z) => z.pc + '%']]} /> }
  else if (t === 'month') {
    const mo = {}; const g = (k) => mo[k] || (mo[k] = { s: 0, t: 0, c: 0, e: 0 })
    st.orders.forEach((o) => { const a = g(dkey(o.date).slice(0, 7)); a.s += num(o.total); a.t += num(o.tax); a.c += num(o.cogs) })
    Object.entries(getRollup()).forEach(([k, v]) => { const a = g(k.slice(0, 7)); a.s += v.s; a.t += v.t; a.c += v.c })
    ;(st.expenses || []).forEach((e) => { g(dkey(e.date).slice(0, 7)).e += num(e.amount) })
    const rows = Object.entries(mo).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12).map(([k, a]) => ({ k, ...a, p: r2(a.s - a.t - a.c - a.e) }))
    body = <><Tbl name="monthly-profit" rows={rows} cols={[['Month', (z) => z.k], ['Sales', (z) => money(z.s)], ['Cost', (z) => money(z.c)], ['Expenses', (z) => money(z.e)], ['Profit', (z) => money(z.p)]]} /><small className="mut">Archived months include sales and cost from the rollup. Their expenses were removed with the archive.</small></>
  } else body = <button className="btn pri" onClick={() => dl('sales-items-' + dkey(new Date()) + '.csv', csv([['Order', 'Date', 'Item', 'Qty', 'Price', 'Cost', 'Customer', 'Type', 'Cashier'], ...os.flatMap((o) => o.items.map((i) => [ono(o.no), o.date, i.name, i.qty, i.price, i.cost || 0, o.customerName || '', typeOf(o), o.by || '']))]))}>Download item-level sales CSV ({os.length} orders)</button>
  return (
    <Sh t="Business report" close={close} w={700}>
      <Tabs v={t} on={setT} items={[['sum', 'Net kita'], ['type', 'By type'], ['exp', 'Expenses'], ['disc', 'Discounts'], ['month', 'Months'], ['csv', 'CSV']]} />
      {t !== 'month' && <Sel className="input" value={r} onChange={(e) => setR(e.target.value)}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></Sel>}
      {body}
    </Sh>
  )
}
export function Commission({ close }) {
  const st = useStore(); const x = useX(); const [r, setR] = useState('30')
  const ds = span(Number(r)); const cm = x.cmap || {}; const def = num(x.crate)
  const os = st.orders.filter((o) => ds.includes(dkey(o.date)))
  const names = [...new Set([...os.map((o) => o.by || 'Admin'), ...Object.keys(cm)])]
  const rows = names.map((n) => { const s = sum(os.filter((o) => (o.by || 'Admin') === n), (o) => num(o.total) - num(o.tax)); const rate = cm[n] !== undefined && cm[n] !== '' ? num(cm[n]) : def; return { n, s, rate, c: r2((s * rate) / 100) } })
  return (
    <Sh t="Staff commission" close={close} w={520}>
      <Sel className="input" value={r} onChange={(e) => setR(e.target.value)}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></Sel>
      <label className="lbl">Default commission % of sales (without tax)<input className="input" type="number" inputMode="decimal" value={x.crate || ''} onChange={(e) => setX({ crate: e.target.value })} /></label>
      {names.map((n) => <div key={n} className="row2" style={{ alignItems: 'center', flexWrap: 'nowrap' }}><span style={{ flex: 1 }}>{n}</span><input className="input" style={{ width: 110 }} type="number" inputMode="decimal" placeholder={'Default ' + def} value={cm[n] ?? ''} onChange={(e) => setX({ cmap: { ...cm, [n]: e.target.value } })} /></div>)}
      <Tbl name="commission" rows={rows} cols={[['Cashier', (z) => z.n], ['Sales', (z) => money(z.s)], ['Rate', (z) => z.rate + '%'], ['Commission', (z) => money(z.c)]]} />
    </Sh>
  )
}
const STYPES = ['Load', 'GCash cash-in', 'GCash cash-out', 'Bills payment', 'Other']
export function Services({ close }) {
  const x = useX(); const [ty, setTy] = useState('Load'); const [am, setAm] = useState(''); const [fee, setFee] = useState(''); const [nt, setNt] = useState('')
  const l = x.svc || []; const d0 = dkey(new Date()); const w = span(7)
  const add = () => { if (!(num(am) > 0)) return; setX({ svc: [{ id: uid(), date: new Date().toISOString(), type: ty, amount: num(am), fee: num(fee), note: nt, by: curUser().name }, ...l].slice(0, 2000) }); setAm(''); setFee(''); setNt('') }
  const td = l.filter((s) => dkey(s.date) === d0)
  return (
    <Sh t="Services (load, e-wallet, bills)" close={close} w={500}>
      <div className="sumbox inset"><R a="Handled today" b={money(sum(td, (s) => s.amount))} /><R a="Fees earned today" b={money(sum(td, (s) => s.fee))} /><R big a="Fees last 7 days" b={money(sum(l.filter((s) => w.includes(dkey(s.date))), (s) => s.fee))} /></div>
      <Sel className="input" value={ty} onChange={(e) => setTy(e.target.value)}>{STYPES.map((k) => <option key={k} value={k}>{k}</option>)}</Sel>
      <div className="row2"><input className="input" type="number" inputMode="decimal" placeholder="Amount" value={am} onChange={(e) => setAm(e.target.value)} /><input className="input" type="number" inputMode="decimal" placeholder="Your fee" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
      <input className="input" placeholder="Note (number, name)" value={nt} onChange={(e) => setNt(e.target.value)} />
      <button className="btn pri" onClick={add}>Record</button>
      {l.slice(0, 12).map((s) => <div key={s.id} className="raised prow"><div className="pinfo"><b>{s.type} · {money(s.amount)}</b><small>{new Date(s.date).toLocaleString()} · fee {money(s.fee)} {s.note}</small></div><button className="btn bad sm" onClick={() => setX({ svc: l.filter((z) => z.id !== s.id) })}>x</button></div>)}
      <small className="mut">Handle the actual cash with Cash in / out. Fees count in the Business report.</small>
    </Sh>
  )
}
export function CustNotes({ close }) {
  const st = useStore(); const x = useX(); const [id, setId] = useState(''); const [v, setV] = useState('')
  const c = st.customers.find((z) => z.id === id)
  const os = id ? st.orders.filter((o) => o.customerId === id) : []
  const it = {}; os.forEach((o) => o.items.forEach((i) => { it[i.name] = (it[i.name] || 0) + num(i.qty) }))
  const top = Object.entries(it).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const lim = num((x.climit || {})[id])
  return (
    <Sh t="Customer notes" close={close} w={460}>
      <Sel className="input" value={id} onChange={(e) => { setId(e.target.value); setV((x.cnote || {})[e.target.value] || '') }}><option value="">Select customer</option>{st.customers.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</Sel>
      {c && (<>
        <div className="sumbox inset"><R a="Orders" b={os.length} /><R a="Spent" b={money(sum(os, (o) => o.total))} /><R a="Owes" b={money(sum(os, (o) => o.balance || 0))} /><R a="Credit limit" b={lim > 0 ? money(lim) : 'none'} /><R a="Last visit" b={os.length ? new Date(Math.max(...os.map((o) => +new Date(o.date)))).toLocaleDateString() : 'never'} /></div>
        <div className="tsec">Usually buys</div>
        {top.map(([k, n]) => <R key={k} a={k} b={n + ' pcs'} />)}
        <textarea className="input" style={{ height: 90, padding: 8 }} placeholder="Notes (preferences, delivery directions, reminders)" value={v} onChange={(e) => setV(e.target.value)} />
        <button className="btn pri" onClick={() => setX({ cnote: { ...(x.cnote || {}), [id]: v } })}>Save note</button>
      </>)}
    </Sh>
  )
}
export function ProdHistory({ close }) {
  const st = useStore(); const [id, setId] = useState('')
  const p = st.products.find((z) => z.id === id)
  const t0 = new Date(); t0.setHours(23, 59, 59, 999)
  const wk = Array.from({ length: 8 }, () => ({ u: 0, r: 0, g: 0 }))
  let last = ''
  if (p) st.orders.forEach((o) => o.items.forEach((i) => { if (i.id !== id) return; if (o.date > last) last = o.date; const w = Math.floor((t0 - new Date(o.date)) / (7 * 864e5)); if (w >= 0 && w < 8) { const a = wk[w]; a.u += num(i.qty); a.r += num(i.qty) * num(i.price) - num(i.bulk); a.g += num(i.qty) * (num(i.price) - num(i.cost)) - num(i.bulk) } }))
  const u30 = wk.slice(0, 4).reduce((a, z) => a + z.u, 0) / 28
  const rows = wk.map((z, i) => ({ w: i === 0 ? 'This week' : i + ' week(s) ago', ...z })).reverse()
  return (
    <Sh t="Product sales history" close={close} w={560}>
      <Sel className="input" value={id} onChange={(e) => setId(e.target.value)}><option value="">Select product</option>{st.products.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</Sel>
      {p && (<>
        <Bars vals={rows.map((z) => z.u)} tip={rows.map((z) => z.w + ': ' + z.u)} />
        <Tbl name="product-weekly" rows={rows} cols={[['Week', (z) => z.w], ['Units', (z) => z.u], ['Revenue', (z) => money(z.r)], ['Profit', (z) => money(z.g)]]} />
        <div className="sumbox inset"><R a="In stock" b={tracked(p) ? qtyAt(p) : 'not tracked'} /><R a="Sold per day (4 weeks)" b={u30.toFixed(1)} /><R a="Days of cover" b={tracked(p) && u30 > 0 ? Math.round(qtyAt(p) / u30) : 'n/a'} /><R a="Last sold" b={last ? new Date(last).toLocaleDateString() : 'never'} /></div>
      </>)}
    </Sh>
  )
}
