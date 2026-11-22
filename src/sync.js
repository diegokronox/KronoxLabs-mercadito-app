import { db } from './db.js'
import { NEGOCIO } from './auth.js'

// URL del webhook n8n — configura aqui cuando estes en produccion
// Ejemplo: 'https://tudominio.com/webhook/sync-mercaito'
export const WEBHOOK_URL = ''

export async function encolar(tipo, dato) {
  if (!WEBHOOK_URL) return
  try {
    await db.cola_sync.add({
      negocio: NEGOCIO,
      tipo,
      dato: JSON.stringify(dato),
      enviado: false,
      fecha: new Date().toISOString()
    })
  } catch (e) {
    console.warn('No se pudo encolar:', e)
  }
}

export async function intentarSync() {
  if (!WEBHOOK_URL || !navigator.onLine) {
    actualizarIndicador(false)
    return
  }
  try {
    const pendientes = await db.cola_sync
      .where({ negocio: NEGOCIO, enviado: false })
      .toArray()
    if (!pendientes.length) {
      actualizarIndicador(true)
      return
    }
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ negocio: NEGOCIO, registros: pendientes }),
      signal: AbortSignal.timeout(6000)
    })
    if (res.ok) {
      for (const p of pendientes) {
        await db.cola_sync.update(p.id, { enviado: true })
      }
      actualizarIndicador(true)
    }
  } catch (e) {
    actualizarIndicador(false)
    console.warn('Sync no disponible:', e.message)
  }
}

export function actualizarIndicador(conectado) {
  const led = document.getElementById('syncLed')
  const txt = document.getElementById('syncTxt')
  if (!led || !txt) return
  led.className = 'sync-led' + (conectado ? ' ok' : '')
  txt.textContent = conectado
    ? 'Sincronizado con servidor'
    : WEBHOOK_URL ? 'Sin conexion — datos locales' : 'Modo local'
}

window.addEventListener('online',  () => intentarSync())
window.addEventListener('offline', () => actualizarIndicador(false))
