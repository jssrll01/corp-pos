export const SALT = 'c899ead5899cbc2290334a122bd95309'
const hex = async (s) => {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
export const makeKey = async (name) => (await hex(SALT + ':' + name.trim().toLowerCase())).slice(0, 16).toUpperCase().match(/.{4}/g).join('-')
export const verify = async (name, key) => { try { return key.trim().toUpperCase() === (await makeKey(name)) } catch (e) { return false } }
const stored = () => { try { return JSON.parse(localStorage.getItem('pos_lic')) } catch (e) { return null } }
export const checkStored = async () => { const s = stored(); return !!(s && (await verify(s.name, s.key))) }
export const activate = async (name, key) => {
  if (!(await verify(name, key))) return false
  try { localStorage.setItem('pos_lic', JSON.stringify({ name: name.trim(), key: key.trim().toUpperCase() })) } catch (e) {}
  return true
}
