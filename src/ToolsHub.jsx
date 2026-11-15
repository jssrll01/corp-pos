import { useState } from 'react'
import Icon from './icons.jsx'
import { Shift, Drawer, ZRep, Restock, Expense, Reorder, Calc, Notes } from './Biz.jsx'
import { Waste, BulkPrice, Dup, StockReports, Analytics, CustInsight, Checklist, Tasks, Health, Prefs2, Help, DataCenter, RefundTool } from './Biz2.jsx'
const SEC = [
  ['Cash and shift', [['shift', 'Shift and cash count', 'clock'], ['drawer', 'Cash in / out', 'coin'], ['z', 'Z report', 'report'], ['refund', 'Void / refund order', 'box'], ['expense', 'Quick expense', 'tag']]],
  ['Stock', [['restock', 'Quick restock', 'warehouse'], ['waste', 'Record waste', 'close'], ['reorder', 'Reorder list', 'search'], ['stockrep', 'Stock reports', 'chart'], ['bulk', 'Bulk price change', 'sliders'], ['dup', 'Duplicate product', 'tag']]],
  ['Insights', [['analytics', 'Analytics', 'chart'], ['cust', 'Customer insights', 'users']]],
  ['Work', [['check', 'Daily checklist', 'star'], ['tasks', 'Tasks and reminders', 'clock'], ['notes', 'Notes', 'gift'], ['calc', 'Calculator', 'sliders'], ['pal', 'Keypad, price check, exchange', 'register']]],
  ['System', [['data', 'Data center and archive', 'db'], ['health', 'Health check', 'cog'], ['prefs', 'Preferences', 'sliders'], ['help', 'Shortcuts', 'barcode']]],
]
const M = { shift: Shift, drawer: Drawer, z: ZRep, refund: RefundTool, expense: Expense, restock: Restock, waste: Waste, reorder: Reorder, stockrep: StockReports, bulk: BulkPrice, dup: Dup, analytics: Analytics, cust: CustInsight, check: Checklist, tasks: Tasks, notes: Notes, calc: Calc, data: DataCenter, health: Health, prefs: Prefs2, help: Help }
export default function ToolsPage() {
  const [t, setT] = useState(null)
  const close = () => setT(null)
  const pick = (k) => { if (k === 'pal') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })); else setT(k) }
  const C = t ? M[t] : null
  return (
    <>
      {SEC.map(([h, items]) => (
        <div key={h}>
          <div className="tsec">{h}</div>
          <div className="tcards">{items.map(([k, l, i]) => <button key={k} className="raised tcard" onClick={() => pick(k)}><Icon n={i} s={24} />{l}</button>)}</div>
        </div>
      ))}
      {C && <C close={close} />}
    </>
  )
}
