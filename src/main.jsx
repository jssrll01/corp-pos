import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './corp.css'
import { applyPrefs, snapshot } from './fx.js'
applyPrefs()
snapshot()
createRoot(document.getElementById('root')).render(<App />)
