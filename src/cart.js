import { useSyncExternalStore } from 'react'
export const METHODS = [['cash', 'Cash'], ['ewallet', 'E-Wallet'], ['bank', 'Bank Transfer']]
export const MLABEL = { cash: 'Cash', ewallet: 'E-Wallet', bank: 'Bank Transfer' }
export const ono = (n) => '#' + String(n).padStart(5, '0')
export const fmt = (n, cur) => cur + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const EMPTY = { items: [], dtype: '%', dval: '', method: 'cash', received: '', note: '', customer: '', level: 'retail', redeem: '', partial: false, dep: '', resId: '', otype: 'Retail', table: '' }
let st = EMPTY
try { const s = JSON.parse(localStorage.getItem('pos_cart')); if (s && Array.isArray(s.items)) st = { ...EMPTY, ...s } } catch (e) {}
const subs = new Set()
export const getCart = () => st
export const setCart = (p) => {
  st = { ...st, ...(typeof p === 'function' ? p(st) : p) }
  try { localStorage.setItem('pos_cart', JSON.stringify(st)) } catch (e) {}
  subs.forEach((f) => f())
}
export const clearCart = () => setCart(EMPTY)
export const useCart = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, getCart)
export const addItem = (p) => setCart((s) => {
  const has = s.items.find((x) => x.id === p.id)
  return { items: has ? s.items.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x)) : [...s.items, { id: p.id, name: p.name, price: +p.price, qty: 1, cost: +p.cost || 0, sku: p.sku || '' }] }
})
export const setQty = (id, q) => setCart((s) => ({ items: q <= 0 ? s.items.filter((x) => x.id !== id) : s.items.map((x) => (x.id === id ? { ...x, qty: q } : x)) }))
export const calc = (c, taxPct) => {
  const sub = c.items.reduce((a, x) => a + x.price * x.qty, 0)
  const dv = parseFloat(c.dval) || 0
  const raw = c.dtype === '%' ? (sub * Math.min(dv, 100)) / 100 : Math.min(dv, sub)
  const disc = Math.round(raw * 100) / 100
  const base = sub - disc
  const tax = Math.round(base * (taxPct || 0)) / 100
  const total = Math.round((base + tax) * 100) / 100
  const received = parseFloat(c.received) || 0
  const change = c.method === 'cash' ? Math.max(0, Math.round((received - total) * 100) / 100) : 0
  const count = c.items.reduce((a, x) => a + x.qty, 0)
  return { sub, disc, tax, total, received, change, count }
}
