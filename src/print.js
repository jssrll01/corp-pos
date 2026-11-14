import { MLABEL, ono } from './cart.js'
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
export function printReceipt(o, st, mm) {
  const f = (n) => st.currency + Number(n).toFixed(2)
  const items = o.items.map((i) => `<div class="b">${esc(i.name)}</div><div class="r"><span>${i.qty} x ${f(i.price)}</span><span>${f(i.qty * i.price)}</span></div>`).join('')
  const disc = o.disc > 0 ? `<div class="r"><span>Discount${o.dtype === '%' ? ' (' + o.dval + '%)' : ''}</span><span>-${f(o.disc)}</span></div>` : ''
  const cash = o.method === 'cash' ? `<div class="r"><span>Cash</span><span>${f(o.received)}</span></div><div class="r"><span>Change</span><span>${f(o.change)}</span></div>` : ''
  const note = o.note ? `<hr><div>Note: ${esc(o.note)}</div>` : ''
  const logo = st.logo ? `<img src="${st.logo}" style="max-width:40%;max-height:14mm;display:block;margin:0 auto 2mm">` : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>@page{size:${mm}mm auto;margin:0}*{box-sizing:border-box}body{margin:0;width:${mm}mm;padding:3mm;font:11px/1.4 monospace;color:#000}.c{text-align:center}.b{font-weight:700}.r{display:flex;justify-content:space-between;gap:6px}hr{border:0;border-top:1px dashed #000;margin:2mm 0}.t{font-size:14px;font-weight:700}</style></head><body>${logo}<div class="c b" style="font-size:14px">${esc(st.name)}</div>${st.address ? '<div class="c">' + esc(st.address) + '</div>' : ''}${st.phone ? '<div class="c">' + esc(st.phone) + '</div>' : ''}<div class="c">${new Date(o.date).toLocaleString()}</div><div class="c">Order ${ono(o.no)}</div><hr>${items}<hr><div class="r"><span>Sub Total</span><span>${f(o.sub)}</span></div>${disc}<div class="r"><span>Tax (${o.taxPct}%)</span><span>${f(o.tax)}</span></div><div class="r t"><span>TOTAL</span><span>${f(o.total)}</span></div><hr><div class="r"><span>Payment</span><span>${MLABEL[o.method]}</span></div>${cash}${note}<hr><div class="c">${esc(st.footer || 'Thank you! Come again.')}</div></body></html>`
  const fr = document.createElement('iframe')
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(fr)
  const d = fr.contentWindow.document
  d.open(); d.write(html); d.close()
  setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print() } catch (e) {} setTimeout(() => fr.remove(), 60000) }, 400)
}
