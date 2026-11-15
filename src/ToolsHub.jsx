import { useState } from 'react'
import Icon from './icons.jsx'
import { Shift, Drawer, ZRep, Restock, Expense, Reorder, Calc, Notes } from './Biz.jsx'
import { Waste, BulkPrice, Dup, StockReports, Analytics, CustInsight, Checklist, Tasks, Health, Prefs2, Help, RefundTool } from './Biz2.jsx'
import { Trends, Lifetime, Goals, EndDay, CashCount, Calcs, StockCount, PO, PriceList, Suppliers, Margins, Segments, Leaders, TableBoard, Handover, CustDisplay, DataIO, DataCenter2 } from './Biz3.jsx'
import { Utang, Pricing, BreakBulk, Receive, Payables, SmartReorder, PriceEditor, Catalog, Deliveries, Returns, Report, Commission, Services, CustNotes, ProdHistory } from './Biz4.jsx'
import { pref, setPref } from './fx.js'
import { Returns2, Commission2 } from './Biz5.jsx'
const SEC = [
  ['Cash and shift', [['shift', 'Shift and cash count', 'clock'], ['drawer', 'Cash in / out', 'coin'], ['z', 'Z report', 'report'], ['eod', 'End-of-day summary', 'report'], ['cash', 'Cash counter', 'coin'], ['returns', 'Return items', 'box'], ['refund', 'Void / refund order', 'box'], ['expense', 'Quick expense', 'tag'], ['svc', 'Load, e-wallet, bills', 'coin'], ['handover', 'Shift handover note', 'clock']]],
  ['Sales and credit', [['utang', 'Utang book', 'users'], ['deliv', 'Deliveries', 'box'], ['cust', 'Customer insights', 'users'], ['cnotes', 'Customer notes', 'users'], ['seg', 'Segments and win-back', 'users'], ['cdisp', 'Customer display', 'register']]],
  ['Stock', [['recv', 'Receive delivery', 'warehouse'], ['bb', 'Break bulk', 'warehouse'], ['restock', 'Quick restock', 'warehouse'], ['count', 'Stock count', 'warehouse'], ['waste', 'Record waste', 'close'], ['sreorder', 'Smart reorder', 'search'], ['reorder', 'Reorder list', 'search'], ['po', 'Purchase order', 'box'], ['sup', 'Suppliers', 'users'], ['payables', 'Supplier payables', 'coin'], ['stockrep', 'Stock reports', 'chart'], ['margins', 'Margins and cover', 'chart'], ['phist', 'Product sales history', 'chart'], ['dup', 'Duplicate product', 'tag']]],
  ['Pricing and catalog', [['pricing', 'Pricing tools', 'sliders'], ['editor', 'Quick price editor', 'tag'], ['catalog', 'Catalog tools', 'barcode'], ['bulk', 'Bulk price change', 'sliders'], ['plist', 'Price list', 'tag']]],
  ['Insights', [['report', 'Business report', 'chart'], ['trends', 'Trends and profit', 'chart'], ['life', 'Lifetime totals', 'chart'], ['goals', 'Sales goals', 'star'], ['analytics', 'Analytics', 'chart'], ['leaders', 'Cashier leaderboard', 'users'], ['comm', 'Staff commission', 'users']]],
  ['Work', [['tables', 'Parked sales', 'register'], ['check', 'Daily checklist', 'star'], ['tasks', 'Tasks and reminders', 'clock'], ['notes', 'Notes', 'gift'], ['calc', 'Calculator', 'sliders'], ['calcs', 'Tip, split, margin, tax', 'sliders'], ['pal', 'Keypad, price check, exchange', 'register']]],
  ['System', [['data', 'Data center and archive', 'db'], ['io', 'Import and export CSV', 'db'], ['health', 'Health check', 'cog'], ['prefs', 'Preferences', 'sliders'], ['help', 'Shortcuts', 'barcode']]],
]
const ALL = SEC.flatMap(([, it]) => it)
const M = { shift: Shift, drawer: Drawer, z: ZRep, eod: EndDay, cash: CashCount, returns: Returns2, refund: RefundTool, expense: Expense, svc: Services, handover: Handover, utang: Utang, deliv: Deliveries, cust: CustInsight, cnotes: CustNotes, seg: Segments, cdisp: CustDisplay, recv: Receive, bb: BreakBulk, restock: Restock, count: StockCount, waste: Waste, sreorder: SmartReorder, reorder: Reorder, po: PO, sup: Suppliers, payables: Payables, stockrep: StockReports, margins: Margins, phist: ProdHistory, dup: Dup, pricing: Pricing, editor: PriceEditor, catalog: Catalog, bulk: BulkPrice, plist: PriceList, report: Report, trends: Trends, life: Lifetime, goals: Goals, analytics: Analytics, leaders: Leaders, comm: Commission2, tables: TableBoard, check: Checklist, tasks: Tasks, notes: Notes, calc: Calc, calcs: Calcs, data: DataCenter2, io: DataIO, health: Health, prefs: Prefs2, help: Help }
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
