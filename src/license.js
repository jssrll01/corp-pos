export const DEFAULT_KEY = '1010-0707-1010-0707'
const norm = (k) => String(k || '').trim().toUpperCase()
const get = (n) => { try { return localStorage.getItem(n) } catch (e) { return null } }
const put = (n, v) => { try { localStorage.setItem(n, v) } catch (e) {} }
export const expected = () => get('pos_key') || DEFAULT_KEY
export const checkStored = async () => get('pos_act') === expected()
export const activate = async (key) => {
  if (norm(key) !== norm(expected())) return false
  put('pos_act', expected())
  return true
}
export const setKey = (key) => { const k = norm(key); put('pos_key', k); put('pos_act', k) }
