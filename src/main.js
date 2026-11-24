import './style.css'
import { db } from './db.js'
import { NEGOCIO, PIN_ADMIN } from './auth.js'
import { encolar, intentarSync, actualizarIndicador } from './sync.js'

// ── CATEGORIAS ─────────────────────────────────────────────────────────
const CATS = ['Alimentos','Bebidas','Lácteos','Cárnicos','Aseo','Limpieza','Dulcería','Café','Bazar']

// ── DATOS SEMILLA ──────────────────────────────────────────────────────
const SEED = [
  {negocio:NEGOCIO,n:'Arroz',cat:'Alimentos',price:2.50,cost:1.70,stock:45,expiry:'2026-12-01'},
  {negocio:NEGOCIO,n:'Frijoles negros',cat:'Alimentos',price:3,cost:2.1,stock:30,expiry:'2026-11-15'},
  {negocio:NEGOCIO,n:'Aceite girasol',cat:'Alimentos',price:4.5,cost:3.4,stock:8,expiry:'2027-03-01'},
  {negocio:NEGOCIO,n:'Refresco',cat:'Bebidas',price:1.5,cost:1,stock:60,expiry:'2026-10-30'},
  {negocio:NEGOCIO,n:'Cerveza',cat:'Bebidas',price:2,cost:1.35,stock:3,expiry:'2027-01-01'},
  {negocio:NEGOCIO,n:'Agua mineral',cat:'Bebidas',price:1,cost:.55,stock:0,expiry:'2027-06-01'},
  {negocio:NEGOCIO,n:'Leche en polvo',cat:'Lacteos',price:5,cost:3.8,stock:15,expiry:'2026-12-20'},
  {negocio:NEGOCIO,n:'Jabón de baño',cat:'Aseo',price:1.8,cost:1.1,stock:22,expiry:'2028-01-01'},
  {negocio:NEGOCIO,n:'Detergente',cat:'Limpieza',price:3.5,cost:2.4,stock:12,expiry:'2028-06-01'},
  {negocio:NEGOCIO,n:'Pasta de tomate',cat:'Alimentos',price:1.2,cost:.8,stock:40,expiry:'2026-11-01'},
]

// ── NAVEGACION ─────────────────────────────────────────────────────────
const ADMIN_NAV = [
  ['dashboard','Resumen','<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'],
  ['inventory','Inventario','<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'],
  ['purchases','Compras','<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'],
  ['reports','Reportes','<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'],
  ['issues','Incidencias','<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'],
  ['audit','Auditoría','<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'],
]
const EMP_NAV = [
  ['sale','Nueva venta','<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'],
  ['history','Mis ventas','<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>'],
  ['issues','Reportar','<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'],
]
const TITLES = {
  dashboard:'Resumen general', inventory:'Inventario', purchases:'Compras y facturas',
  reports:'Reportes', issues:'Incidencias', audit:'Auditoría',
  sale:'Nueva venta', history:'Mis ventas'
}

// ── ESTADO GLOBAL ──────────────────────────────────────────────────────
let products=[], sales=[], purchases=[], issues=[], auditLog=[]
let role='employee', currentPage='sale', cart=[], saleCat='Todos'
let draftLines=[], payMethod='cash', editingSaleId=null, pinBuffer=''

// ── UTILS ──────────────────────────────────────────────────────────────
const $      = id => document.getElementById(id)
const money  = n  => 'CUP ' + Number(n || 0).toFixed(2)
const dateISO = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'})
const stamp   = () => new Date().toLocaleString('es')

// ── CARGA DE DATOS ─────────────────────────────────────────────────────
async function cargarDatos() {
  products  = await db.productos.where('negocio').equals(NEGOCIO).toArray()
  if (!products.length) {
    for (const p of SEED) await db.productos.add(p)
    products = await db.productos.where('negocio').equals(NEGOCIO).toArray()
  }
  sales     = await db.ventas.where('negocio').equals(NEGOCIO).toArray()
  purchases = await db.facturas.where('negocio').equals(NEGOCIO).toArray()
  issues    = await db.incidencias.where('negocio').equals(NEGOCIO).toArray()
  auditLog  = await db.auditoria.where('negocio').equals(NEGOCIO).toArray()
}

async function registrarAudit(action, detail) {
  const entry = {negocio:NEGOCIO, date:stamp(), action, detail, origin: role==='admin'?'Administrador':'Empleado'}
  await db.auditoria.add(entry)
  auditLog.unshift(entry)
}

// ── TOAST ──────────────────────────────────────────────────────────────
function toast(msg, ok=true) {
  $('toastMsg').textContent = msg
  const t = $('toast')
  t.style.display = 'flex'
  t.style.background = ok ? 'var(--ink)' : 'var(--red)'
  clearTimeout(window._toast)
  window._toast = setTimeout(() => t.style.display = 'none', 2500)
}

// ── SIDEBAR ────────────────────────────────────────────────────────────
function toggleSidebar() { $('sidebar').classList.toggle('open'); $('sidebarOverlay').classList.toggle('open') }
function closeSidebar()  { $('sidebar').classList.remove('open'); $('sidebarOverlay').classList.remove('open') }

// ── MODALS ─────────────────────────────────────────────────────────────
function openModal(id)  { $(id).classList.add('open') }
function closeModal(id) { $(id).classList.remove('open') }

// ── PIN ────────────────────────────────────────────────────────────────
function openPinScreen() {
  pinBuffer = ''; updatePinDots()
  $('pinError').textContent = ''
  $('pinScreen').classList.add('open')
}
function closePinScreen() { $('pinScreen').classList.remove('open') }

