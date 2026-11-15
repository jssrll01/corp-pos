import { useStore, setState } from '../store.js'
import { getCart, setCart } from '../cart.js'
import { uid, money, audit } from '../inv.js'
const nav = (p) => window.dispatchEvent(new CustomEvent('pos-nav', { detail: p }))
const busy = () => getCart().items.length === 0 || window.confirm('Replace the order currently on the register?')
const tot = (its) => its.reduce((a, i) => a + i.price * i.qty, 0)
export default function Hold() {
  const st = useStore()
  const open = st.reservations.filter((r) => r.status === 'open')
  const resume = (p) => { if (!busy()) return; setCart(p.cart); setState((s) => ({ parked: s.parked.filter((x) => x.id !== p.id) })); audit('Parked sale resumed', '#' + p.no); nav('cashier') }
  const drop = (p) => { if (window.confirm('Discard this parked sale?')) { setState((s) => ({ parked: s.parked.filter((x) => x.id !== p.id) })); audit('Parked sale discarded', '#' + p.no) } }
  const claim = (r) => { if (!busy()) return; setCart({ items: r.items, level: r.level || 'retail', customer: r.customerId || '', dep: String(r.deposit || ''), resId: r.id, dtype: '%', dval: '', method: 'cash', received: '', note: 'Reservation #' + r.no, partial: false, redeem: '' }); nav('cashier') }
  const cancel = (r) => {
    if (!window.confirm('Cancel this reservation and refund the deposit?')) return
    setState((s) => ({ reservations: s.reservations.map((x) => (x.id === r.id ? { ...x, status: 'cancelled' } : x)), cashlog: r.deposit > 0 ? [{ id: uid(), date: new Date().toISOString(), type: 'out', amount: r.deposit, note: 'Reservation refund #' + r.no }, ...s.cashlog] : s.cashlog }))
    audit('Reservation cancelled', '#' + r.no)
  }
  return (
    <div className="grid" style={{ marginTop: 12 }}>
      <h3 style={{ margin: 0 }}>Parked sales</h3>
      {!st.parked.length && <p className="mut">No parked sales</p>}
      {st.parked.map((p) => (
        <div key={p.id} className="raised prow">
          <div className="pinfo"><b>#{p.no} {p.label}</b><small>{new Date(p.date).toLocaleString()} · {p.cart.items.length} lines · {money(tot(p.cart.items))} · {p.by}</small></div>
          <button className="btn pri" onClick={() => resume(p)}>Resume</button>
          <button className="btn bad" onClick={() => drop(p)}>Drop</button>
        </div>
      ))}
      <h3 style={{ margin: 0 }}>Reservations</h3>
      {!open.length && <p className="mut">No open reservations</p>}
      {open.map((r) => (
        <div key={r.id} className="raised prow">
          <div className="pinfo"><b>#{r.no} {r.name}</b><small>Pickup {r.pickup} · {r.phone || 'no phone'} · {money(tot(r.items))} · deposit {money(r.deposit)}</small></div>
          <button className="btn pri" onClick={() => claim(r)}>Sell</button>
          <button className="btn bad" onClick={() => cancel(r)}>Cancel</button>
        </div>
      ))}
    </div>
  )
}
