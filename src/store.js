import { useSyncExternalStore } from 'react'
const DEFAULTS = { settings: { name: 'xpos', logo: '', currency: '', tax: 0, pin: '1234', taxName: '', taxIncl: false, activeBranch: 'main', activeWh: 'main', lowStock: 0, expDays: 0, loyalty: { on: false, per: 0, value: 0 }, paper: 58, rcpt: { head: '', foot: '', logo: true, tax: true, sku: false, cashier: true, customer: true, size: 11 }, expCats: '' }, products: [], orders: [], customers: [], suppliers: [], employees: [], attendance: [], expenses: [], parked: [], reservations: [], moves: [], transfers: [], purchases: [], closings: [], counts: [], audit: [], cashlog: [], discounts: [], levels: [], branches: [{ id: 'main', name: 'Main' }], warehouses: [{ id: 'main', name: 'Main', branchId: 'main' }] }
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
