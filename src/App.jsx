import { useState, useEffect, useMemo } from 'react'
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
import { Home, Clock } from './Biz.jsx'
import ToolsPage from './ToolsHub.jsx'
import { Bell2, Toaster, StorageStrip, Help, useMeasure } from './Biz2.jsx'
import { DataCenter2 } from './Biz3.jsx'
import { useX } from './xstore.js'
import { money, num, dkey, curUser } from './inv.js'
import { pref, setPref, applyPrefs, toggleFull, wakeLock, doBackup } from './fx.js'
const GROUPS = [
  ['', [['home', 'Dashboard', 'chart']]],
  ['Sales', [['cashier', 'Register', 'register'], ['hold', 'Parked and Reserved', 'pause'], ['orders', 'Orders', 'box'], ['customers', 'Customers', 'users']]],
  ['Operations', [['attend', 'Attendance', 'clock'], ['tools', 'Tools', 'sliders']]],
  ['Admin', [['manage', 'Management', 'briefcase']]],
]
const NAV = GROUPS.flatMap((g) => g[1])
export default function App() {
  const st = useStore()
  const { settings } = st
  const mg = useMgr()
  const x = useX()
  const m = useMeasure()
  const [page, setPage] = useState(() => { const p = pref('page', 'cashier'); return NAV.some((n) => n[0] === p) ? p : 'cashier' })
  const [min, setMin] = useState(pref('sb', window.innerWidth < 900 ? '1' : '0') === '1')
  const [modal, setModal] = useState(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [inst, setInst] = useState(null)
  const [dark, setDark] = useState(pref('theme', 'light') === 'dark')
  const [lic, setLic] = useState(null)
  const [, bump] = useState(0)
  const go = (p) => { setPage(p); setPref('page', p) }
  const today = useMemo(() => { const d = dkey(new Date()); return st.orders.filter((o) => dkey(o.date) === d).reduce((a, o) => a + num(o.total), 0) }, [st.orders])
  const goal = num(pref('goal', '0'))
  const bkDue = st.orders.length > 0 && Date.now() - num(pref('lastbk', '0')) > 7 * 864e5
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const bip = (e) => { e.preventDefault(); setInst(e) }
    const ins = () => setInst(null)
    const vis = () => { if (document.visibilityState === 'visible') wakeLock(pref('wake', '1') === '1') }
    const key = (e) => { if (e.key === '?' && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) setModal('help') }
    window.addEventListener('online', on); window.addEventListener('offline', off)
    window.addEventListener('beforeinstallprompt', bip); window.addEventListener('appinstalled', ins)
    document.addEventListener('visibilitychange', vis); document.addEventListener('keydown', key)
    vis()
    return () => {
      window.removeEventListener('online', on); window.removeEventListener('offline', off)
      window.removeEventListener('beforeinstallprompt', bip); window.removeEventListener('appinstalled', ins)
      document.removeEventListener('visibilitychange', vis); document.removeEventListener('keydown', key)
    }
  }, [])
  useEffect(() => { checkStored().then(setLic) }, [])
  useEffect(() => {
    let t
    const ev = ['pointerdown', 'keydown']
    const reset = () => { clearTimeout(t); const v = parseFloat(pref('idle', '0')); if (v > 0) t = setTimeout(() => setMgr({ unlocked: false }), v * 60000) }
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
  const who = (curUser().name || 'A').slice(0, 1).toUpperCase()
  return (
    <>
      <Kiosk />
      <Tools go={go} />
      <NavBus go={go} />
      <div className={'app' + (min ? ' min' : '')}>
        <aside className="side">
          <div className="sbrand">{settings.logo && <img src={settings.logo} alt="" />}<b className="nl">{settings.name}</b></div>
          {GROUPS.map(([h, items]) => (
            <div key={h || 'top'}>
              {h && <small className="sbg nl">{h}</small>}
              {items.map(([k, l, i]) => <button key={k} className={'btn nav' + (page === k ? ' on' : '')} onClick={() => go(k)}><Icon n={i} /><span className="nl">{l}</span></button>)}
            </div>
          ))}
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
            <div className="ttl">{title}<small>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })} · {x.shift ? 'shift open' : 'no shift'}</small></div>
            {inst && <button className="btn sm" onClick={install}>Install</button>}
            <span className="chip hide9">Today {money(today)}{goal > 0 ? ' · ' + Math.round((today / goal) * 100) + '%' : ''}</span>
            {bkDue && <button className="chip st warn hide9" onClick={() => { doBackup(); bump((n) => n + 1) }}>Backup due</button>}
            <span className={'chip hide9 ' + (online ? '' : 'bad')}>{online ? 'Online' : 'Offline mode'}</span>
            <button className={'chip st ' + m.level} onClick={() => setModal('data')} aria-label="Storage">Storage {m.pct}%</button>
            <Clock />
            <button className="btn ib" onClick={palette} aria-label="Search commands"><Icon n="search" s={18} /></button>
            <Bell2 go={go} m={m} openData={() => setModal('data')} />
            <button className="btn ib" onClick={toggleFull} aria-label="Fullscreen"><Ic n="expand" /></button>
            <button className="btn ib" onClick={toggleTheme} aria-label="Theme"><Ic n={dark ? 'sun' : 'moon'} /></button>
            <span className="av" title={curUser().name}>{who}</span>
          </header>
          <StorageStrip m={m} onOpen={() => setModal('data')} />
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
      {modal === 'data' && <DataCenter2 close={() => setModal(null)} />}
      {modal === 'help' && <Help close={() => setModal(null)} />}
      <Toaster />
    </>
  )
}
