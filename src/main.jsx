import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './corp.css'
import './corp2.css'
import { applyPrefs, migrate } from './fx.js'
import { Boundary } from './Biz2.jsx'
applyPrefs()
migrate()
try { navigator.storage && navigator.storage.persist && navigator.storage.persist() } catch (e) {}
createRoot(document.getElementById('root')).render(<Boundary><App /></Boundary>)
