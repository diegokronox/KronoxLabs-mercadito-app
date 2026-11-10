export function getTenant() {
  const params = new URLSearchParams(window.location.search)
  return params.get('negocio') || 'fabian'
}

export function verificarPin(pin) {
  return pin === '1234'
}