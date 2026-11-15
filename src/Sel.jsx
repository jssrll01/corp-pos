import { Children, useEffect, useRef, useState } from 'react'
export default function Sel({ value, onChange, children, className = 'input', style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const opts = Children.toArray(children).filter((c) => c && c.props).map((c) => ({ v: String(c.props.value ?? c.props.children), l: c.props.children }))
  const cur = opts.find((o) => o.v === String(value))
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [])
  return (
    <div ref={ref} className="sel" style={style}>
      <button type="button" className={className + ' selb'} onClick={() => setOpen(!open)}><span>{cur ? cur.l : ''}</span><i>▾</i></button>
      {open && <div className="sell">{opts.map((o) => <div key={o.v} className={'selo' + (o.v === String(value) ? ' on' : '')} onClick={() => { onChange && onChange({ target: { value: o.v } }); setOpen(false) }}>{o.l}</div>)}</div>}
    </div>
  )
}
