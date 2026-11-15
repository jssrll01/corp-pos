import { useSyncExternalStore } from 'react'
export const MTABS = [['products', 'Products', 'tag'], ['inventory', 'Inventory', 'warehouse'], ['finance', 'Finance', 'coin'], ['reports', 'Reports', 'report'], ['people', 'People', 'users'], ['system', 'System', 'cog'], ['settings', 'Settings', 'sliders'], ['data', 'Data', 'db'], ['sales', 'Dashboard', 'chart'], ['payroll', 'Payroll', 'coin'], ['gifts', 'Gift Cards', 'gift'], ['coupons', 'Coupons & Promos', 'ticket'], ['rewards', 'Loyalty Rewards', 'star'], ['labels', 'Barcode Labels', 'barcode'], ['serials', 'Serial Lookup', 'search']]
let s = { tab: 'products', unlocked: false }
const subs = new Set()
export const getMgr = () => s
export const setMgr = (p) => { s = { ...s, ...p }; subs.forEach((f) => f()) }
export const useMgr = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, getMgr)
