import { useSyncExternalStore } from 'react'
const DEFAULTS = { settings: { name: 'RestoPOS', logo: '', currency: '₱', tax: 12, pin: '1234', taxName: 'VAT', taxIncl: false, activeBranch: 'main', activeWh: 'main', lowStock: 5, expDays: 30, loyalty: { on: false, per: 100, value: 1 }, paper: 58, rcpt: { head: '', foot: '', logo: true, tax: true, sku: false, cashier: true, customer: true, size: 11 }, expCats: 'Rent,Utilities,Salaries,Supplies,Other' }, products: [], orders: [], customers: [], suppliers: [], employees: [], attendance: [], expenses: [], parked: [], reservations: [], moves: [], transfers: [], purchases: [], closings: [], counts: [], audit: [], cashlog: [], discounts: [], levels: [{ id: 'wholesale', name: 'Wholesale' }, { id: 'vip', name: 'VIP' }], branches: [{ id: 'main', name: 'Main Branch' }], warehouses: [{ id: 'main', name: 'Main Warehouse', branchId: 'main' }] }
let state = DEFAULTS
try { const s = JSON.parse(localStorage.getItem('pos_db')); if (s) state = { ...DEFAULTS, ...s, settings: { ...DEFAULTS.settings, ...s.settings } } } catch (e) {}
const subs = new Set()
export const getState = () => state
export const setState = (fn) => {
  state = { ...state, ...fn(state) }
  try { localStorage.setItem('pos_db', JSON.stringify(state)) } catch (e) {}
  subs.forEach((f) => f())
}
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, getState)
