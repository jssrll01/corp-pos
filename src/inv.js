import { getState, setState } from './store.js'
export const MAIN = 'main'
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export const num = (v) => parseFloat(v) || 0
export const r2 = (n) => Math.round((+n || 0) * 100) / 100
export const dkey = (d) => new Date(d).toLocaleDateString('en-CA')
export const money = (n) => (getState().settings.currency || '') + r2(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const tracked = (p) => p.stock != null && p.stock !== ''
export const lotsOf = (p) => p.lots || (tracked(p) ? [{ id: 'L0', wh: MAIN, no: '', exp: '', qty: +p.stock || 0 }] : [])
export const qtyAt = (p, wh) => (tracked(p) ? lotsOf(p).filter((l) => !wh || l.wh === wh).reduce((a, l) => a + l.qty, 0) : Infinity)
export const reserved = (st, pid, wh) => st.reservations.filter((r) => r.status === 'open' && (!wh || r.whId === wh)).reduce((a, r) => a + r.items.filter((i) => i.id === pid).reduce((b, i) => b + i.qty, 0), 0)
export const isLow = (p, st) => tracked(p) && qtyAt(p) <= (num(p.reorder) > 0 ? num(p.reorder) : num(st.settings.lowStock))
const ex = (l) => l.exp || '9999'
export const withLots = (p, lots) => { const L = lots.filter((l) => l.qty > 0); return { ...p, lots: L, stock: L.reduce((a, l) => a + l.qty, 0) } }
export const take = (p, qty, wh) => {
  let need = qty
  const used = []
  const lots = lotsOf(p).map((l) => ({ ...l }))
  lots.filter((l) => l.wh === wh).sort((a, b) => (ex(a) < ex(b) ? -1 : ex(a) > ex(b) ? 1 : 0)).forEach((l) => {
    const t = Math.min(l.qty, need)
    if (t > 0) { l.qty -= t; need -= t; used.push({ no: l.no, exp: l.exp, qty: t }) }
  })
  return { p: withLots(p, lots), used, short: need }
}
export const put = (p, wh, qty, no = '', exp = '') => {
  const lots = lotsOf(p).map((l) => ({ ...l }))
  const h = lots.find((l) => l.wh === wh && l.no === no && l.exp === exp)
  if (h) h.qty += qty
  else lots.push({ id: uid(), wh, no, exp, qty })
  return withLots(p, lots)
}
export const curUser = () => {
  let id = ''
  try { id = localStorage.getItem('pos_user') || '' } catch (e) {}
  return getState().employees.find((e) => e.id === id) || { id: '', name: 'Admin' }
}
export const mvRow = (type, p, wh, qty, note = '', x = {}) => ({ id: uid(), date: new Date().toISOString(), type, pid: p.id, name: p.name, sku: p.sku || '', wh, qty, cost: num(p.cost), note, user: curUser().name, ...x })
export const logMoves = (rows) => setState((s) => ({ moves: [...rows, ...s.moves].slice(0, 5000) }))
export const audit = (action, detail = '') => setState((s) => ({ audit: [{ id: uid(), date: new Date().toISOString(), user: curUser().name, action, detail: String(detail) }, ...s.audit].slice(0, 3000) }))
export const priceFor = (p, lv) => (lv && lv !== 'retail' && p.prices && num(p.prices[lv]) > 0 ? num(p.prices[lv]) : num(p.price))
export const calcSale = (c, st, cust) => {
  const S = st.settings
  const L = S.loyalty || {}
  const lines = c.items.map((i) => { const p = st.products.find((x) => x.id === i.id) || {}; return { ...i, gross: r2(i.price * i.qty), bulk: 0, taxable: p.taxable !== false } })
  const sub = r2(lines.reduce((a, l) => a + l.gross, 0))
  const rules = st.discounts.filter((d) => d.on !== false && (!d.level || d.level === 'any' || d.level === c.level))
  const applied = []
  rules.filter((d) => d.kind === 'bulk').forEach((d) => lines.forEach((l) => {
    if ((d.pid && d.pid !== l.id) || l.qty < Math.max(1, num(d.min))) return
    const a = Math.min(d.mode === '%' ? (l.gross * num(d.value)) / 100 : num(d.value) * l.qty, l.gross - l.bulk)
    l.bulk = r2(l.bulk + a)
    applied.push({ name: d.name, amt: r2(a) })
  }))
  const afterBulk = r2(sub - lines.reduce((a, l) => a + l.bulk, 0))
  let order = 0
  rules.filter((d) => d.kind !== 'bulk').forEach((d) => {
    if (afterBulk >= num(d.min)) { const a = d.mode === '%' ? (afterBulk * num(d.value)) / 100 : num(d.value); order += a; applied.push({ name: d.name, amt: r2(a) }) }
  })
  order = r2(Math.min(order, afterBulk))
  const left = afterBulk - order
  const dv = num(c.dval)
  const manual = r2(Math.min(c.dtype === '%' ? (left * Math.min(dv, 100)) / 100 : dv, left))
  const pre = r2(left - manual)
  const pts = L.on && cust ? Math.max(0, Math.min(Math.floor(num(c.redeem)), Math.floor(cust.points || 0), Math.floor(pre / (num(L.value) || 1)))) : 0
  const redeem = r2(pts * num(L.value))
  const net = r2(pre - redeem)
  const f = afterBulk > 0 ? net / afterBulk : 0
  const tn = lines.filter((l) => l.taxable).reduce((a, l) => a + (l.gross - l.bulk) * f, 0)
  const rate = num(S.tax)
  const tax = r2(S.taxIncl ? (tn * rate) / (100 + rate) : (tn * rate) / 100)
  const total = r2(S.taxIncl ? net : net + tax)
  const rec = num(c.received)
  const dep = r2(Math.min(num(c.dep), total))
  const due = r2(total - dep)
  const full = c.method === 'cash' ? rec >= due : c.received === '' || rec >= due
  const paidNow = full ? due : Math.min(rec, due)
  const change = c.method === 'cash' && rec > due ? r2(rec - due) : 0
  const balance = r2(due - paidNow)
  return { lines, sub, bulk: r2(sub - afterBulk), order, manual, redeem, pts, applied, disc: r2(sub - net), net, tax, total, dep, due, rec, full, paidNow, change, balance, count: lines.reduce((a, l) => a + l.qty, 0) }
}
export const dl = (name, text, mime = 'text/csv') => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: mime }))
  a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
export const csv = (rows) => rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n')
export const RANGES = [['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['month', 'This month'], ['all', 'All time']]
export const inR = (d, r) => {
  if (r === 'all') return true
  const t = new Date(d), n = new Date()
  const s = new Date(n.getFullYear(), n.getMonth(), n.getDate())
  if (r === 'today') return t >= s
  if (r === 'month') return t >= new Date(n.getFullYear(), n.getMonth(), 1)
  s.setDate(s.getDate() - (+r - 1))
  return t >= s
}
