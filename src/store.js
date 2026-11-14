import { useSyncExternalStore } from 'react'
const DEFAULTS = { settings: { name: 'RestoPOS', logo: '', currency: '₱', tax: 12, pin: '1234' }, products: [], orders: [] }
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