function pinKey(k) {
  if (k === 'del')      { pinBuffer = pinBuffer.slice(0, -1) }
  else if (k === 'ok')  { checkPin(); return }
  else if (pinBuffer.length < 4) { pinBuffer += k }
  updatePinDots()
  if (pinBuffer.length === 4) setTimeout(checkPin, 120)
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) $('pd' + i).classList.toggle('filled', i < pinBuffer.length)
}

function checkPin() {
  if (pinBuffer === PIN_ADMIN) {
    closePinScreen(); activateAdmin()
  } else {
    $('pinError').textContent = 'PIN incorrecto. Intenta de nuevo.'
    pinBuffer = ''; updatePinDots()
    const box = document.querySelector('.pin-box')
    box.style.animation = 'none'
    setTimeout(() => { box.style.animation = 'shake .4s ease' }, 10)
  }
}

// ── ROLES ──────────────────────────────────────────────────────────────
function activateAdmin() {
  role = 'admin'; currentPage = 'dashboard'
  $('roleTag').textContent = 'Administrador'
  $('roleTag').classList.remove('emp')
  $('adminEntry').classList.remove('visible')
  buildNav(); showPage('dashboard')
  toast('Bienvenido, administrador')
}

function switchToEmployee() {
  role = 'employee'; currentPage = 'sale'
  $('roleTag').textContent = 'Empleado'
  $('roleTag').classList.add('emp')
  $('adminEntry').classList.add('visible')
  buildNav(); showPage('sale')
}

// ── NAVEGACION ─────────────────────────────────────────────────────────
function buildNav() {
  const list = role === 'admin' ? ADMIN_NAV : EMP_NAV
  $('nav').innerHTML = list.map(x => `
    <button class="nav-btn${currentPage === x[0] ? ' active' : ''}" data-page="${x[0]}" onclick="showPage('${x[0]}')">
      <span class="dot"></span>${x[2]}<span>${x[1]}</span>
    </button>`).join('')
  if (role === 'admin') {
    $('nav').innerHTML += `
    <button class="nav-btn" onclick="switchToEmployee()" style="margin-top:auto;border-top:1px solid #1E2A3D;padding-top:14px;margin-top:12px">
      <span class="dot"></span>
      <svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      <span>Vista empleado</span>
    </button>`
  }
}

function showPage(p) {
  currentPage = p
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'))
  const target = (role === 'admin' ? 'admin-' : 'employee-') + p
  $(target)?.classList.add('active')
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === p))
  $('topTitle').textContent = TITLES[p] || 'Mercaito'
  closeSidebar(); renderAll()
}

// ── HELPERS ────────────────────────────────────────────────────────────
function todaySales()  { return sales.filter(s => s.date === dateISO() && s.status !== 'void') }
function sum(arr)      { return arr.reduce((a, x) => a + x.total, 0) }
function stockBadge(p) { return p.stock === 0 ? '<span class="badge bad">Agotado</span>' : p.stock <= 5 ? '<span class="badge warn">Stock bajo</span>' : '<span class="badge ok">Disponible</span>' }
function methodBadge(m){ return m==='cash'?'<span class="badge ok">Efectivo</span>':m==='transfer'?'<span class="badge info">Transferencia</span>':'<span class="badge purple">Mixto</span>' }

