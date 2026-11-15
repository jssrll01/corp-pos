import { useSyncExternalStore } from 'react'
export const MTABS = [['products', 'Products'], ['inventory', 'Inventory'], ['finance', 'Finance'], ['reports', 'Reports'], ['people', 'People'], ['system', 'System'], ['settings', 'Settings'], ['data', 'Data'], ['sales', 'Sales']]
let s = { tab: 'products', unlocked: false }
const subs = new Set()
export const getMgr = () => s
export const setMgr = (p) => { s = { ...s, ...p }; subs.forEach((f) => f()) }
export const useMgr = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, getMgr)
