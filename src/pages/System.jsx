import { useState } from 'react'
import { useStore, setState } from '../store.js'
import { num, audit } from '../inv.js'
import { Tabs, Crud, Form } from '../ui.jsx'
import SelfTest from './SelfTest.jsx'
const sv = (label, fn) => (d) => { setState((s) => ({ settings: { ...s.settings, ...fn(d) } })); audit('Settings: ' + label) }
function General() {
  const { settings: S, branches, warehouses } = useStore()
  return (
    <div className="grid">
      <Form init={{ activeBranch: S.activeBranch || 'main', activeWh: S.activeWh || 'main' }}
        fields={[{ k: 'activeBranch', l: 'Active branch', t: 'select', o: branches.map((b) => [b.id, b.name]) }, { k: 'activeWh', l: 'Active warehouse (sales deduct from here)', t: 'select', o: warehouses.map((w) => [w.id, w.name]) }]}
        onSave={sv('location', (d) => ({ activeBranch: d.activeBranch, activeWh: d.activeWh }))} />
      <Form init={{ taxName: S.taxName || 'VAT', tax: S.tax, taxIncl: !!S.taxIncl, lowStock: S.lowStock, expDays: S.expDays, expCats: S.expCats }}
        fields={[{ k: 'taxName', l: 'Tax name' }, { k: 'tax', l: 'Tax rate %', t: 'number' }, { k: 'taxIncl', l: 'Prices already include tax', t: 'check' }, { k: 'lowStock', l: 'Default low stock level', t: 'number' }, { k: 'expDays', l: 'Expiry warning (days)', t: 'number' }, { k: 'expCats', l: 'Expense categories (comma separated)' }]}
        onSave={sv('tax and stock', (d) => ({ taxName: d.taxName, tax: num(d.tax), taxIncl: !!d.taxIncl, lowStock: num(d.lowStock), expDays: num(d.expDays), expCats: d.expCats }))} />
    </div>
  )
}
function Loyalty() {
  const L = useStore().settings.loyalty || {}
  return (
    <Form init={{ on: !!L.on, per: L.per ?? 100, value: L.value ?? 1 }}
      fields={[{ k: 'on', l: 'Enable loyalty points', t: 'check' }, { k: 'per', l: 'Spend this much to earn 1 point', t: 'number' }, { k: 'value', l: 'Value of 1 point when redeemed', t: 'number' }]}
      onSave={sv('loyalty', (d) => ({ loyalty: { on: !!d.on, per: num(d.per) || 100, value: num(d.value) || 1 } }))} />
  )
}
function Receipt() {
  const S = useStore().settings
  const R = S.rcpt || {}
  return (
    <Form init={{ paper: String(S.paper || 58), size: R.size || 11, head: R.head || '', foot: R.foot || '', logo: R.logo !== false, tax: R.tax !== false, sku: !!R.sku, cashier: R.cashier !== false, customer: R.customer !== false }}
      fields={[{ k: 'paper', l: 'Default paper', t: 'select', o: [['58', '58mm'], ['60', '60mm'], ['short', 'Short bond'], ['long', 'Long bond'], ['a4', 'A4']] }, { k: 'size', l: 'Font size (px)', t: 'number' }, { k: 'head', l: 'Header lines (under shop name)', t: 'area' }, { k: 'foot', l: 'Footer message' }, { k: 'logo', l: 'Show logo', t: 'check' }, { k: 'tax', l: 'Show tax line', t: 'check' }, { k: 'sku', l: 'Show SKU', t: 'check' }, { k: 'cashier', l: 'Show cashier', t: 'check' }, { k: 'customer', l: 'Show customer', t: 'check' }]}
      onSave={sv('receipt', (d) => ({ paper: isNaN(+d.paper) ? d.paper : +d.paper, rcpt: { size: num(d.size) || 11, head: d.head, foot: d.foot, logo: !!d.logo, tax: !!d.tax, sku: !!d.sku, cashier: !!d.cashier, customer: !!d.customer } }))} />
  )
}
function Discounts() {
  const { products, levels } = useStore()
  const lv = [['any', 'Any level'], ['retail', 'Retail'], ...levels.map((l) => [l.id, l.name])]
  return (
    <Crud coll="discounts" title="Discount" empty={{ on: true, kind: 'order', mode: '%', level: 'any', min: 0, value: 0, pid: '' }}
      fields={[{ k: 'name', l: 'Name', req: true }, { k: 'kind', l: 'Type', t: 'select', o: [['order', 'Conditional (order total at least Min)'], ['bulk', 'Bulk (item qty at least Min)']] }, { k: 'mode', l: 'Mode', t: 'select', o: [['%', 'Percentage'], ['fix', 'Fixed amount']] }, { k: 'value', l: 'Value', t: 'number', req: true }, { k: 'min', l: 'Minimum (order total or item qty)', t: 'number' }, { k: 'pid', l: 'Bulk: only this product', t: 'select', o: [['', 'All products'], ...products.map((p) => [p.id, p.name])] }, { k: 'level', l: 'Price level', t: 'select', o: lv }, { k: 'on', l: 'Active', t: 'check' }]}
      line={(r) => (r.kind === 'bulk' ? 'Bulk' : 'Conditional') + ' · ' + r.value + (r.mode === '%' ? '%' : ' fixed') + ' · min ' + (r.min || 0) + (r.on === false ? ' · OFF' : '')} />
  )
}
const TABS = [['gen', 'General'], ['loy', 'Loyalty'], ['rcpt', 'Receipt'], ['br', 'Branches'], ['wh', 'Warehouses'], ['lv', 'Price levels'], ['disc', 'Discounts'], ['test', 'Self-test']]
export default function System() {
  const { branches } = useStore()
  const [t, setT] = useState('gen')
  return (
    <div>
      <Tabs v={t} on={setT} items={TABS} />
      {t === 'gen' && <General />}
      {t === 'loy' && <Loyalty />}
      {t === 'rcpt' && <Receipt />}
      {t === 'br' && <Crud coll="branches" title="Branch" fields={[{ k: 'name', l: 'Branch name', req: true }, { k: 'address', l: 'Address' }, { k: 'phone', l: 'Phone' }]} line={(r) => [r.address, r.phone].filter(Boolean).join(' · ')} />}
      {t === 'wh' && <Crud coll="warehouses" title="Warehouse" empty={{ branchId: 'main' }} fields={[{ k: 'name', l: 'Warehouse name', req: true }, { k: 'branchId', l: 'Branch', t: 'select', o: branches.map((b) => [b.id, b.name]) }]} line={(r) => (branches.find((b) => b.id === r.branchId) || {}).name || ''} />}
      {t === 'lv' && <Crud coll="levels" title="Price level" fields={[{ k: 'name', l: 'Level name (e.g. Distributor)', req: true }]} line={() => 'Set its prices in each product form'} />}
      {t === 'disc' && <Discounts />}
      {t === 'test' && <SelfTest />}
    </div>
  )
}
