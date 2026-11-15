import { getState, setState, saveFailed } from './store.js'
import { dl, csv, num, r2, put, mvRow, uid, audit, curUser, tracked, dkey } from './inv.js'
import { ono } from './cart.js'
import { printDoc } from './print.js'
const g = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v } catch (e) { return d } }
export const pref = (k, d = '') => g('pos_p_' + k, d)
export const setPref = (k, v) => { try { localStorage.setItem('pos_p_' + k, String(v)) } catch (e) {} }
export const PRESETS = [['Blue', '#2563eb', '#e8efff'], ['Indigo', '#4f46e5', '#eef0ff'], ['Emerald', '#059669', '#d1fae5'], ['Rose', '#e11d48', '#ffe4e6'], ['Amber', '#d97706', '#fef3c7'], ['Slate', '#334155', '#e2e8f0']]
export const applyPrefs = () => {
  const h = document.documentElement
  const dark = pref('theme', 'light') === 'dark'
  h.dataset.theme = dark ? 'dark' : 'light'
  h.dataset.dens = pref('dens', 'cozy')
  h.dataset.grid = pref('grid', 'm')
  h.style.setProperty('--ac', pref('ac', '#2563eb'))
  if (dark) h.style.removeProperty('--acs'); else h.style.setProperty('--acs', pref('acs', '#e8efff'))
}
export const toast = (m, k = '') => window.dispatchEvent(new CustomEvent('pos-toast', { detail: { m, k } }))
let ac
export const beep = (f = 880, ms = 70) => {
  if (pref('snd', '1') !== '1') return
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)()
    const o = ac.createOscillator(), gn = ac.createGain()
    o.frequency.value = f; gn.gain.value = 0.05
    o.connect(gn); gn.connect(ac.destination); o.start(); o.stop(ac.currentTime + ms / 1000)
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate(15) } catch (e) {}
}
export const snapshot = () => {}
export const getSnaps = () => []
export const doBackup = () => {
  dl('pos-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'pos', version: 2, ...getState() }, null, 2), 'application/json')
  setPref('lastbk', Date.now())
}
export const toggleFull = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen() } catch (e) {} }
let wl = null
export const wakeLock = async (on) => {
  try {
    if (on && navigator.wakeLock) { if (wl) return; wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null }) }
    else if (wl) { await wl.release(); wl = null }
  } catch (e) {}
}
/* ---------- storage ---------- */
export const LIMIT = 5000000
export const getLimit = () => num(pref('quota', '5000000')) || 5000000
export const measure = () => {
  let total = 0, db = 0
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const n = k.length + (localStorage.getItem(k) || '').length; total += n; if (k === 'pos_db') db = n } } catch (e) {}
  const s = getState()
  const img = s.products.reduce((a, p) => a + (p.image ? p.image.length : 0), 0) + (s.settings.logo || '').length
  const old = s.orders.filter((o) => Date.now() - new Date(o.date) > 45 * 864e5).length
  const pct = Math.min(100, Math.round((total / getLimit()) * 100))
  const fail = saveFailed()
  const level = fail || pct >= 85 ? 'crit' : pct >= 70 ? 'high' : pct >= 50 || old >= 800 ? 'warn' : 'ok'
  return { total, db, img, pct, level, fail, old }
}
export const migrate = () => {
  try { localStorage.removeItem('pos_snap') } catch (e) {}
  const s = getState()
  const old = s.orders.filter((o) => o.voided)
  const dirty = s.cashlog.some((c) => /^Void #/.test(c.note || ''))
  if (!old.length && !dirty) return
  setState((x) => ({ orders: x.orders.filter((o) => !o.voided), voided: [...old, ...(x.voided || [])], cashlog: x.cashlog.filter((c) => !/^Void #/.test(c.note || '')) }))
}
export const nextOrderNo = () => {
  const s = getState()
  let m = num(pref('lastno', '0'))
  s.orders.forEach((o) => { if ((o.no || 0) > m) m = o.no })
  ;(s.voided || []).forEach((o) => { if ((o.no || 0) > m) m = o.no })
  return m + 1
}
/* ---------- voids and balances ---------- */
export const voidOrder = (o, reason = '') => {
  const s = getState()
  const wh = o.whId || s.settings.activeWh || 'main'
  const moves = []
  const prods = s.products.map((p) => {
    const its = o.items.filter((i) => i.id === p.id)
    if (!its.length || !tracked(p)) return p
    let q = p
    its.forEach((i) => { (i.lots && i.lots.length ? i.lots : [{ no: '', exp: '', qty: i.qty }]).forEach((l) => { q = put(q, wh, l.qty, l.no || '', l.exp || '') }) })
    moves.push(mvRow('return', p, wh, its.reduce((a, i) => a + i.qty, 0), 'Void ' + ono(o.no)))
    return q
  })
  const cash = (o.payments || [{ method: o.method, amount: o.paid ?? o.total }]).filter((p) => p.method === 'cash').reduce((a, p) => a + num(p.amount), 0)
  const rec = { ...o, voided: true, voidAt: new Date().toISOString(), voidBy: curUser().name, voidReason: reason, refundCash: r2(cash) }
  setState((x) => ({
    orders: x.orders.filter((z) => z.id !== o.id),
    voided: [rec, ...(x.voided || [])],
    products: prods, moves: [...moves, ...x.moves].slice(0, 5000),
    customers: o.customerId ? x.customers.map((c) => (c.id === o.customerId ? { ...c, points: Math.max(0, (c.points || 0) - (o.earned || 0) + (o.pts || 0)) } : c)) : x.customers,
  }))
  audit('Order voided', ono(o.no) + ' ' + reason)
}
export const settleOrder = (id, amt, method) => {
  setState((s) => ({ orders: s.orders.map((z) => (z.id === id ? { ...z, paid: r2((z.paid ?? z.total) + amt), balance: r2(Math.max(0, (z.balance || 0) - amt)), payments: [...(z.payments || []), { id: uid(), date: new Date().toISOString(), amount: amt, method, note: 'Balance payment' }] } : z)) }))
  audit('Balance collected', id + ' ' + amt)
}
/* ---------- archive: export, then delete from this device ---------- */
export const ARC = ['orders', 'voided', 'moves', 'audit', 'cashlog', 'expenses', 'attendance']
const dOf = (c, x) => (c === 'attendance' ? x.in : c === 'voided' ? x.voidAt || x.date : x.date)
export const planArchive = (days) => {
  const s = getState()
  const cut = Date.now() - days * 864e5
  const data = {}, ids = {}
  let n = 0
  ARC.forEach((c) => {
    const a = (s[c] || []).filter((x) => x && x.id && new Date(dOf(c, x)).getTime() < cut && !(c === 'orders' && num(x.balance) > 0) && !(c === 'attendance' && !x.out))
    data[c] = a; ids[c] = new Set(a.map((x) => x.id)); n += a.length
  })
  return { data, ids, n, days, bytes: JSON.stringify(data).length }
}
export const exportArchive = (plan) => {
  const s = getState()
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
  const payload = { app: 'pos-archive', version: 1, created: new Date().toISOString(), store: s.settings.name, olderThanDays: plan.days, counts: Object.fromEntries(ARC.map((c) => [c, plan.data[c].length])), data: plan.data }
  dl('pos-archive-' + stamp + '.json', JSON.stringify(payload), 'application/json')
  setPref('lastarch', Date.now())
}
export const exportOrdersCsv = (orders, name = 'orders') => dl(name + '-' + new Date().toISOString().slice(0, 10) + '.csv', csv([['Order', 'Date', 'Customer', 'Type', 'Table', 'Items', 'Sub Total', 'Discount', 'Tax', 'Total', 'Paid', 'Balance', 'Method', 'Cashier'], ...orders.map((o) => [ono(o.no), o.date, o.customerName || '', o.otype || '', o.table || '', o.items.map((i) => i.qty + 'x ' + i.name).join('; '), o.sub, o.disc, o.tax, o.total, o.paid ?? o.total, o.balance || 0, o.method, o.by || ''])]))
const RK = 'pos_rollup'
export const getRollup = () => { try { return JSON.parse(localStorage.getItem(RK) || '{}') } catch (e) { return {} } }
const addRollup = (orders, voided, sg) => {
  const r = getRollup()
  const row = (k) => r[k] || (r[k] = { n: 0, s: 0, t: 0, d: 0, c: 0, i: 0, v: 0, vs: 0 })
  ;(orders || []).forEach((o) => { const d = row(dkey(o.date)); d.n += sg; d.s = r2(d.s + sg * num(o.total)); d.t = r2(d.t + sg * num(o.tax)); d.d = r2(d.d + sg * num(o.disc)); d.c = r2(d.c + sg * num(o.cogs)); d.i += sg * (o.items || []).reduce((a, i) => a + num(i.qty), 0) })
  ;(voided || []).forEach((o) => { const d = row(dkey(o.date)); d.v += sg; d.vs = r2(d.vs + sg * num(o.total)) })
  Object.keys(r).forEach((k) => { if (r[k].n <= 0 && r[k].v <= 0) delete r[k] })
  try { localStorage.setItem(RK, JSON.stringify(r)) } catch (e) {}
}
export const purgeArchive = (plan) => {
  const s = getState()
  let m = num(pref('lastno', '0'))
  ;[...s.orders, ...(s.voided || [])].forEach((o) => { if ((o.no || 0) > m) m = o.no })
  setPref('lastno', m)
  addRollup(plan.data.orders, plan.data.voided, 1)
  setState((x) => { const o = {}; ARC.forEach((c) => { o[c] = (x[c] || []).filter((r) => !(r && r.id && plan.ids[c].has(r.id))) }); return o })
  audit('Archive purged', plan.n + ' records')
}
export const importArchive = (j) => {
  if (!j || j.app !== 'pos-archive' || !j.data) return 'This is not a valid archive file'
  if (measure().total + JSON.stringify(j.data).length > getLimit() * 0.95) return 'Not enough free space to load this archive. Export and free space first.'
  const x = getState()
  const add = {}
  let n = 0
  ARC.forEach((c) => { const have = new Set((x[c] || []).map((r) => r.id)); add[c] = (j.data[c] || []).filter((r) => r && r.id && !have.has(r.id)); n += add[c].length })
  setState((s) => { const o = {}; ARC.forEach((c) => { o[c] = [...(s[c] || []), ...add[c]] }); return o })
  addRollup(add.orders, add.voided, -1)
  return 'Loaded ' + n + ' records from the archive'
}
export const shrinkImages = async (max = 240, q = 0.6) => {
  const ps = getState().products
  let saved = 0
  const out = await Promise.all(ps.map((p) => new Promise((res) => {
    if (!p.image || p.image.length < 12000) return res(null)
    const im = new Image()
    im.onerror = () => res(null)
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height))
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k))
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
      const d = c.toDataURL('image/jpeg', q)
      if (d.length < p.image.length) { saved += p.image.length - d.length; res({ id: p.id, from: p.image, to: d }) } else res(null)
    }
    im.src = p.image
  })))
  const map = Object.fromEntries(out.filter(Boolean).map((o) => [o.id, o]))
  if (saved > 0) setState((s) => ({ products: s.products.map((p) => (map[p.id] && p.image === map[p.id].from ? { ...p, image: map[p.id].to } : p)) }))
  return saved
}
export const healthCheck = () => {
  const s = getState(), out = []
  const bad = (m) => out.push({ l: 'bad', m }), warn = (m) => out.push({ l: 'warn', m })
  const np = s.products.filter((p) => !(num(p.price) > 0)).length
  if (np) warn(np + ' product(s) have no selling price')
  const bc = {}; s.products.forEach((p) => { if (p.barcode) bc[p.barcode] = (bc[p.barcode] || 0) + 1 })
  const dup = Object.values(bc).filter((n) => n > 1).length
  if (dup) bad(dup + ' barcode(s) are used by more than one product')
  const neg = s.products.filter((p) => tracked(p) && (num(p.stock) < 0 || (p.lots || []).some((l) => l.qty < 0))).length
  if (neg) bad(neg + ' product(s) have negative stock')
  const nos = {}; s.orders.forEach((o) => { nos[o.no] = (nos[o.no] || 0) + 1 })
  const dn = Object.values(nos).filter((n) => n > 1).length
  if (dn) bad(dn + ' duplicate order number(s)')
  const mm = s.orders.filter((o) => Math.abs(num(o.total) - num(o.paid ?? o.total) - num(o.balance)) > 0.02).length
  if (mm) warn(mm + ' order(s) where paid + balance does not match the total')
  const oa = s.attendance.filter((a) => !a.out && Date.now() - new Date(a.in) > 16 * 36e5).length
  if (oa) warn(oa + ' attendance record(s) open for more than 16 hours')
  const m = measure()
  if (m.level !== 'ok') warn('Storage is ' + m.pct + '% full')
  if (!out.length) out.push({ l: 'ok', m: 'No problems found' })
  return out
}
export const expiring = (days) => {
  const s = getState()
  const lim = new Date(); lim.setDate(lim.getDate() + days)
  const L = dkey(lim)
  const out = []
  s.products.forEach((p) => { if (!tracked(p)) return; (p.lots || []).forEach((l) => { if (l.qty > 0 && l.exp && l.exp <= L) out.push({ p, l }) }) })
  return out
}
/* ---------- receipts ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
export const receiptText = (o) => {
  const st = getState().settings
  const f = (n) => (st.currency || '') + r2(n).toFixed(2)
  return [st.name, new Date(o.date).toLocaleString(), 'Order ' + ono(o.no) + (o.otype ? ' - ' + o.otype + (o.table ? ' ' + o.table : '') : ''), o.customerName && 'Customer: ' + o.customerName, '', ...o.items.map((i) => i.qty + ' x ' + i.name + '  ' + f(i.qty * i.price - (i.bulk || 0))), '', 'Sub Total ' + f(o.sub), o.disc > 0 && 'Discount -' + f(o.disc), (o.taxName || 'Tax') + ' ' + f(o.tax), 'TOTAL ' + f(o.total), 'Paid ' + f(o.paid ?? o.total), o.balance > 0 && 'Balance ' + f(o.balance), '', st.rcpt && st.rcpt.foot].filter((l) => l !== false && l != null && l !== undefined).join('\n')
}
export const shareText = async (t) => {
  try { if (navigator.share) { await navigator.share({ text: t }); return } } catch (e) { return }
  try { await navigator.clipboard.writeText(t); toast('Receipt copied', 'ok') } catch (e) { toast('Could not copy', 'bad') }
}
export const kitchenTicket = (cart, no) => {
  const rows = cart.items.map((i) => '<div class="b">' + i.qty + ' x ' + esc(i.name) + '</div>' + (i.note ? '<div>&nbsp;&nbsp;* ' + esc(i.note) + '</div>' : '')).join('')
  printDoc('<div class="c b" style="font-size:16px">KITCHEN</div><div class="c">' + esc(ono(no)) + ' · ' + esc(cart.otype || 'Dine-in') + (cart.table ? ' · ' + esc(cart.table) : '') + '</div><div class="c">' + new Date().toLocaleTimeString() + '</div><hr>' + rows + '<hr>' + (cart.note ? '<div>Note: ' + esc(cart.note) + '</div>' : ''), '58mm auto', 'body{width:58mm;padding:3mm;font:12px/1.4 monospace;color:#000}.c{text-align:center}.b{font-weight:700}hr{border:0;border-top:1px dashed #000}')
}
export const probeQuota = () => {
  const K = 'pos_probe'
  let used = 0
  try { localStorage.removeItem(K); for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); used += k.length + (localStorage.getItem(k) || '').length } } catch (e) {}
  let lo = 0, hi = 25000000
  const ok = (n) => { try { localStorage.setItem(K, 'x'.repeat(n)); return true } catch (e) { return false } }
  while (hi - lo > 50000) { const mid = (lo + hi) >> 1; if (ok(mid)) lo = mid; else hi = mid }
  try { localStorage.removeItem(K) } catch (e) {}
  const cap = used + lo
  setPref('quota', cap)
  return cap
}
