import { useState } from 'react'
import Icon from './icons.jsx'
import { Shift, Drawer, ZRep, Restock, Expense, Reorder, Calc, Notes } from './Biz.jsx'
import { Waste, BulkPrice, Dup, StockReports, Analytics, CustInsight, Checklist, Tasks, Health, Prefs2, Help, RefundTool } from './Biz2.jsx'
import { Trends, Lifetime, Goals, EndDay, CashCount, Calcs, StockCount, PO, PriceList, Suppliers, Margins, Segments, Leaders, TableBoard, Handover, CustDisplay, DataIO, DataCenter2 } from './Biz3.jsx'
import { pref, setPref } from './fx.js'
const SEC = [
  ['Cash and shift', [['shift', 'Shift and cash count', 'clock'], ['drawer', 'Cash in / out', 'coin'], ['z', 'Z report', 'report'], ['eod', 'End-of-day summary', 'report'], ['cash', 'Cash counter', 'coin'], ['refund', 'Void / refund order', 'box'], ['expense', 'Quick expense', 'tag'], ['handover', 'Shift handover note', 'clock']]],
  ['Stock', [['restock', 'Quick restock', 'warehouse'], ['count', 'Stock count', 'warehouse'], ['waste', 'Record waste', 'close'], ['reorder', 'Reorder list', 'search'], ['po', 'Purchase order', 'box'], ['sup', 'Suppliers', 'users'], ['stockrep', 'Stock reports', 'chart'], ['margins', 'Margins and cover', 'chart'], ['bulk', 'Bulk price change', 'sliders'], ['plist', 'Price list', 'tag'], ['dup', 'Duplicate product', 'tag']]],
  ['Insights', [['trends', 'Trends and profit', 'chart'], ['life', 'Lifetime totals', 'chart'], ['goals', 'Sales goals', 'star'], ['analytics', 'Analytics', 'chart'], ['leaders', 'Cashier leaderboard', 'users']]],
  ['Customers', [['cust', 'Customer insights', 'users'], ['seg', 'Segments and win-back', 'users'], ['cdisp', 'Customer display', 'register']]],
  ['Work', [['tables', 'Open tables', 'register'], ['check', 'Daily checklist', 'star'], ['tasks', 'Tasks and reminders', 'clock'], ['notes', 'Notes', 'gift'], ['calc', 'Calculator', 'sliders'], ['calcs', 'Tip, split, margin, tax', 'sliders'], ['pal', 'Keypad, price check, exchange', 'register']]],
  ['System', [['data', 'Data center and archive', 'db'], ['io', 'Import and export CSV', 'db'], ['health', 'Health check', 'cog'], ['prefs', 'Preferences', 'sliders'], ['help', 'Shortcuts', 'barcode']]],
]
const ALL = SEC.flatMap(([, it]) => it)
const M = { shift: Shift, drawer: Drawer, z: ZRep, eod: EndDay, cash: CashCount, refund: RefundTool, expense: Expense, handover: Handover, restock: Restock, count: StockCount, waste: Waste, reorder: Reorder, po: PO, sup: Suppliers, stockrep: StockReports, margins: Margins, bulk: BulkPrice, plist: PriceList, dup: Dup, trends: Trends, life: Lifetime, goals: Goals, analytics: Analytics, leaders: Leaders, cust: CustInsight, seg: Segments, cdisp: CustDisplay, tables: TableBoard, check: Checklist, tasks: Tasks, notes: Notes, calc: Calc, calcs: Calcs, data: DataCenter2, io: DataIO, health: Health, prefs: Prefs2, help: Help }
export default function ToolsPage() {
  const [t, setT] = useState(null); const [q, setQ] = useState(''); const [, f] = useState(0)
  const pins = pref('pins', '').split(',').filter(Boolean)
  const pin = (k) => { setPref('pins', (pins.includes(k) ? pins.filter((z) => z !== k) : [...pins, k]).join(',')); f((n) => n + 1) }
  const s = q.trim().toLowerCase()
  const groups = [...(pins.length && !s ? [['Pinned', ALL.filter((i) => pins.includes(i[0]))]] : []), ...SEC].map(([h, it]) => [h, it.filter((i) => !s || i[1].toLowerCase().includes(s))]).filter(([, it]) => it.length)
  const close = () => setT(null)
  const pick = (k) => { if (k === 'pal') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })); else setT(k) }
  const C = t ? M[t] : null
  return (
    <>
      <input className="input" placeholder="Search tools" value={q} onChange={(e) => setQ(e.target.value)} />
      {groups.map(([h, items]) => (
        <div key={h}>
          <div className="tsec">{h}</div>
          <div className="tcards">{items.map(([k, l, i]) => <div key={h + k} style={{ position: 'relative' }}><button className="raised tcard" onClick={() => pick(k)}><Icon n={i} s={24} />{l}</button><span className="tpin" onClick={() => pin(k)}>{pins.includes(k) ? '★' : '☆'}</span></div>)}</div>
        </div>
      ))}
      {C && <C close={close} />}
    </>
  )
}
