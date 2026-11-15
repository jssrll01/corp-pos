import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store.js'
import Cashier from './pages/Cashier.jsx'
import Orders from './pages/Orders.jsx'
import Management from './pages/Management.jsx'
import Hold from './pages/Hold.jsx'
import Customers from './pages/Customers.jsx'
import Attend from './pages/Attend.jsx'
import { NavBus, UserSwitch } from './pages/Bits.jsx'
import { useMgr, setMgr, MTABS } from './mgr.js'
import Icon from './icons.jsx'
import Ic from './icons2.jsx'
import Kiosk from './Kiosk.jsx'
import Tools from './Tools.jsx'
import Activate from './pages/Activate.jsx'
import { checkStored } from './license.js'
import { Home, Clock, Bell, ToolsPage } from './Biz.jsx'
import { useX } from './xstore.js'
import { pref, setPref, applyPrefs } from './fx.js'
const NAV = [['home', 'Dashboard', 'chart'], ['cashier', 'Register', 'register'], ['hold', 'Parked and Reserved', 'pause'], ['orders', 'Orders', 'box'], ['customers', 'Customers', 'users'], ['attend', 'Attendance', 'clock'], ['tools', 'Tools', 'sliders'], ['manage', 'Management', 'briefcase']]
export default function App() {
  const { settings } = useStore()
  const mg = useMgr()
  const x = useX()
  const [page, setPage] = useState('cashier')
  const [min, setMin] = useState(pref('sb', window.innerWidth < 900 ? '1' : '0') === '1')
  const go = (p) => setPage(p)
  const [online, setOnline] = useState(navigator.onLine)
  const [inst, setInst] = useState(null)
  const [dark, setDark] = useState(pref('theme', 'light') === 'dark')
  const [lic, setLic] = useState(null)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const bip = (e) => { e.preventDefault(); setInst(e) }
    const ins = () => setInst(null)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    window.addEventListener('beforeinstallprompt', bip); window.addEventListener('appinstalled', ins)
    return () => {
      window.removeEventListener('online', on); window.removeEventListener('offline', off)
      window.removeEventListener('beforeinstallprompt', bip); window.removeEventListener('appinstalled', ins)
    }
  }, [])
  useEffect(() => { checkStored().then(setLic) }, [])
  useEffect(() => {
    let t
    const ev = ['pointerdown', 'keydown']
    const reset = () => { clearTimeout(t); const m = parseFloat(pref('idle', '0')); if (m > 0) t = setTimeout(() => setMgr({ unlocked: false }), m * 60000) }
    ev.forEach((e) => document.addEventListener(e, reset)); reset()
    return () => { clearTimeout(t); ev.forEach((e) => document.removeEventListener(e, reset)) }
  }, [])
  const install = async () => { try { inst.prompt(); await inst.userChoice } catch (e) {} setInst(null) }
  const toggleSb = () => { setPref('sb', min ? '0' : '1'); setMin(!min) }
  const toggleTheme = () => { const n = dark ? 'light' : 'dark'; setPref('theme', n); applyPrefs(); setDark(!dark) }
  const palette = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
  if (lic === null) return null
  if (!lic) return <><Kiosk /><Activate onOk={() => setLic(true)} /></>
  const title = (NAV.find((n) => n[0] === page) || [])[1]
  return (
    <>
      <Kiosk />
      <Tools go={go} />
      <NavBus go={go} />
      <div className={'app' + (min ? ' min' : '')}>
        <aside className="side">
          <div className="sbrand">{settings.logo && <img src={settings.logo} alt="" />}<b className="nl">{settings.name}</b></div>
          {NAV.map(([k, l, i]) => <button key={k} className={'btn nav' + (page === k ? ' on' : '')} onClick={() => go(k)}><Icon n={i} /><span className="nl">{l}</span></button>)}
          {page === 'manage' && mg.unlocked && (<>
            <small className="sbh nl">Management</small>
            {MTABS.map(([k, l, ic]) => <button key={k} className={'btn nav' + (mg.tab === k ? ' on' : '')} onClick={() => setMgr({ tab: k })}><Icon n={ic} /><span className="nl">{l}</span></button>)}
            <button className="btn nav" onClick={() => setMgr({ unlocked: false })}><Icon n="lock" /><span className="nl">Lock</span></button>
          </>)}
          <div className="sbfoot nl"><UserSwitch /></div>
        </aside>
        <div className="mainc">
          <header className="top">
            <button className="btn ib" onClick={toggleSb} aria-label="Toggle menu"><Ic n="menu" /></button>
            <div className="ttl">{title}</div>
            {inst && <button className="btn sm" onClick={install}>Install</button>}
            <span className={'chip ' + (x.shift ? 'ok' : '')}>{x.shift ? 'Shift open' : 'No shift'}</span>
            <span className={'chip ' + (online ? '' : 'bad')}>{online ? 'Online' : 'Offline mode'}</span>
            <Clock />
            <button className="btn ib" onClick={palette} aria-label="Search commands"><Icon n="search" s={18} /></button>
            <Bell go={go} />
            <button className="btn ib" onClick={toggleTheme} aria-label="Theme"><Ic n={dark ? 'sun' : 'moon'} /></button>
          </header>
          <AnimatePresence mode="wait">
            <motion.main key={page} className={'page' + (page === 'cashier' ? ' nos' : '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
              {page === 'home' && <Home go={go} />}
              {page === 'cashier' && <Cashier />}
              {page === 'orders' && <Orders />}
              {page === 'manage' && <Management />}
              {page === 'hold' && <Hold />}
              {page === 'customers' && <Customers />}
              {page === 'attend' && <Attend />}
              {page === 'tools' && <ToolsPage />}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
