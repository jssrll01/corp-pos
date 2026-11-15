const P = {
  register: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></>,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>,
  box: <><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></>,
  users: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 4.5 1.8 4.5 4.5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/></>,
  tag: <><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/></>,
  warehouse: <><path d="M3 21V9l9-5 9 5v12"/><path d="M8 21v-7h8v7"/></>,
  coin: <><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.6-1-1.6-1.5-2.7-1.5-1.5 0-2.5.8-2.5 2 0 3 5.4 1.5 5.4 4.5 0 1.2-1.1 2-2.7 2-1.2 0-2.2-.5-2.8-1.5M12 6v2M12 16v2"/></>,
  report: <><path d="M6 3h9l4 4v14H6z"/><path d="M9 17v-4M12 17v-6M15 17v-3"/></>,
  cog: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></>,
  sliders: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></>,
  db: <><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
  chart: <><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></>,
  close: <path d="M6 6l12 12M18 6L6 18"/>,
  gift: <><rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9M12 8v13M12 8c-2 0-4-1-4-3s3-2 4 3c1-5 4-5 4-3s-2 3-4 3"/></>,
  ticket: <><path d="M3 7h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4z"/><path d="M14 7v10"/></>,
  barcode: <path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20 5v14"/>,
  star: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
  rotate: <><path d="M4 12a8 8 0 0114-5M20 4v4h-4M20 12a8 8 0 01-14 5M4 20v-4h4"/></>,
}
export default function Icon({ n, s = 20 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>{P[n]}</svg>
}
