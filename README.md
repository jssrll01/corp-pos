# RestoPOS

Offline-first point of sale. React + Vite, installable PWA, white neumorphic UI.

## Features
- Cash register: product grid, search by name or barcode, discount (% or fixed), cash / e-wallet / bank transfer, change, 58mm and 60mm receipts
- Orders: top sellers and history (newest first), reprint
- Management (PIN): product CRUD with images and optional stock, settings, backup/restore JSON, CSV export, revenue graph
- Works offline, data stays on the device (localStorage)
- License activation per business name

## Develop
    npm install
    npm run dev
    npm run build

## Deploy
Static host (Render Static Site, Netlify, Cloudflare Pages). Build command `npm run build`, publish directory `dist`. HTTPS is required for install and offline.

## Selling
Issue a key per customer: `sh tools/newcustomer.sh "Business Name"`. Keys are logged to `~/pos-licenses.txt`. Changing the salt in `src/license.js` invalidates every issued key, so back it up. Keep this repo private.
