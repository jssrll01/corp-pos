import { useSyncExternalStore } from 'react'
const K = 'xpos_more_v1'
const D = { emps: [], pay: [], gifts: [], coupons: [], rewards: [], rlog: [], xch: [] }
let s = D
try { s = { ...D, ...(JSON.parse(localStorage.getItem(K)) || {}) } } catch (e) {}
const subs = new Set()
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export const getX = () => s
export const setX = (p) => { s = { ...s, ...(typeof p === 'function' ? p(s) : p) }; try { localStorage.setItem(K, JSON.stringify(s)) } catch (e) {} subs.forEach((f) => f()) }
export const useX = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, getX)
