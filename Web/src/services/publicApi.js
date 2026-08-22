// Acceso a la API pública del backend (sin login).
import axios from "axios";
import { huellaDispositivo, prepararHuellaDispositivo } from "./yape";

const API = (import.meta.env.VITE_API_URL || "http://localhost:8080") + "/api/public";
const http = axios.create({ baseURL: API, timeout: 15000 });

function desempaquetarError(e) {
  const msg = e?.response?.data?.message || e?.message || "Error de conexión con el servidor";
  return new Error(msg);
}

// Rutas activas con paradas y tramos (para los combos Desde/Hacia).
export async function getRutas() {
  try { const { data } = await http.get("/rutas"); return data; }
  catch (e) { throw desempaquetarError(e); }
}

// Tramos que no se venden (orden de gerencia), para ocultarlos del buscador.
// Si falla, se devuelve vacío: el backend igual bloquea la venta.
export async function getReglasVenta() {
  try { const { data } = await http.get("/reglas-venta"); return data?.paresBloqueados || []; }
  catch (e) { return []; }
}

// Busca viajes. origen/destino/fecha son opcionales.
export async function buscarViajes({ origen, destino, fecha } = {}) {
  try { const { data } = await http.get("/viajes", { params: { origen, destino, fecha } }); return data; }
  catch (e) { throw desempaquetarError(e); }
}

// Anuncios activos y vigentes de un tipo (BARRA, MODAL o LANDING).
// Si falla, se devuelve vacío: un anuncio caído no debe tumbar la página.
export async function getAnuncios(tipo) {
  try { const { data } = await http.get("/anuncios", { params: { tipo } }); return data; }
  catch (e) { return []; }
}

