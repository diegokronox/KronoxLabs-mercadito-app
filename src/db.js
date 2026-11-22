import Dexie from 'dexie'

export const db = new Dexie('MercaitoDB')

db.version(1).stores({
  productos:   '++id, negocio, n, cat',
  ventas:      '++id, negocio, date, status',
  facturas:    '++id, negocio, date',
  incidencias: '++id, negocio, status',
  auditoria:   '++id, negocio',
  cola_sync:   '++id, negocio, tipo, enviado'
})
