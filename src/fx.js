import { getState } from './store.js'
import { dl } from './inv.js'
const g = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v } catch (e) { return d } }
export const pref = (k, d = '') => g('pos_p_' + k, d)
export const setPref = (k, v) => { try { localStorage.setItem('pos_p_' + k, String(v)) } catch (e) {} }
export const applyPrefs = () => {
  const h = document.documentElement
  h.dataset.theme = pref('theme', 'light')
  h.dataset.dens = pref('dens', 'cozy')
}
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
export const snapshot = () => {
  try {
    const today = new Date().toLocaleDateString('en-CA')
    const L = JSON.parse(localStorage.getItem('pos_snap') || '[]')
    if (L[0] && L[0].d === today) return
    if ((localStorage.getItem('pos_db') || '').length > 1500000) return
    const s = getState()
    const data = JSON.stringify({ ...s, products: s.products.map(({ image, ...p }) => p) })
    if (data.length > 1000000) return
    localStorage.setItem('pos_snap', JSON.stringify([{ d: today, t: Date.now(), data }, ...L].slice(0, 2)))
  } catch (e) {}
}
export const getSnaps = () => { try { return JSON.parse(localStorage.getItem('pos_snap') || '[]') } catch (e) { return [] } }
export const doBackup = () => {
  dl('pos-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'pos', version: 2, ...getState() }, null, 2), 'application/json')
  setPref('lastbk', Date.now())
}
