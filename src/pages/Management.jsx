import { useState, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore, setState, getState } from '../store.js'
import { clearCart, fmt } from '../cart.js'
let unlocked = false
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const readImg = (file, max, type) => new Promise((res) => {
  const fr = new FileReader()
  fr.onerror = () => res('')
  fr.onload = () => {
    const im = new Image()
    im.onerror = () => res('')
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height))
      const c = document.createElement('canvas')
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k)
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
      res(c.toDataURL(type, 0.8))
    }
    im.src = fr.result
  }
  fr.readAsDataURL(file)
})
const save = (name, text, mime) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: mime }))
  a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
const csv = (rows) => rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n')
const stamp = () => new Date().toISOString().slice(0, 10)
function Lock({ onOk }) {
  const { settings } = useStore()
  const [v, setV] = useState('')
  const [bad, setBad] = useState(false)
  const go = () => {
    if (v === String(settings.pin)) { unlocked = true; onOk() }
    else { setBad(true); setV(''); setTimeout(() => setBad(false), 500) }
  }
  return (
    <motion.div className="raised lockbox" animate={bad ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
      <div className="check" style={{ background: 'var(--ac)' }}>🔒</div>
      <h2 style={{ margin: 0 }}>Management PIN</h2>
      <input className="input" type="password" inputMode="numeric" autoFocus placeholder="Enter PIN" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
      {bad && <small style={{ color: 'var(--bad)' }}>Wrong PIN</small>}
      <button className="btn pri" onClick={go}>Unlock</button>
    </motion.div>
  )
}
function Products() {
  const { products, settings } = useStore()
  const empty = { id: '', name: '', price: '', barcode: '', image: '', stock: '' }
  const [f, setF] = useState(empty)
  const [msg, setMsg] = useState('')
  const cur = settings.currency
  const submit = () => {
    const name = f.name.trim(); const price = parseFloat(f.price); const barcode = f.barcode.trim()
    if (!name || !(price >= 0)) return setMsg('Name and a valid price are required')
    if (barcode && products.some((p) => p.barcode === barcode && p.id !== f.id)) return setMsg('Barcode already used by another product')
    const row = { id: f.id || uid(), name, price, barcode, image: f.image, stock: f.stock === '' ? '' : Math.max(0, parseInt(f.stock, 10) || 0) }
    setState((s) => ({ products: f.id ? s.products.map((p) => (p.id === f.id ? row : p)) : [row, ...s.products] }))
    setF(empty); setMsg('')
  }
  const del = (p) => { if (window.confirm('Delete ' + p.name + '?')) setState((s) => ({ products: s.products.filter((x) => x.id !== p.id) })) }
  const pick = async (e) => { const file = e.target.files[0]; if (!file) return; const d = await readImg(file, 400, 'image/jpeg'); if (d) setF((x) => ({ ...x, image: d })); e.target.value = '' }
  return (
    <div className="grid">
      <div className="raised mpanel">
        <h3 style={{ margin: 0 }}>{f.id ? 'Edit Product' : 'Add Product'}</h3>
        <input className="input" placeholder="Product name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="row2">
          <input className="input" type="number" inputMode="decimal" min="0" placeholder={'Price (' + cur + ')'} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <input className="input" placeholder="Barcode (optional)" value={f.barcode} onChange={(e) => setF({ ...f, barcode: e.target.value })} />
          <input className="input" type="number" inputMode="numeric" min="0" placeholder="Stock (blank = untracked)" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
        </div>
        <div className="row2" style={{ alignItems: 'center' }}>
          <label className="btn" style={{ textAlign: 'center' }}>Upload image<input type="file" accept="image/*" hidden onChange={pick} /></label>
          {f.image && <img className="thumb" src={f.image} alt="" />}
          {f.image && <button className="btn bad" onClick={() => setF({ ...f, image: '' })}>Remove</button>}
        </div>
        {msg && <small style={{ color: 'var(--bad)' }}>{msg}</small>}
        <div className="row2">
          {f.id && <button className="btn" onClick={() => { setF(empty); setMsg('') }}>Cancel</button>}
          <button className="btn pri" onClick={submit}>{f.id ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </div>
      {products.length === 0 && <p className="mut">No products yet</p>}
      <AnimatePresence initial={false}>
        {products.map((p) => (
          <motion.div layout key={p.id} className="raised prow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="pimg inset sm">{p.image ? <img src={p.image} alt="" /> : <span>{p.name.slice(0, 1).toUpperCase()}</span>}</div>
            <div className="pinfo"><b>{p.name}</b><small>{fmt(p.price, cur)}{p.barcode ? ' · ' + p.barcode : ''}{p.stock != null && p.stock !== '' ? ' · stock ' + p.stock : ''}</small></div>
            <button className="btn" onClick={() => { setF({ id: p.id, name: p.name, price: String(p.price), barcode: p.barcode || '', image: p.image || '', stock: p.stock == null ? '' : String(p.stock) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button>
            <button className="btn bad" onClick={() => del(p)}>Delete</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
function Settings() {
  const { settings } = useStore()
  const [d, setD] = useState({ address: '', phone: '', footer: '', ...settings, tax: String(settings.tax) })
  const [msg, setMsg] = useState('')
  const set = (k, v) => { setD((x) => ({ ...x, [k]: v })); setMsg('') }
  const logo = async (e) => { const file = e.target.files[0]; if (!file) return; const r = await readImg(file, 200, 'image/png'); if (r) set('logo', r); e.target.value = '' }
  const submit = () => {
    const tax = parseFloat(d.tax)
    if (!d.name.trim()) return setMsg('Display name is required')
    if (!(tax >= 0 && tax <= 100)) return setMsg('Tax must be between 0 and 100')
    if (String(d.pin).length < 4) return setMsg('PIN must be at least 4 characters')
    if (!d.currency.trim()) return setMsg('Currency symbol is required')
    setState((s) => ({ settings: { ...s.settings, ...d, name: d.name.trim(), currency: d.currency.trim(), tax, pin: String(d.pin) } }))
    setMsg('Saved')
  }
  return (
    <div className="raised mpanel">
      <label className="lbl">Display name (top right)<input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} /></label>
      <div className="row2" style={{ alignItems: 'center' }}>
        <label className="btn" style={{ textAlign: 'center' }}>Upload logo<input type="file" accept="image/*" hidden onChange={logo} /></label>
        {d.logo && <img className="thumb" src={d.logo} alt="" />}
        {d.logo && <button className="btn bad" onClick={() => set('logo', '')}>Remove</button>}
      </div>
      <div className="row2">
        <label className="lbl">Currency<input className="input" value={d.currency} onChange={(e) => set('currency', e.target.value)} /></label>
        <label className="lbl">Tax %<input className="input" type="number" inputMode="decimal" value={d.tax} onChange={(e) => set('tax', e.target.value)} /></label>
      </div>
      <label className="lbl">Management PIN<input className="input" type="password" inputMode="numeric" value={d.pin} onChange={(e) => set('pin', e.target.value)} /></label>
      <label className="lbl">Store address (on receipt)<input className="input" value={d.address} onChange={(e) => set('address', e.target.value)} /></label>
      <label className="lbl">Phone (on receipt)<input className="input" value={d.phone} onChange={(e) => set('phone', e.target.value)} /></label>
      <label className="lbl">Receipt footer<input className="input" placeholder="Thank you! Come again." value={d.footer} onChange={(e) => set('footer', e.target.value)} /></label>
      {msg && <small style={{ color: msg === 'Saved' ? 'var(--ok)' : 'var(--bad)' }}>{msg}</small>}
      <button className="btn pri" onClick={submit}>Save Settings</button>
    </div>
  )
}
function Data() {
  const { orders, products } = useStore()
  const fr = useRef(null)
  const [msg, setMsg] = useState('')
  const backup = () => { const s = getState(); save('pos-backup-' + stamp() + '.json', JSON.stringify({ app: 'pos', version: 1, settings: s.settings, products: s.products, orders: s.orders }, null, 2), 'application/json') }
  const restore = (e) => {
    const file = e.target.files[0]; e.target.value = ''
    if (!file) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const j = JSON.parse(r.result)
        if (!j || !Array.isArray(j.products) || !Array.isArray(j.orders) || typeof j.settings !== 'object') throw new Error('bad')
        if (!window.confirm('Replace ALL current data with this backup?')) return
        setState((s) => ({ products: j.products, orders: j.orders, settings: { ...s.settings, ...j.settings } }))
        setMsg('Backup restored')
      } catch (err) { setMsg('Invalid backup file') }
    }
    r.readAsText(file)
  }
  const expOrders = () => save('orders-' + stamp() + '.csv', csv([['Order', 'Date', 'Items', 'Sub Total', 'Discount', 'Tax', 'Total', 'Method', 'Received', 'Change', 'Note'], ...orders.map((o) => [o.no, o.date, o.items.map((i) => i.qty + 'x ' + i.name).join('; '), o.sub, o.disc, o.tax, o.total, o.method, o.received, o.change, o.note])]), 'text/csv')
  const expProducts = () => save('products-' + stamp() + '.csv', csv([['Name', 'Price', 'Barcode'], ...products.map((p) => [p.name, p.price, p.barcode])]), 'text/csv')
  const clearOrders = () => { if (window.confirm('Delete ALL orders? This cannot be undone.')) { setState(() => ({ orders: [] })); setMsg('Orders cleared') } }
  const resetAll = () => {
    if (!window.confirm('Reset EVERYTHING (products, orders, settings)?')) return
    if (!window.confirm('Last warning: this erases all data on this device.')) return
    clearCart(); try { localStorage.removeItem('pos_db'); localStorage.removeItem('pos_cart') } catch (e) {}
    unlocked = false; location.reload()
  }
  return (
    <div className="raised mpanel">
      <h3 style={{ margin: 0 }}>Backup</h3>
      <button className="btn" onClick={backup}>Download full backup (JSON)</button>
      <button className="btn" onClick={() => fr.current.click()}>Restore backup</button>
      <input ref={fr} type="file" accept="application/json,.json" hidden onChange={restore} />
      <h3 style={{ margin: '8px 0 0' }}>Export</h3>
      <button className="btn" onClick={expOrders}>Export orders (CSV)</button>
      <button className="btn" onClick={expProducts}>Export products (CSV)</button>
      <h3 style={{ margin: '8px 0 0' }}>Danger zone</h3>
      <button className="btn bad" onClick={clearOrders}>Clear all orders</button>
      <button className="btn bad" onClick={resetAll}>Reset everything</button>
      {msg && <small className="mut">{msg}</small>}
    </div>
  )
}
function Sales() {
  const { orders, settings } = useStore()
  const cur = settings.currency
  const days = useMemo(() => {
    const m = {}
    orders.forEach((o) => { const k = new Date(o.date).toLocaleDateString('en-CA'); m[k] = (m[k] || 0) + o.total })
    const out = []
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.toLocaleDateString('en-CA'); out.push({ k, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), v: m[k] || 0 }) }
    return out
  }, [orders])
  const max = Math.max(1, ...days.map((d) => d.v))
  const W = 320, H = 150, L = 8, R = 8, T = 12, B = 14
  const pts = days.map((d, i) => [L + (i * (W - L - R)) / (days.length - 1), T + (H - T - B) * (1 - d.v / max)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - B) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - B) + ' Z'
  const today = days[days.length - 1].v
  const week = days.slice(-7).reduce((a, d) => a + d.v, 0)
  const all = orders.reduce((a, o) => a + o.total, 0)
  return (
    <div className="grid">
      <div className="ostats3">
        <div className="raised stat"><small>Today</small><b>{fmt(today, cur)}</b></div>
        <div className="raised stat"><small>7 days</small><b>{fmt(week, cur)}</b></div>
        <div className="raised stat"><small>All time</small><b>{fmt(all, cur)}</b></div>
      </div>
      <div className="raised mpanel">
        <h3 style={{ margin: 0 }}>Sales revenue, last 14 days</h3>
        <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ overflow: 'visible' }}>
          <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4f46e5" stopOpacity=".25" /><stop offset="1" stopColor="#4f46e5" stopOpacity="0" /></linearGradient></defs>
          {[0, 0.5, 1].map((g) => <line key={g} x1={L} x2={W - R} y1={T + (H - T - B) * g} y2={T + (H - T - B) * g} stroke="#d0d7e3" strokeDasharray="3 4" />)}
          <motion.path d={area} fill="url(#ga)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.6 }} />
          <motion.path d={line} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1 }} />
          {pts.map((p, i) => <motion.circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke="#4f46e5" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.04 }} />)}
          <text x={L} y={H} fontSize="9" fill="#6b7280">{days[0].label}</text>
          <text x={W - R} y={H} fontSize="9" fill="#6b7280" textAnchor="end">{days[days.length - 1].label}</text>
          <text x={W - R} y={T - 3} fontSize="9" fill="#6b7280" textAnchor="end">peak {fmt(max, cur)}</text>
        </svg>
      </div>
    </div>
  )
}
const TABS = [['products', 'Products'], ['settings', 'Settings'], ['data', 'Data'], ['sales', 'Sales']]
export default function Management() {
  const [ok, setOk] = useState(unlocked)
  const [tab, setTab] = useState('products')
  if (!ok) return <Lock onOk={() => setOk(true)} />
  return (
    <div>
      <div className="seg tabs">
        {TABS.map(([k, l]) => <button key={k} className={'btn' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}
        <button className="btn" onClick={() => { unlocked = false; setOk(false) }}>Lock</button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {tab === 'products' && <Products />}
          {tab === 'settings' && <Settings />}
          {tab === 'data' && <Data />}
          {tab === 'sales' && <Sales />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
