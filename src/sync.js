import { db } from './db.js'
import { getTenant } from './auth.js'

const WEBHOOK_URL = 'http://localhost:5678/webhook/sync-pos'

export async function encolar(tipo, datos) {
  const negocio = getTenant()
  await db.cola_sync.add({
    negocio, tipo, datos,
    fecha: new Date().toISOString(),
    intentos: 0
  })
  await intentarSync()
}

export async function intentarSync() {
  if (!navigator.onLine) {
    actualizarIndicador()
    return
  }
  const negocio = getTenant()
  const pendientes = await db.cola_sync.where('negocio').equals(negocio).toArray()

  for (const op of pendientes) {
    try {
      const respuesta = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(op)
      })
      if (respuesta.ok) {
        await db.cola_sync.delete(op.id)
      }
    } catch (error) {
      await db.cola_sync.update(op.id, { intentos: op.intentos + 1 })
      break 
    }
  }
  actualizarIndicador()
}

export async function actualizarIndicador() {
  const negocio = getTenant()
  const pendientes = await db.cola_sync.where('negocio').equals(negocio).count()
  
  // Busca el circulito de sync en el HTML nuevo
  const led = document.querySelector('.led')
  const txt = document.querySelector('.sync span:last-child')
  
  if (!led || !txt) return

  if (pendientes === 0 && navigator.onLine) {
    led.style.background = '#059669'
    txt.textContent = 'Sincronizado'
  } else if (pendientes > 0) {
    led.style.background = '#d97706'
    txt.textContent = pendientes + ' operaciones pendientes'
  } else {
    led.style.background = '#6b7280'
    txt.textContent = 'Sin conexión — datos locales'
  }
}

window.addEventListener('online', intentarSync)
setInterval(() => { if (navigator.onLine) intentarSync() }, 30000)