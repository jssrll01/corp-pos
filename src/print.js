import { MLABEL, ono } from './cart.js'
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
export function printDoc(inner, size, css = '') {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>@page{size:${size};margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}${css}</style></head><body>${inner}</body></html>`
  const fr = document.createElement('iframe')
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(fr)
  const d = fr.contentWindow.document
  d.open(); d.write(html); d.close()
  setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print() } catch (e) {} setTimeout(() => fr.remove(), 60000) }, 400)
}
const PAGE = { short: '8.5in 11in', long: '8.5in 13in', a4: 'A4' }
export function printReceipt(o, st, paper) {
  const R = st.rcpt || {}
  const pp = paper == null ? st.paper || 58 : isNaN(+paper) ? paper : +paper
  const f = (n) => st.currency + Number(n || 0).toFixed(2)
  const fs = R.size || 11
  const foot = esc(R.foot || st.footer || 'Thank you! Come again.')
  const head = (R.head || '').split('\n').filter(Boolean).map((l) => `<div class="c">${esc(l)}</div>`).join('')
  const logo = R.logo !== false && st.logo ? `<img src="${st.logo}" style="max-width:40%;max-height:14mm;display:block;margin:0 auto 2mm">` : ''
  const addr = (st.address ? `<div class="c">${esc(st.address)}</div>` : '') + (st.phone ? `<div class="c">${esc(st.phone)}</div>` : '')
  const disc = o.disc > 0 ? `<div class="r"><span>Discount</span><span>-${f(o.disc)}</span></div>` : ''
  const tax = R.tax !== false ? `<div class="r"><span>${esc(o.taxName || 'Tax')} (${o.taxPct}%${o.taxIncl ? ' incl.' : ''})</span><span>${f(o.tax)}</span></div>` : ''
  const pay = `<div class="r"><span>Payment</span><span>${esc(MLABEL[o.method] || o.method)}</span></div>` + (o.method === 'cash' ? `<div class="r"><span>Cash</span><span>${f(o.received)}</span></div><div class="r"><span>Change</span><span>${f(o.change)}</span></div>` : '') + (o.balance > 0 ? `<div class="r b"><span>Paid</span><span>${f(o.paid)}</span></div><div class="r b"><span>Balance due</span><span>${f(o.balance)}</span></div>` : '') + (o.earned ? `<div class="r"><span>Points earned</span><span>${o.earned}</span></div>` : '')
  const meta = (R.cashier !== false && o.by ? `<div>Cashier: ${esc(o.by)}</div>` : '') + (R.customer !== false && o.customerName ? `<div>Customer: ${esc(o.customerName)}</div>` : '')
  const note = o.note ? `<div>Note: ${esc(o.note)}</div>` : ''
  const amt = (i) => i.qty * i.price - (i.bulk || 0)
  if (pp === 58 || pp === 60) {
    const items = o.items.map((i) => `<div class="b">${esc(i.name)}${R.sku && i.sku ? ' [' + esc(i.sku) + ']' : ''}</div><div class="r"><span>${i.qty} x ${f(i.price)}</span><span>${f(amt(i))}</span></div>`).join('')
    printDoc(`${logo}<div class="c b" style="font-size:${fs + 3}px">${esc(st.name)}</div>${addr}${head}<div class="c">${new Date(o.date).toLocaleString()}</div><div class="c">Order ${ono(o.no)}</div>${meta}<hr>${items}<hr><div class="r"><span>Sub Total</span><span>${f(o.sub)}</span></div>${disc}${tax}<div class="r t"><span>TOTAL</span><span>${f(o.total)}</span></div><hr>${pay}${note}<hr><div class="c">${foot}</div>`, pp + 'mm auto', `body{width:${pp}mm;padding:3mm;font:${fs}px/1.4 monospace;color:#000}.c{text-align:center}.b{font-weight:700}.r{display:flex;justify-content:space-between;gap:6px}hr{border:0;border-top:1px dashed #000;margin:2mm 0}.t{font-size:${fs + 3}px;font-weight:700}`)
  } else {
    const rows = o.items.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.name)}</td><td>${esc(i.sku || '')}</td><td class="n">${i.qty}</td><td class="n">${f(i.price)}</td><td class="n">${f(amt(i))}</td></tr>`).join('')
    printDoc(`<div class="pg">${logo}<div class="c b" style="font-size:20px">${esc(st.name)}</div>${addr}${head}<h2 class="c">${pp === 'a4' ? 'INVOICE' : 'SALES RECEIPT'} ${ono(o.no)}</h2><div class="r"><span>${new Date(o.date).toLocaleString()}</span><span>${esc(o.customerName ? 'Customer: ' + o.customerName : '')}</span></div>${meta}<table><tr><th>#</th><th>Item</th><th>SKU</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Amount</th></tr>${rows}</table><div class="tot"><div class="r"><span>Sub Total</span><span>${f(o.sub)}</span></div>${disc}${tax}<div class="r b" style="font-size:16px"><span>TOTAL</span><span>${f(o.total)}</span></div>${pay}${note}</div><p class="c" style="margin-top:12mm">${foot}</p></div>`, PAGE[pp] || 'A4', `.pg{padding:14mm;font-size:${fs + 2}px}.c{text-align:center}.b{font-weight:700}.r{display:flex;justify-content:space-between;gap:12px}table{width:100%;border-collapse:collapse;margin:6mm 0}th,td{border-bottom:1px solid #999;padding:4px 6px;text-align:left}.n{text-align:right}.tot{width:55%;margin-left:auto}`)
  }
}
