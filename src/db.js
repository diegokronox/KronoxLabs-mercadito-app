import Dexie from 'dexie'

// Crear la base de datos que va a vivir en el teléfono del cliente
export const db = new Dexie('MercaditoDB')

db.version(1).stores({
  // Tabla de productos del inventario
  // ++ significa que el id se genera automático
  productos: '++id, nombre, precio, stock, categoria, caducidad',

  // Tabla donde se guarda cada venta registrada
  ventas: '++id, fecha, total, metodoPago',

  // Tabla de cada producto dentro de una venta
  // (una venta puede tener varios productos)
  ventaItems: '++id, ventaId, productoId, cantidad, precioUnitario',

  // Cola de operaciones pendientes de sincronizar
  // cuando no hay internet, todo espera aquí
  cola_sync: '++id, tipo, datos, fecha, intentos'
})
console.log('dexie funciona')