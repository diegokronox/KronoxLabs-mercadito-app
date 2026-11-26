import { db, NEGOCIO, PIN_ADMIN } from './db.js'

export let currentEmployee = null

export function isAdmin() {
  return sessionStorage.getItem('mercaito_role') === 'admin'
}

export function getEmployee() {
  const raw = sessionStorage.getItem('mercaito_employee')
  return raw ? JSON.parse(raw) : null
}

export function loginAdmin(pin) {
  if (pin !== PIN_ADMIN) return false
  sessionStorage.setItem('mercaito_role', 'admin')
  sessionStorage.removeItem('mercaito_employee')
  return true
}

export async function loginEmployee(empleadoId, pin) {
  const emp = await db.empleados.get(empleadoId)
  if (!emp || !emp.activo || emp.pin !== pin) return false
  sessionStorage.setItem('mercaito_role', 'employee')
  sessionStorage.setItem('mercaito_employee', JSON.stringify({
    id: emp.id,
    nombre: emp.nombre,
    telefono: emp.telefono,
    fechaInicio: emp.fechaInicio
  }))
  return true
}

export function logout() {
  sessionStorage.removeItem('mercaito_role')
  sessionStorage.removeItem('mercaito_employee')
}
