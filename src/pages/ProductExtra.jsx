import { useStore, getState } from '../store.js'
import { MAIN, num, tracked, qtyAt, put, take, mvRow, logMoves, audit } from '../inv.js'
import { Fld } from '../ui.jsx'
export const XEMPTY = { sku: '', cost: '', reorder: '', cat: '', trk: 'none', taxable: true, prices: {}, batch: '', exp: '' }
const awh = () => getState().settings.activeWh || MAIN
export const toF = (p) => ({ id: p.id, name: p.name, price: String(p.price), barcode: p.barcode || '', image: p.image || '', stock: tracked(p) ? String(qtyAt(p, awh())) : '', sku: p.sku || '', cost: p.cost == null ? '' : String(p.cost), reorder: p.reorder == null ? '' : String(p.reorder), cat: p.cat || '', trk: p.trk || 'none', taxable: p.taxable !== false, prices: { ...(p.prices || {}) }, batch: '', exp: '' })
export const mkRow = (f, old, uid, name, price, barcode) => {
  const wh = awh()
  let p = { ...(old || {}), id: f.id || uid(), name, price, barcode, image: f.image, sku: f.sku.trim(), cost: num(f.cost), reorder: f.reorder === '' ? '' : num(f.reorder), cat: f.cat.trim(), trk: f.trk, taxable: f.taxable, prices: Object.fromEntries(Object.entries(f.prices).filter(([k, v]) => num(v) > 0).map(([k, v]) => [k, num(v)])) }
  if (f.stock === '') { p.stock = ''; p.lots = [] } else {
    const want = Math.max(0, parseInt(f.stock, 10) || 0)
    const was = old && tracked(old)
    if (!was) { p.stock = 0; p.lots = [] }
    const d = want - (was ? qtyAt(old, wh) : 0)
    if (d > 0) p = put(p, wh, d, f.batch.trim(), f.exp)
    else if (d < 0) p = take(p, -d, wh).p
    if (d) logMoves([mvRow(old ? 'adjust' : 'opening', p, wh, d, old ? 'Edited in product form' : 'Opening stock')])
  }
  audit(old ? 'Product edited' : 'Product added', name)
  return p
}
export default function ProductExtra({ f, setF }) {
  const { levels } = useStore()
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  return (
    <div className="grid">
      <div className="row2"><input className="input" placeholder="SKU" value={f.sku} onChange={(e) => set('sku', e.target.value)} /><button className="btn" onClick={() => set('sku', 'SKU-' + Date.now().toString(36).toUpperCase().slice(-6))}>Auto SKU</button></div>
      <div className="row2">
        <input className="input" type="number" inputMode="decimal" min="0" placeholder="Cost price" value={f.cost} onChange={(e) => set('cost', e.target.value)} />
        <input className="input" type="number" inputMode="numeric" min="0" placeholder="Reorder level" value={f.reorder} onChange={(e) => set('reorder', e.target.value)} />
      </div>
      <div className="row2">
        <input className="input" placeholder="Category" value={f.cat} onChange={(e) => set('cat', e.target.value)} />
        <select className="input" value={f.trk} onChange={(e) => set('trk', e.target.value)}><option value="none">No batch or serial</option><option value="batch">Batch / lot</option><option value="serial">Serial number</option></select>
      </div>
      {levels.map((l) => <input key={l.id} className="input" type="number" inputMode="decimal" min="0" placeholder={l.name + ' price (blank = retail)'} value={f.prices[l.id] || ''} onChange={(e) => setF((x) => ({ ...x, prices: { ...x.prices, [l.id]: e.target.value } }))} />)}
      <div className="row2">
        <input className="input" placeholder="Batch no (for added stock)" value={f.batch} onChange={(e) => set('batch', e.target.value)} />
        <Fld l="Expiry (for added stock)"><input className="input" type="date" value={f.exp} onChange={(e) => set('exp', e.target.value)} /></Fld>
      </div>
      <label className="lbl"><span><input type="checkbox" checked={f.taxable} onChange={(e) => set('taxable', e.target.checked)} /> Taxable item</span></label>
    </div>
  )
}