// Mapa completo de asientos del viaje (incluye ocupados) para el tramo elegido.
export async function getAsientos(viajeId, ordenOrigen, ordenDestino) {
  try {
    const { data } = await http.get(`/viajes/${viajeId}/asientos`, { params: { ordenOrigen, ordenDestino } });
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

// Crea una reserva (retiene el asiento). token = JWT del cliente si está logueado.
export async function crearReserva(reserva, token) {
  try {
    const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const { data } = await http.post("/reservas", reserva, cfg);
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

// Reserva de varios pasajes (1 a 5) en una sola compra. Devuelve reservaIds + total.
export async function crearReservaGrupo(grupo, token) {
  try {
    const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const { data } = await http.post("/reservas/grupo", grupo, cfg);
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

/**
 * Avisa que el cliente se fue con el pago a medias, para que le llegue el correo
 * al toque en vez de esperar al recordatorio automático.
 *
 * Va con sendBeacon porque se dispara mientras la pestaña se está cerrando: el
 * navegador entrega el envío igual aunque la página ya no exista. Si no está
 * disponible, se usa fetch con keepalive. Nunca lanza error: es un aviso, no
 * puede estorbar a lo que el cliente esté haciendo.
 */
export function avisarAbandono(reservaIds) {
  if (!reservaIds?.length) return;
  const url = `${API}/reservas/abandono`;
  const cuerpo = JSON.stringify({ reservaIds });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([cuerpo], { type: "application/json" }));
      return;
    }
    fetch(url, { method: "POST", body: cuerpo, keepalive: true,
                 headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch { /* el recordatorio automático lo cubre igual */ }
}

/**
 * Reservas que siguen esperando pago. Se usa en la página a la que llega el cliente
 * desde el correo de "tu reserva tiene un pago pendiente".
 */
export async function reservasPendientes(ids) {
  try {
    const { data } = await http.get("/reservas/pendientes", { params: { ids } });
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

/** Formulario de Izipay para el total del grupo. */
export async function formularioDePagoGrupo(reservaIds) {
  try {
    const { data } = await http.post("/reservas/grupo/pago/formulario", { reservaIds });
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

/** Confirma el pago con tarjeta del grupo. */
export async function pagarGrupo(reservaIds, { krAnswer, krHash } = {}) {
  try {
    const { data } = await http.post("/reservas/grupo/pagar", { reservaIds, krAnswer, krHash });
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

/** Confirma el pago con Yape del grupo. */
export async function pagarConYapeGrupo(reservaIds, token) {
  try {
    const deviceId = await huellaDispositivo();
    const { data } = await http.post("/reservas/grupo/pagar/yape", { reservaIds, token, deviceId });
    return data;
  } catch (e) { throw desempaquetarError(e); }
}


/** Medios de pago configurados y sus claves públicas. Se consulta antes de elegir. */
export async function metodosDePago() {
  // Consultar los medios de pago es la señal de que se abrió una pantalla de pago:
  // se aprovecha para ir calculando la huella del dispositivo que pide Mercado Pago,
  // así está lista antes de cobrar y no se carga ese script en el resto de la web.
  prepararHuellaDispositivo();
  try {
    const { data } = await http.get("/reservas/metodos-de-pago");
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

/** Confirma el pago con Yape enviando el token que generó el SDK de Mercado Pago. */
export async function pagarConYape(reservaId, token) {
  try {
    const deviceId = await huellaDispositivo();
    const { data } = await http.post(`/reservas/${reservaId}/pagar/yape`, { token, deviceId });
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

/** Pide a Izipay el formulario de pago de esta reserva (lo arma el backend). */
export async function formularioDePago(reservaId) {
  try {
    const { data } = await http.post(`/reservas/${reservaId}/pago/formulario`);
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

/** Confirma el pago enviando la respuesta firmada de Izipay para que el servidor la verifique. */
export async function pagarReserva(reservaId, { krAnswer, krHash } = {}) {
  try {
    const { data } = await http.post(`/reservas/${reservaId}/pagar`, { krAnswer, krHash });
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

/** Datos completos de un boleto para imprimir el ticket de embarque (80mm / A4). */
export async function getTicket(ventaId) {
  try { const { data } = await http.get(`/reservas/${ventaId}/ticket`); return data; }
  catch (e) { throw desempaquetarError(e); }
}

/** Historial de boletos por correo o DNI, sin cuenta. */
export async function buscarBoletos({ correo, documento } = {}) {
  try {
    const params = correo ? { correo } : { documento };
    const { data } = await http.get("/boletos", { params });
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

export function soles(n) {
  return "S/ " + Number(n || 0).toFixed(2);
}

/**
 * Precio más bajo por día en un rango, para la tira de fechas. Si falla, devuelve
 * lista vacía: la tira sigue sirviendo para saltar de día, solo que sin precios.
 */
export async function preciosPorFecha({ origen, destino, desde, hasta } = {}) {
  if (!origen || !destino || !desde || !hasta) return [];
  try {
    const { data } = await http.get("/viajes/precios", { params: { origen, destino, desde, hasta } });
    return data;
  } catch (e) {
    console.warn("[preciosPorFecha] no se pudieron cargar los precios por día:", e?.message || e);
    return [];
  }
}

// ── Pago en línea de una encomienda ──
export async function formularioPagoEncomienda(codigo) {
  try { const { data } = await http.post(`/encomiendas/${encodeURIComponent(codigo)}/pago/formulario`); return data; }
  catch (e) { throw desempaquetarError(e); }
}

export async function pagarEncomienda(codigo, { krAnswer, krHash } = {}) {
  try { const { data } = await http.post(`/encomiendas/${encodeURIComponent(codigo)}/pagar`, { krAnswer, krHash }); return data; }
  catch (e) { throw desempaquetarError(e); }
}

export async function pagarEncomiendaYape(codigo, token) {
  try {
    const deviceId = await huellaDispositivo();
    const { data } = await http.post(`/encomiendas/${encodeURIComponent(codigo)}/pagar/yape`, { token, deviceId });
    return data;
  }
  catch (e) { throw desempaquetarError(e); }
}

// ── Rastreo público de encomiendas ──
export async function rastrearEncomienda(tab, valor) {
  const v = encodeURIComponent(String(valor || "").trim());
  const ruta = tab === "remitente" ? `/encomiendas/remitente/${v}`
             : tab === "destinatario" ? `/encomiendas/destinatario/${v}`
             : `/encomiendas/rastrear/${v}`;
  try { const { data } = await http.get(ruta); return data; }
  catch (e) { throw desempaquetarError(e); }
}
