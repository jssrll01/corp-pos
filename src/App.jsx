import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store.js'
import Cashier from './pages/Cashier.jsx'
import Orders from './pages/Orders.jsx'
import Management from './pages/Management.jsx'
import Hold from './pages/Hold.jsx'
import Customers from './pages/Customers.jsx'
import Attend from './pages/Attend.jsx'
import { NavBus, LowDot, UserSwitch } from './pages/Bits.jsx'
import Activate from './pages/Activate.jsx'
import { checkStored } from './license.js'
const NAV = [['cashier','Cash Register','🧾'],['hold','Parked & Reserved','⏸️'],['orders','Orders','📦'],['customers','Customers','👥'],['attend','Attendance','🕒'],['manage','Management','⚙️']]
export default function App() {
  const { settings } = useStore()
  const [page, setPage] = useState('cashier')
  const [open, setOpen] = useState(false)
  const go = (p) => { setPage(p); setOpen(false) }
  const [online, setOnline] = useState(navigator.onLine)
  const [inst, setInst] = useState(null)
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
  const install = async () => { try { inst.prompt(); await inst.userChoice } catch (e) {} setInst(null) }
  const [lic, setLic] = useState(null)
  useEffect(() => { checkStored().then(setLic) }, [])
  if (lic === null) return null
  if (!lic) return <Activate onOk={() => setLic(true)} />
  return (
    <>
      <NavBus go={go} />
      <header className="top">
        <div className="brand">
          {settings.logo && <img src={settings.logo} alt="" />}
          <b>{settings.name}</b>
        </div>
        {inst && <button className="btn" onClick={install}>Install</button>}
        <button className="btn burger" onClick={() => setOpen(true)} aria-label="Menu">
          <LowDot />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </header>
      <AnimatePresence>
        {open && (<>
          <motion.div key="scrim" className="scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setOpen(false)} />
          <motion.aside key="drawer" className="drawer raised" initial={{x:-300}} animate={{x:0}} exit={{x:-300}} transition={{type:'spring',damping:26,stiffness:260}}>
            <h2 style={{margin:'4px 8px 12px'}}>{settings.name}</h2>
            <UserSwitch />
            {NAV.map(([k, l, i]) => (
              <motion.button whileTap={{scale:.96}} key={k} className={'btn nav' + (page === k ? ' on' : '')} onClick={() => go(k)}><span>{i}</span>{l}</motion.button>
            ))}
          </motion.aside>
        </>)}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.main key={page} className="page" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.22}}>
          {page === 'cashier' && <Cashier />}
          {page === 'orders' && <Orders />}
          {page === 'manage' && <Management />}
          {page === 'hold' && <Hold />}
          {page === 'customers' && <Customers />}
          {page === 'attend' && <Attend />}
        </motion.main>
      </AnimatePresence>
    </>
  )
}
