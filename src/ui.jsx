import Sel from './Sel.jsx'
import { useState } from 'react'
import { useStore, setState } from './store.js'
import { uid, num, csv, dl, audit } from './inv.js'
import { printReceipt, printDoc } from './print.js'
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
export const Tabs = ({ v, on, items }) => <div className="seg tabs">{items.map(([k, l]) => <button key={k} className={'btn' + (v === k ? ' on' : '')} onClick={() => on(k)}>{l}</button>)}</div>
export const Fld = ({ l, children }) => <label className="lbl">{l}{children}</label>
export const Modal = ({ title, onClose, children }) => (
  <div className="overlay"><div className="modal raised tl"><div className="sheethd"><h2>{title}</h2><button className="btn" onClick={onClose}>Close</button></div>{children}</div></div>
)
export const inp = (x, f, set) => {
  const v = f[x.k] ?? ''
  if (x.t === 'select') return <Sel className="input" value={v} onChange={(e) => set(x.k, e.target.value)}>{x.o.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</Sel>
  if (x.t === 'check') return <input type="checkbox" checked={!!f[x.k]} onChange={(e) => set(x.k, e.target.checked)} />
  if (x.t === 'area') return <textarea className="input" rows="3" value={v} onChange={(e) => set(x.k, e.target.value)} />
  return <input className="input" type={x.t || 'text'} inputMode={x.t === 'number' ? 'decimal' : undefined} value={v} onChange={(e) => set(x.k, e.target.value)} />
}
export function Tbl({ name, cols, rows }) {
  const data = rows.map((r) => cols.map((c) => c[1](r)))
  const exp = () => dl(name + '.csv', csv([cols.map((c) => c[0]), ...data]))
  const pr = () => printDoc('<h3>' + esc(name) + '</h3><table><tr>' + cols.map((c) => '<th>' + esc(c[0]) + '</th>').join('') + '</tr>' + data.map((r) => '<tr>' + r.map((v) => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</table>', 'A4', 'body{padding:12mm;font-size:12px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:3px 6px;text-align:left}')
  return (
    <div className="raised mpanel">
      <div className="sheethd"><b>{name}</b><span className="row2"><button className="btn" onClick={exp}>CSV</button><button className="btn" onClick={pr}>Print</button></span></div>
      <div className="tblw"><table className="tbl"><thead><tr>{cols.map((c, i) => <th key={i}>{c[0]}</th>)}</tr></thead><tbody>{data.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div>
      {!rows.length && <small className="mut">No records</small>}
    </div>
  )
}
export function PrintBtns({ o }) {
  const { settings } = useStore()
  return <div className="seg wrap">{[[58, '58mm'], [60, '60mm'], ['short', 'Short'], ['long', 'Long'], ['a4', 'A4']].map(([k, l]) => <button key={k} className="btn" onClick={() => printReceipt(o, settings, k)}>{l}</button>)}</div>
}
export function Form({ init, fields, onSave }) {
  const [d, setD] = useState(init)
  const [ok, setOk] = useState(false)
  const set = (k, v) => { setD((x) => ({ ...x, [k]: v })); setOk(false) }
  return (
    <div className="raised mpanel">
      {fields.map((x) => <Fld key={x.k} l={x.l}>{inp(x, d, set)}</Fld>)}
      <button className="btn pri" onClick={() => { onSave(d); setOk(true) }}>Save</button>
      {ok && <small style={{ color: 'var(--ok)' }}>Saved</small>}
    </div>
  )
}
export function Crud({ coll, title, fields, line, empty = {}, after }) {
  const st = useStore()
  const list = st[coll]
  const [f, setF] = useState(null)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const save = () => {
    const miss = fields.find((x) => x.req && !String(f[x.k] ?? '').trim())
    if (miss) return window.alert(miss.l + ' is required')
    const rec = { ...f, id: f.id || uid() }
    fields.forEach((x) => { if (x.t === 'number') rec[x.k] = num(f[x.k]) })
    setState((s) => ({ [coll]: f.id ? s[coll].map((r) => (r.id === f.id ? rec : r)) : [rec, ...s[coll]] }))
    audit(title + (f.id ? ' updated' : ' added'), rec.name || rec.desc || '')
    setF(null)
  }
  const del = (r) => {
    if (r.id === 'main') return window.alert('The default record cannot be deleted')
    if (window.confirm('Delete this ' + title.toLowerCase() + '?')) { setState((s) => ({ [coll]: s[coll].filter((x) => x.id !== r.id) })); audit(title + ' deleted', r.name || r.desc || '') }
  }
  return (
    <div className="grid">
      {f ? (
        <div className="raised mpanel">
          <h3 style={{ margin: 0 }}>{f.id ? 'Edit' : 'Add'} {title}</h3>
          {fields.map((x) => <Fld key={x.k} l={x.l}>{inp(x, f, set)}</Fld>)}
          <div className="row2"><button className="btn" onClick={() => setF(null)}>Cancel</button><button className="btn pri" onClick={save}>Save</button></div>
        </div>
      ) : <button className="btn pri" onClick={() => setF({ ...empty })}>+ Add {title}</button>}
      {list.map((r) => (
        <div key={r.id} className="raised prow">
          <div className="pinfo"><b>{r.name || r.desc}</b><small>{line(r)}</small></div>
          <button className="btn" onClick={() => setF({ ...r })}>Edit</button>
          <button className="btn bad" onClick={() => del(r)}>Delete</button>
        </div>
      ))}
      {!list.length && <p className="mut">No records yet</p>}
      {after}
    </div>
  )
}
