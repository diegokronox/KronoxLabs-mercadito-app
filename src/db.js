import Dexie from 'dexie'

export const db = new Dexie('KronoxPOS')

db.version(2).stores({
  productos: '++id, negocio, n, cat, price, cost, stock, expiry',
  ventas: '++id, negocio, date, time, total, method, cashAmount, transferAmount, received, change, employee, shift, status',
  facturas: '++id, negocio, date, supplier, invoice, total, lines',
  incidencias: '++id, negocio, date, product, type, desc, status',
  auditoria: '++id, negocio, date, action, detail, origin',
  cola_sync: '++id, negocio, tipo, datos, fecha, intentos'
})