import { webcrypto } from 'node:crypto'
import { makeKey } from '../src/license.js'
if (!globalThis.crypto) globalThis.crypto = webcrypto
const n = process.argv.slice(2).join(' ')
if (!n.trim()) { console.log('usage: node tools/keygen.mjs "Business Name"'); process.exit(1) }
console.log(await makeKey(n))