// ── DASHBOARD ──────────────────────────────────────────────────────────
function renderDashboard() {
  const ss = todaySales(), total = sum(ss)
  const cash     = ss.reduce((a,s) => a + (s.cashAmount     ?? (s.method==='cash'     ? s.total : 0)), 0)
  const transfer = ss.reduce((a,s) => a + (s.transferAmount ?? (s.method==='transfer' ? s.total : 0)), 0)
  $('a-total').textContent    = money(total)
  $('a-count').textContent    = ss.length
  $('a-cash').textContent     = money(cash)
  $('a-transfer').textContent = money(transfer)
  $('a-products').textContent = products.length
  $('a-issues').textContent   = issues.filter(i => i.status === 'open').length
  $('a-stockvalue').textContent = money(products.reduce((a,p) => a + p.cost * p.stock, 0))
  $('recentSales').innerHTML = ss.length
    ? ss.slice().reverse().slice(0,8).map(s => `
      <tr>
        <td class="td-muted">${s.time}</td>
        <td>${s.items.map(i => i.n + (i.qty>1?' ×'+i.qty:'')).join(', ')}</td>
        <td>${methodBadge(s.method)}</td>
        <td class="td-green">${money(s.total)}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="empty">Sin ventas hoy.</td></tr>'
  const alerts = products.filter(p => p.stock <= 5 || (p.expiry && p.expiry <= dateISO()))
  $('alerts').innerHTML = alerts.length
    ? alerts.map(p => `
      <div class="report-row">
        <div><b style="font-size:13px">${p.n}</b><br><small style="color:var(--muted)">${p.stock===0?'Sin existencias':p.stock+' unidades'}${p.expiry&&p.expiry<=dateISO()?' · Revisar caducidad':''}</small></div>
        ${stockBadge(p)}
      </div>`).join('')
    : '<div class="empty">Sin alertas de inventario.</div>'
}

// ── INVENTARIO ─────────────────────────────────────────────────────────
function renderInventory() {
  const q   = ($('adminSearch').value || '').toLowerCase()
  const cat = $('adminCat').value
  const arr = products.filter(p => (!cat || p.cat === cat) && p.n.toLowerCase().includes(q))
  $('inventoryRows').innerHTML = arr.map(p => `
    <tr>
      <td class="td-strong">${p.n}</td><td>${p.cat}</td>
      <td class="td-price">${money(p.price)}</td><td>${money(p.cost)}</td>
      <td>${p.stock} ${stockBadge(p)}</td><td>${p.expiry || '—'}</td>
      <td>
        <button class="ico-btn" onclick="openProduct(${p.id})">Editar</button>
        <button class="ico-btn del" onclick="deleteProduct(${p.id})">Eliminar</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty">Sin productos.</td></tr>'
}

function fillSelects() {
  const opts = CATS.map(c => `<option>${c}</option>`).join('')
  $('prodCat').innerHTML       = opts
  $('adminCat').innerHTML      = '<option value="">Todas las categorias</option>' + opts
  $('issueProduct').innerHTML  = '<option value="">Producto no especificado</option>' + products.map(p => `<option value="${p.id}">${p.n}</option>`).join('')
  $('purchaseProduct').innerHTML  = '<option value="">Selecciona producto existente</option>' + products.map(p => `<option value="${p.id}">${p.n}</option>`).join('')
  $('purchaseCategory').innerHTML = opts
}

function openProduct(id) {
  $('editId').value = id || ''
  $('productModalTitle').textContent = id ? 'Editar producto' : 'Agregar producto'
  const p = products.find(x => x.id === id)
  $('prodName').value  = p?.n    || ''
  $('prodCat').value   = p?.cat  || CATS[0]
  $('prodPrice').value = p?.price ?? ''
  $('prodCost').value  = p?.cost  ?? ''
  $('prodStock').value = p?.stock ?? 0
  $('prodExpiry').value = p?.expiry || ''
  openModal('productModal')
}

async function saveProduct() {
  const id    = Number($('editId').value)
  const n     = $('prodName').value.trim()
  const price = Number($('prodPrice').value)
  const cost  = Number($('prodCost').value)
  const stock = Number($('prodStock').value)
  if (!n || $('prodPrice').value === '' || price < 0 || cost < 0 || stock < 0) {
    toast('Revisa los campos obligatorios', false); return
  }
  const p = {negocio:NEGOCIO, n, cat:$('prodCat').value, price, cost, stock, expiry:$('prodExpiry').value}
  if (id) {
    p.id = id; await db.productos.put(p)
    products = products.map(x => x.id === id ? p : x)
    await registrarAudit('Producto editado', n)
  } else {
    const newId = await db.productos.add(p); p.id = newId; products.push(p)
    await registrarAudit('Producto agregado', n)
  }
  await encolar('producto', p)
  closeModal('productModal'); fillSelects(); renderAll(); toast('Producto guardado')
}

async function deleteProduct(id) {
  const p = products.find(x => x.id === id)
  if (!confirm('Eliminar ' + p.n + ' del catálogo?')) return
  await db.productos.delete(id)
  products = products.filter(x => x.id !== id)
  await registrarAudit('Producto eliminado', p.n)
  fillSelects(); renderAll(); toast('Producto eliminado')
}

// ── PUNTO DE VENTA ─────────────────────────────────────────────────────
function renderSaleCats() {
  $('saleCats').innerHTML = ['Todos', ...new Set(products.map(p => p.cat))].map(c => `
    <button class="tab${saleCat===c?' active':''}" onclick="saleCat='${c}';renderSaleCats();renderSaleProducts()">${c}</button>`).join('')
}

function renderSaleProducts() {
  const q   = ($('saleSearch').value || '').toLowerCase()
  const arr = products.filter(p => (saleCat==='Todos' || p.cat===saleCat) && p.n.toLowerCase().includes(q))
  $('saleProducts').innerHTML = arr.map(p => `
    <div class="product${p.stock<=0?' disabled':''}" onclick="addCart(${p.id})">
      <div class="product-name">${p.n}</div>
      <div class="product-price">${money(p.price)}</div>
      <div class="product-stock">
        <span class="stock-dot${p.stock===0?' out':p.stock<=5?' low':''}"></span>
        ${p.stock<=0?'Sin stock':p.stock+' disponibles'}
      </div>
    </div>`).join('') || '<div class="empty">Sin productos.</div>'
}

function addCart(id) {
  const p = products.find(x => x.id === id)
  const it = cart.find(x => x.id === id)
  if (!p || p.stock < 1) return
  if (it) { if (it.qty >= p.stock) return; it.qty++ }
  else cart.push({id, n:p.n, price:p.price, qty:1})
  renderTicket()
}

function cartQty(id, d) {
  const it = cart.find(x => x.id === id)
  const p  = products.find(x => x.id === id)
  if (!it) return; it.qty += d
  if (it.qty < 1) cart = cart.filter(x => x.id !== id)
  else if (it.qty > p.stock) it.qty = p.stock
  renderTicket()
}

function clearTicket() { cart = []; renderTicket() }

function setPayMethod(m) {
  payMethod = m
  ;['cash','transfer','mixed'].forEach(x => $('payOpt' + x.charAt(0).toUpperCase() + x.slice(1))?.classList.remove('sel-'+x))
  $('payOpt' + m.charAt(0).toUpperCase() + m.slice(1))?.classList.add('sel-' + m)
  const total = cart.reduce((a,x) => a + x.price * x.qty, 0)
  $('payFields').innerHTML = m === 'cash' ? `
    <div class="form-group">
      <label class="field-label">Efectivo recibido (CUP)</label>
      <input class="field" id="received" type="number" min="0" step=".01" placeholder="0.00" oninput="updateChange()">
    </div>
    <div id="changeRow" class="change-row" style="display:none">
      <span>Vuelto</span><strong id="changeAmt">CUP 0.00</strong>
    </div>`
  : m === 'transfer' ? ''
  : `
    <div class="form-group">
      <label class="field-label">Parte en transferencia (CUP)</label>
      <input class="field" id="transferAmount" type="number" min="0" step=".01" value="0" oninput="updateChange()">
    </div>
    <div class="form-group">
      <label class="field-label">Efectivo recibido (CUP)</label>
      <input class="field" id="received" type="number" min="0" step=".01" placeholder="0.00" oninput="updateChange()">
    </div>
    <div id="changeRow" class="change-row" style="display:none">
      <span>Vuelto</span><strong id="changeAmt">CUP 0.00</strong>
    </div>`
  updateChange()
}

function updateChange() {
  const total    = cart.reduce((a,x) => a + x.price * x.qty, 0)
  const transfer = Math.max(0, Number($('transferAmount')?.value || 0))
  const cashDue  = Math.max(0, total - transfer)
  const received = Number($('received')?.value || 0)
  const changeRow = $('changeRow')
  if (changeRow) {
    const change = received - cashDue
    changeRow.style.display = received > 0 ? 'flex' : 'none'
    if ($('changeAmt')) {
      $('changeAmt').textContent = money(Math.max(0, change))
      $('changeAmt').style.color = change >= 0 ? 'var(--green)' : 'var(--red)'
    }
  }
}

function renderTicket() {
  const total = cart.reduce((a,x) => a + x.price * x.qty, 0)
  $('ticketItems').innerHTML = cart.length
    ? cart.map(x => `
      <div class="t-item">
        <div class="t-name">${x.n}<small>${money(x.price)} c/u</small></div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="cartQty(${x.id},-1)">−</button>
          <span class="t-qty">${x.qty}</span>
          <button class="qty-btn" onclick="cartQty(${x.id},1)">+</button>
        </div>
        <div class="t-price">${money(x.price * x.qty)}</div>
        <button class="t-del" onclick="cartQty(${x.id},-${x.qty})">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('')
    : '<div class="ticket-empty">Selecciona productos del catálogo</div>'
  $('ticketTotal').textContent = money(total)
  updateChange()
}

async function checkout() {
  if (!cart.length) { toast('Anade al menos un producto', false); return }
  const total    = cart.reduce((a,x) => a + x.price * x.qty, 0)
  const transfer = Math.max(0, Number($('transferAmount')?.value || 0))
  const cashDue  = Number((total - transfer).toFixed(2))
  const received = Number($('received')?.value || 0)
  if (transfer > total + .001) { toast('La transferencia no puede superar el total', false); return }
  if (cashDue > 0 && received < cashDue) { toast('El efectivo no cubre la parte pendiente', false); return }
  for (const it of cart) {
    const p = products.find(x => x.id === it.id)
    if (!p || p.stock < it.qty) { toast('Stock insuficiente: ' + it.n, false); return }
  }
  const change = Number((received - cashDue).toFixed(2))
  const method = transfer > 0 && cashDue > 0 ? 'mixed' : transfer > 0 ? 'transfer' : 'cash'
  const sale = {
    negocio:NEGOCIO, date:dateISO(), time:nowTime(),
    items: cart.map(x => ({...x})), total, method,
    cashAmount:cashDue, transferAmount:transfer, received, change,
    employee: ($('employeeName').value.trim() || 'Empleado 1'),
    shift: $('employeeShift').value,
    status: 'active'
  }
  const id = await db.ventas.add(sale); sale.id = id; sales.push(sale)
  for (const it of cart) {
    const p = products.find(x => x.id === it.id)
    p.stock -= it.qty; await db.productos.put(p)
  }
  await registrarAudit('Venta registrada', money(total) + ' · ' + sale.employee)
  await encolar('venta', sale)
  showCobroModal(sale)
  cart = []
  if ($('received'))       $('received').value = ''
  if ($('transferAmount')) $('transferAmount').value = '0'
  renderAll()
}

function showCobroModal(sale) {
  $('cobroEmp').textContent = sale.employee + ' · ' + sale.shift + ' · ' + sale.time
  $('cobroItems').innerHTML = '<p>Productos</p>' + sale.items.map(i =>
    `<div class="cobro-item-row"><span>${i.n} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('')
  let grid = `
    <div class="cobro-box"><div class="cobro-box-label">Total cobrado</div><div class="cobro-box-val big">${money(sale.total)}</div></div>
    <div class="cobro-box"><div class="cobro-box-label">Método</div><div class="cobro-box-val">${sale.method==='cash'?'Efectivo':sale.method==='transfer'?'Transferencia':'Mixto'}</div></div>`
  if (sale.cashAmount > 0) grid += `
    <div class="cobro-box"><div class="cobro-box-label">Efectivo recibido</div><div class="cobro-box-val">${money(sale.received)}</div></div>
    <div class="cobro-box"><div class="cobro-box-label">Vuelto</div><div class="cobro-box-val" style="color:var(--green)">${money(sale.change)}</div></div>`
  if (sale.transferAmount > 0) grid += `
    <div class="cobro-box"><div class="cobro-box-label">Transferencia</div><div class="cobro-box-val" style="color:var(--blue)">${money(sale.transferAmount)}</div></div>`
  $('cobroGrid').innerHTML = grid
  openModal('cobroModal')
}

// ── HISTORIAL EMPLEADO ─────────────────────────────────────────────────
function renderEmployeeHistory() {
  const ss = todaySales()
  $('e-count').textContent    = ss.length
  $('e-total').textContent    = money(sum(ss))
  $('e-cash').textContent     = money(ss.reduce((a,s) => a + (s.cashAmount     ?? (s.method==='cash'     ? s.total : 0)), 0))
  $('e-transfer').textContent = money(ss.reduce((a,s) => a + (s.transferAmount ?? (s.method==='transfer' ? s.total : 0)), 0))
  $('employeeSales').innerHTML = ss.slice().reverse().map(s => `
    <tr>
      <td class="td-muted">${s.time}</td>
      <td>${s.employee || '—'}<br><small class="td-muted">${s.shift || ''}</small></td>
      <td style="font-size:12px">${s.items.map(i => i.n + ' ×' + i.qty).join(', ')}</td>
      <td>${methodBadge(s.method)}</td>
      <td class="td-green">${money(s.total)}</td>
      <td>${s.status==='void'
        ? '<span class="badge bad">Anulada</span>'
        : `<button class="ico-btn" onclick="openSaleEdit(${s.id})">Editar</button>`}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">Sin ventas hoy.</td></tr>'
}

// ── INCIDENCIAS ────────────────────────────────────────────────────────
async function submitIssue() {
  const id   = Number($('issueProduct').value)
  const p    = products.find(x => x.id === id)
  const desc = $('issueDesc').value.trim()
  if (!desc) { toast('Describe el problema', false); return }
  const issue = {negocio:NEGOCIO, date:stamp(), product:p?.n || 'No especificado', type:$('issueType').value, desc, status:'open'}
  const issueId = await db.incidencias.add(issue); issue.id = issueId; issues.unshift(issue)
  $('issueDesc').value = ''
  await registrarAudit('Incidencia reportada', p?.n || 'Sin producto')
  renderIssues(); renderMyIssues(); toast('Incidencia enviada a administración')
}

function renderMyIssues() {
  $('myIssues').innerHTML = issues.length
    ? issues.slice(0,8).map(i => `
      <div class="report-row">
        <div><b style="font-size:13px">${i.product}</b><br><small style="color:var(--muted)">${i.type} · ${i.date}</small><br><span style="font-size:12px">${i.desc}</span></div>
        ${i.status==='open'?'<span class="badge warn">Pendiente</span>':'<span class="badge ok">Resuelta</span>'}
      </div>`).join('')
    : '<div class="empty">Sin incidencias enviadas.</div>'
}

function renderIssues() {
  renderCorrections()
  const f   = $('issueFilter')?.value || 'all'
  const arr = issues.filter(i => f==='all' || i.status===f)
  $('issueRows').innerHTML = arr.map(i => `
    <tr>
      <td class="td-muted" style="font-size:12px">${i.date}</td>
      <td class="td-strong">${i.product}</td><td>${i.type}</td><td>${i.desc}</td>
      <td>${i.status==='open'?'<span class="badge warn">Pendiente</span>':'<span class="badge ok">Resuelta</span>'}</td>
      <td>${i.status==='open'?`<button class="ico-btn" onclick="resolveIssue(${i.id})">Resolver</button>`:'—'}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">Sin incidencias.</td></tr>'
}

async function resolveIssue(id) {
  const i = issues.find(x => x.id === id)
  if (!i) return
  i.status = 'resolved'; await db.incidencias.put(i)
  await registrarAudit('Incidencia resuelta', i.product || '')
  renderIssues(); renderDashboard(); toast('Incidencia resuelta')
}

// ── COMPRAS ────────────────────────────────────────────────────────────
function renderPurchases() {
  const total = purchases.reduce((a,p) => a + p.total, 0)
  const units = purchases.reduce((a,p) => a + p.lines.reduce((b,l) => b + l.qty, 0), 0)
  $('p-count').textContent     = purchases.length
  $('p-total').textContent     = money(total)
  $('p-suppliers').textContent = new Set(purchases.map(p => p.supplier)).size
  $('p-units').textContent     = units
  $('purchaseRows').innerHTML  = purchases.slice().reverse().map(p => `
    <tr>
      <td class="td-muted">${p.date}</td><td class="td-strong">${p.invoice}</td><td>${p.supplier}</td>
      <td style="font-size:12px">${p.lines.map(l => l.name + ' ×' + l.qty).join(', ')}</td>
      <td class="td-price">${money(p.total)}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty">Sin facturas registradas.</td></tr>'
}

function openPurchase() {
  draftLines = []
  $('supplier').value = ''; $('invoice').value = ''; $('purchaseDate').value = dateISO()
  $('newPurchaseProduct').value = ''; $('purchaseQty').value = 1
  $('purchaseCost').value = ''; $('purchasePrice').value = ''
  fillSelects(); renderPurchaseDraft(); openModal('purchaseModal')
}

function suggestPurchasePrice() {
  const c = Number($('purchaseCost').value || 0)
  $('purchasePrice').value = c > 0 ? (c * 1.3).toFixed(2) : ''
}

function addPurchaseLine() {
  const id      = Number($('purchaseProduct').value)
  const p       = products.find(x => x.id === id)
  const newName = $('newPurchaseProduct').value.trim()
  const qty     = Number($('purchaseQty').value)
  const cost    = Number($('purchaseCost').value)
  const price   = $('purchasePrice').value === '' ? Number((cost * 1.3).toFixed(2)) : Number($('purchasePrice').value)
  if ((!p && !newName) || qty <= 0 || $('purchaseCost').value === '' || cost < 0 || price < 0) {
    toast('Completa producto, cantidad y costo', false); return
  }
  draftLines.push({id:id||null, name:p?.n||newName, cat:p?.cat||$('purchaseCategory').value||'Alimentos', qty, cost, price})
  $('newPurchaseProduct').value = ''; $('purchaseQty').value = 1
  $('purchaseCost').value = ''; $('purchasePrice').value = ''
  renderPurchaseDraft()
}

function renderPurchaseDraft() {
  $('purchaseDraft').innerHTML = draftLines.map((l,i) => `
    <div class="report-row">
      <span>${l.name} · ${l.qty} × ${money(l.cost)}
        <button class="ico-btn del" style="margin-left:6px" onclick="draftLines.splice(${i},1);renderPurchaseDraft()">Quitar</button>
      </span>
      <b>${money(l.qty * l.cost)}</b>
    </div>`).join('') || '<div class="empty" style="padding:16px">Anade articulos de la factura.</div>'
  $('purchaseDraftTotal').textContent = money(draftLines.reduce((a,l) => a + l.qty * l.cost, 0))
}

async function savePurchase() {
  const supplier = $('supplier').value.trim()
  const invoice  = $('invoice').value.trim()
  if (!supplier || !invoice || !draftLines.length) {
    toast('Completa proveedor, factura y articulos', false); return
  }
  for (const l of draftLines) {
    const p = l.id
      ? products.find(x => x.id === l.id)
      : products.find(x => x.n.toLowerCase() === l.name.toLowerCase())
    if (p) { p.stock += l.qty; p.cost = l.cost; p.price = l.price; await db.productos.put(p) }
    else {
      const np = {negocio:NEGOCIO, n:l.name, cat:l.cat||'Alimentos', price:l.price, cost:l.cost, stock:l.qty, expiry:''}
      const newId = await db.productos.add(np); np.id = newId; products.push(np)
    }
  }
  const purchase = {
    negocio:NEGOCIO, date:$('purchaseDate').value||dateISO(), supplier, invoice,
    lines: draftLines.map(x => ({...x})),
    total: draftLines.reduce((a,l) => a + l.qty * l.cost, 0)
  }
  const fId = await db.facturas.add(purchase); purchase.id = fId; purchases.push(purchase)
  await registrarAudit('Factura registrada', invoice + ' · ' + supplier)
  await encolar('factura', purchase)
  closeModal('purchaseModal'); fillSelects(); renderAll(); toast('Factura registrada — inventario actualizado')
}

// ── CORRECCION DE VENTAS ───────────────────────────────────────────────
function openSaleEdit(id) {
  const sale = sales.find(x => x.id === id)
  if (!sale || sale.status === 'void') return
  editingSaleId = id; $('editReason').value = ''
  $('editTransfer').value = Number(sale.transferAmount ?? (sale.method==='transfer' ? sale.total : 0))
  $('editReceived').value = Number(sale.received ?? sale.cashAmount ?? 0)
  $('editSaleItems').innerHTML = sale.items.map((it,i) => `
    <div class="report-row" style="align-items:center;gap:12px">
      <span style="flex:1"><b>${it.n}</b><br><small style="color:var(--muted)">Precio: ${money(it.price)}</small></span>
      <label style="font-size:13px;font-weight:600">Cant.
        <input class="field edit-item-qty" data-index="${i}" type="number" min="0" step="1" value="${it.qty}" style="width:80px;margin-top:4px" oninput="updateEditSaleTotals()">
      </label>
    </div>`).join('')
  updateEditSaleTotals(); openModal('editSaleModal')
}

function getEditedItems() {
  const sale = sales.find(x => x.id === editingSaleId)
  if (!sale) return []
  return sale.items.map((it,i) => ({
    ...it,
    qty: Math.max(0, Math.floor(Number(document.querySelector(`.edit-item-qty[data-index="${i}"]`)?.value || 0)))
  })).filter(it => it.qty > 0)
}

function updateEditSaleTotals() {
  if (!editingSaleId) return
  const items    = getEditedItems()
  const total    = items.reduce((a,x) => a + x.price * x.qty, 0)
  const transfer = Number($('editTransfer').value || 0)
  const cashDue  = Math.max(0, total - transfer)
  const received = Number($('editReceived').value || 0)
  $('editTotal').textContent   = money(total)
  $('editCashDue').textContent = money(cashDue)
  $('editChange').textContent  = money(Math.max(0, received - cashDue))
  $('editChange').style.color  = received >= cashDue ? 'var(--green)' : 'var(--red)'
}

async function saveSaleEdit() {
  const sale = sales.find(x => x.id === editingSaleId)
  if (!sale) return
  const reason = $('editReason').value.trim()
  if (!reason) { toast('Explica el motivo del cambio', false); $('editReason').focus(); return }
  const oldItems = sale.items.map(x => ({...x})), oldTotal = sale.total
  const newItems = getEditedItems()
  const newTotal = Number(newItems.reduce((a,x) => a + x.price * x.qty, 0).toFixed(2))
  const transfer = Number($('editTransfer').value || 0)
  const cashDue  = Number((newTotal - transfer).toFixed(2))
  const received = Number($('editReceived').value || 0)
  if (!newItems.length) { toast('La venta debe tener al menos un producto', false); return }
  if (transfer < 0 || transfer > newTotal) { toast('La transferencia debe estar entre 0 y el total', false); return }
  if (received < cashDue) { toast('El efectivo recibido no cubre la parte en efectivo', false); return }
  oldItems.forEach(it => { const p = products.find(x => x.id === it.id); if (p) p.stock += it.qty })
  for (const it of newItems) {
    const p = products.find(x => x.id === it.id)
    if (!p || p.stock < it.qty) {
      oldItems.forEach(o => { const pp = products.find(x => x.id === o.id); if (pp) pp.stock -= o.qty })
      toast('Stock insuficiente: ' + it.n, false); return
    }
  }
  for (const it of newItems) { const p = products.find(x => x.id === it.id); p.stock -= it.qty; await db.productos.put(p) }
  const change = Number((received - cashDue).toFixed(2))
  const method = transfer > 0 && cashDue > 0 ? 'mixed' : transfer > 0 ? 'transfer' : 'cash'
  const changeRecord = {
    date:stamp(), employee:sale.employee||'Empleado', reason,
    before:{items:oldItems, total:oldTotal},
    after:{items:newItems.map(x=>({...x})), total:newTotal, transfer, cash:cashDue, received, change}
  }
  sale.changes = sale.changes || []; sale.changes.push(changeRecord)
  sale.items = newItems; sale.total = newTotal; sale.transferAmount = transfer
  sale.cashAmount = cashDue; sale.received = received; sale.change = change; sale.method = method
  await db.ventas.put(sale)
  await registrarAudit('Venta corregida', 'Venta #' + sale.id + ' · ' + reason)
  closeModal('editSaleModal'); renderAll(); toast('Cambio guardado y registrado')
}

function renderCorrections() {
  const el = $('correctionRows'); if (!el) return
  const rows = []
  sales.forEach(s => (s.changes || []).forEach(c => rows.push({sale:s, change:c})))
  rows.sort((a,b) => b.change.date.localeCompare(a.change.date))
  el.innerHTML = rows.map(x => `
    <tr>
      <td class="td-muted" style="font-size:12px">${x.change.date}</td>
      <td>${x.change.employee}</td><td>#${x.sale.id}</td><td>${x.change.reason}</td>
      <td><button class="ico-btn" onclick="showSaleChange(${x.sale.id},'${encodeURIComponent(x.change.date)}')">Ver</button></td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty">Sin correcciones.</td></tr>'
}

function showSaleChange(id, dateEncoded) {
  const s = sales.find(x => x.id === id)
  const d = decodeURIComponent(dateEncoded)
  const c = s?.changes?.find(x => x.date === d); if (!c) return
  alert('VENTA #' + id + '\nMotivo: ' + c.reason +
    '\nAntes: ' + c.before.items.map(x => x.n + ' ×' + x.qty).join(', ') + ' — ' + money(c.before.total) +
    '\nDespues: ' + c.after.items.map(x => x.n + ' ×' + x.qty).join(', ') + ' — ' + money(c.after.total))
}

// ── REPORTES ───────────────────────────────────────────────────────────
function periodSales() {
  const p = $('reportPeriod').value, now = new Date()
  return sales.filter(s => s.status !== 'void').filter(s => {
    const d = new Date(s.date + 'T12:00:00')
    if (p === 'all') return true
    if (p === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    const q = Math.floor(now.getMonth() / 3)
    return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear()
  })
}

function renderReports() {
  const ss    = periodSales(), total = sum(ss)
  const units = ss.reduce((a,s) => a + s.items.reduce((b,i) => b + i.qty, 0), 0)
  $('rep-total').textContent   = money(total)
  $('rep-count').textContent   = ss.length
  $('rep-average').textContent = money(ss.length ? total / ss.length : 0)
  $('rep-units').textContent   = units
  const cash     = ss.reduce((a,s) => a + (s.cashAmount     ?? (s.method==='cash'     ? s.total : 0)), 0)
  const transfer = ss.reduce((a,s) => a + (s.transferAmount ?? (s.method==='transfer' ? s.total : 0)), 0)
  const max = Math.max(cash, transfer, 1)
  $('rep-pay').innerHTML = [['Efectivo',cash],['Transferencia',transfer]].map(x => `
    <div class="report-row"><span>${x[0]}</span><b>${money(x[1])}</b></div>
    <div class="bar" style="margin:0 0 14px"><span style="width:${x[1]/max*100}%"></span></div>`).join('')
  const top = {}
  ss.forEach(s => s.items.forEach(i => top[i.n] = (top[i.n] || 0) + i.qty))
  const ranked = Object.entries(top).sort((a,b) => b[1]-a[1]).slice(0,6)
  $('rep-products').innerHTML = ranked.map((x,i) =>
    `<div class="report-row"><span>${i+1}. ${x[0]}</span><b>${x[1]} ud</b></div>`).join('')
    || '<div class="empty">Sin ventas en este periodo.</div>'
  $('reportRows').innerHTML = ss.slice().reverse().map(s => `
    <tr>
      <td>${s.date}</td><td>${s.time}</td>
      <td>${s.items.map(i => i.n + ' x' + i.qty).join(', ')}</td>
      <td>${s.method==='mixed'?'Mixto':s.method==='cash'?'Efectivo':'Transferencia'}</td>
      <td class="td-strong">${money(s.total)}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty">Sin operaciones.</td></tr>'
}

function download(content, name, type) {
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([content],{type}))
  a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

function exportReport() {
  const ss   = periodSales()
  const rows = ['Fecha,Hora,Productos,Método,Total', ...ss.map(s =>
    [s.date,s.time,'"'+s.items.map(i=>i.n+' x'+i.qty).join('; ')+'"',s.method,s.total].join(','))]
  download(rows.join('\n'), 'reporte_ventas.csv', 'text/csv'); toast('Reporte exportado')
}

// ── CIERRE DE CAJA ─────────────────────────────────────────────────────
function openClose() {
  const ss       = todaySales(), total = sum(ss)
  const cash     = ss.reduce((a,s) => a + (s.cashAmount     ?? (s.method==='cash'     ? s.total : 0)), 0)
  const transfer = ss.reduce((a,s) => a + (s.transferAmount ?? (s.method==='transfer' ? s.total : 0)), 0)
  $('closeBody').innerHTML = `
    <div class="stats" style="grid-template-columns:1fr 1fr">
      <div class="stat"><label>Total vendido</label><strong>${money(total)}</strong></div>
      <div class="stat"><label>Transacciones</label><strong>${ss.length}</strong></div>
      <div class="stat s-green"><label>Efectivo esperado</label><strong>${money(cash)}</strong></div>
      <div class="stat s-blue"><label>Transferencias</label><strong>${money(transfer)}</strong></div>
    </div>
    <div class="form-group" style="margin-top:14px">
      <label class="field-label">Efectivo contado fisicamente (CUP)</label>
      <input class="field" id="cashCount" type="number" min="0" step=".01" placeholder="Introduce el efectivo contado" oninput="calcDifference(${cash})">
    </div>
    <div class="report-row"><span>Diferencia de caja</span><b id="cashDiff">—</b></div>`
  openModal('closeModal')
}

function calcDifference(expected) {
  const v = $('cashCount').value; if (v === '') { $('cashDiff').textContent = '—'; return }
  const d = Number(v) - expected
  $('cashDiff').textContent = money(d)
  $('cashDiff').style.color = Math.abs(d) < .005 ? 'var(--green)' : 'var(--red)'
}

function exportClose() {
  const ss       = todaySales(), total = sum(ss)
  const cash     = ss.reduce((a,s) => a + (s.cashAmount     ?? (s.method==='cash'     ? s.total : 0)), 0)
  const transfer = ss.reduce((a,s) => a + (s.transferAmount ?? (s.method==='transfer' ? s.total : 0)), 0)
  const count    = $('cashCount')?.value || ''
  const diff     = count === '' ? 'No informado' : money(Number(count) - cash)
  const txt = `CIERRE DE CAJA\nFecha: ${dateISO()}\nVentas: ${money(total)}\nEfectivo esperado: ${money(cash)}\nTransferencias: ${money(transfer)}\nEfectivo contado: ${count===''?'No informado':money(count)}\nDiferencia: ${diff}\nTransacciones: ${ss.length}\n`
  download(txt, 'cierre_' + dateISO() + '.txt', 'text/plain'); toast('Cierre exportado')
}

// ── AUDITORIA ──────────────────────────────────────────────────────────
function renderAudit() {
  $('auditRows').innerHTML = auditLog.map(a => `
    <tr>
      <td class="td-muted" style="font-size:12px">${a.date}</td>
      <td class="td-strong">${a.action}</td><td>${a.detail}</td><td>${a.origin}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty">Sin movimientos registrados.</td></tr>'
}

// ── RENDER GENERAL ─────────────────────────────────────────────────────
function renderAll() {
  fillSelects()
  if (role === 'admin') {
    if (currentPage==='dashboard')  renderDashboard()
    if (currentPage==='inventory')  renderInventory()
    if (currentPage==='purchases')  renderPurchases()
    if (currentPage==='reports')    renderReports()
    if (currentPage==='issues')     renderIssues()
    if (currentPage==='audit')      renderAudit()
  } else {
    if (currentPage==='sale')    { renderSaleCats(); renderSaleProducts(); renderTicket() }
    if (currentPage==='history')   renderEmployeeHistory()
    if (currentPage==='issues')    renderMyIssues()
  }
}

// ── EXPONER FUNCIONES AL HTML ──────────────────────────────────────────
// Necesario porque el HTML usa onclick= y el módulo tiene scope propio
Object.assign(window, {
  pinKey, openPinScreen, closePinScreen,
  toggleSidebar, closeSidebar,
  openModal, closeModal,
  showPage, switchToEmployee,
  openProduct, saveProduct, deleteProduct,
  addCart, cartQty, clearTicket,
  setPayMethod, updateChange, checkout,
  openSaleEdit, updateEditSaleTotals, saveSaleEdit, showSaleChange,
  submitIssue, resolveIssue,
  openPurchase, addPurchaseLine, suggestPurchasePrice, savePurchase,
  renderInventory, renderReports, renderIssues,
  openClose, calcDifference, exportClose, exportReport,
})

// ── ARRANQUE ───────────────────────────────────────────────────────────
;(async () => {
  try {
    await cargarDatos()
  } catch (e) {
    console.error('Error al cargar datos:', e)
    toast('Error al cargar la base de datos', false)
  }
  $('today').textContent = new Date().toLocaleDateString('es', {weekday:'long', day:'numeric', month:'long'})
  if ($('purchaseDate')) $('purchaseDate').value = dateISO()
  buildNav(); fillSelects()
  setPayMethod('cash')
  renderAll()
  actualizarIndicador(navigator.onLine)
  setTimeout(() => intentarSync(), 2000)
  setInterval(() => { if (navigator.onLine) intentarSync() }, 30000)
})()

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
