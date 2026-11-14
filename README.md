# RestoPOS

Offline-first point of sale. React + Vite, installable PWA, white neumorphic UI.

## Features
- Cash register: product grid, search by name or barcode, discount (% or fixed), cash / e-wallet / bank transfer, change, 58mm and 60mm receipts
- Orders: top sellers and history (newest first), reprint
- Management (PIN): product CRUD with images and optional stock, settings, backup/restore JSON, CSV export, revenue graph
- Works offline, data stays on the device (localStorage)
- Activation key screen on first open (default key, manager can set their own)

## Develop
    npm install
    npm run dev
    npm run build

## Deploy
Static host (Render Static Site, Netlify, Cloudflare Pages). Build command `npm run build`, publish directory `dist`. HTTPS is required for install and offline.

## Selling
Default activation key is `1010-0707-1010-0707`. The manager can set their own key in Management > Settings > Activation key. The key is asked once per device on first open. Keep this repo private.
