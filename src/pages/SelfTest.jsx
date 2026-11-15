import { useState } from 'react'
import { calcSale } from '../inv.js'
const base = (o = {}) => ({ items: [{ id: 'a', name: 'A', price: 100, qty: 2 }], dtype: '%', dval: '', method: 'cash', received: '', level: 'retail', redeem: '', dep: '', ...o })
const S = (o = {}) => ({ settings: { tax: 12, taxIncl: false, loyalty: {}, ...o }, products: [], discounts: [] })
const run = () => {
  const T = []
  const eq = (n, got, want) => T.push([n, got, want, Math.abs(got - want) < 0.005])
  eq('Tax exclusive total (200 + 12%)', calcSale(base(), S(), null).total, 224)
  eq('Tax exclusive tax', calcSale(base(), S(), null).tax, 24)
  eq('Tax inclusive total (112)', calcSale(base({ items: [{ id: 'a', name: 'A', price: 112, qty: 1 }] }), S({ taxIncl: true }), null).total, 112)
  eq('Tax inclusive tax part', calcSale(base({ items: [{ id: 'a', name: 'A', price: 112, qty: 1 }] }), S({ taxIncl: true }), null).tax, 12)
  eq('10% manual discount total', calcSale(base({ dval: '10' }), S(), null).total, 201.6)
  eq('Fixed 50 discount total', calcSale(base({ dtype: 'fix', dval: '50' }), S(), null).total, 168)
  const st = S(); st.discounts = [{ kind: 'bulk', mode: '%', value: 10, min: 2, on: true }]
  eq('Bulk 10% at qty 2 total', calcSale(base(), st, null).total, 201.6)
  const st2 = S(); st2.discounts = [{ kind: 'order', mode: 'fix', value: 20, min: 150, on: true }]
  eq('Conditional 20 off at 150+ total', calcSale(base(), st2, null).total, 201.6)
  eq('Partial payment balance', calcSale(base({ received: '100' }), S(), null).balance, 124)
  eq('Cash change', calcSale(base({ received: '300' }), S(), null).change, 76)
  eq('Deposit 50 then pay rest', calcSale(base({ dep: '50', received: '174' }), S(), null).balance, 0)
  const lo = S({ loyalty: { on: true, per: 100, value: 1 } })
  eq('Loyalty redeem 10 pts', calcSale(base({ redeem: '10' }), lo, { points: 50 }).total, 212.8)
  return T
}
export default function SelfTest() {
  const [r, setR] = useState(null)
  const ok = r && r.every((x) => x[3])
  return (
    <div className="raised mpanel">
      <h3 style={{ margin: 0 }}>Calculation self-test</h3>
      <button className="btn pri" onClick={() => setR(run())}>Run tests</button>
      {r && <b style={{ color: ok ? 'var(--ok)' : 'var(--bad)' }}>{ok ? 'All ' + r.length + ' passed' : r.filter((x) => !x[3]).length + ' failed'}</b>}
      {r && r.map((x, i) => <div key={i} className="sumline"><span>{x[3] ? 'PASS' : 'FAIL'} · {x[0]}</span><span>{x[3] ? x[1] : 'got ' + x[1] + ', want ' + x[2]}</span></div>)}
    </div>
  )
}
