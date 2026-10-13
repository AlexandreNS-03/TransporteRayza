// Autenticación del cliente (público). Guarda token y datos en localStorage.
import axios from "axios";

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080");
const AUTH = BASE + "/auth/cliente";
const API = BASE + "/api/cliente";

const KEY_TOKEN = "rayza_cliente_token";
const KEY_CLIENTE = "rayza_cliente";

function err(e) {
  return new Error(e?.response?.data?.message || e?.message || "Error de conexión");
}

export function tokenCliente() { return localStorage.getItem(KEY_TOKEN); }
export function clienteActual() {
  try { return JSON.parse(localStorage.getItem(KEY_CLIENTE)); } catch { return null; }
}
export function estaLogueado() { return !!tokenCliente(); }

function guardarSesion(data) {
  localStorage.setItem(KEY_TOKEN, data.token);
  localStorage.setItem(KEY_CLIENTE, JSON.stringify(data.cliente));
  return data.cliente;
}

export function cerrarSesion() {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_CLIENTE);
}

export async function registrar(datos) {
  try { const { data } = await axios.post(`${AUTH}/register`, datos); return guardarSesion(data); }
  catch (e) { throw err(e); }
}

export async function login(email, password) {
  try { const { data } = await axios.post(`${AUTH}/login`, { email, password }); return guardarSesion(data); }
  catch (e) { throw err(e); }
}

function headers() { return { headers: { Authorization: `Bearer ${tokenCliente()}` } }; }

export async function getPerfil() {
  try { const { data } = await axios.get(`${API}/perfil`, headers()); return data; }
  catch (e) { throw err(e); }
}

export async function actualizarPerfil(datos) {
  try {
    const { data } = await axios.put(`${API}/perfil`, datos, headers());
    localStorage.setItem(KEY_CLIENTE, JSON.stringify(data));
    return data;
  } catch (e) { throw err(e); }
}

export async function getMisViajes() {
  try { const { data } = await axios.get(`${API}/viajes`, headers()); return data; }
  catch (e) { throw err(e); }
}

// ── Saldo a favor y pasajes por resolver (viaje cancelado) ──

export async function getSaldo() {
  try { const { data } = await axios.get(`${API}/saldo`, headers()); return data; }
  catch { return { saldo: 0, movimientos: [] }; }
}

export async function getPorResolver() {
  try { const { data } = await axios.get(`${API}/por-resolver`, headers()); return data; }
  catch { return []; }
}

export async function guardarComoSaldo(ventaId) {
  const { data } = await axios.patch(`${API}/pasajes/${ventaId}/saldo-favor`, {}, headers());
  return data;
}

export async function reprogramarPasaje(ventaId, viajeId) {
  const { data } = await axios.patch(`${API}/pasajes/${ventaId}/reprogramar`, { viajeId }, headers());
  return data;
}

/**
 * Pide el enlace para recuperar la contraseña.
 *
 * La respuesta es la misma exista o no la cuenta —el servidor no dice cuál es—,
 * así que acá tampoco se distingue: mostrar "ese correo no existe" dejaría que
 * cualquiera averigüe quién tiene cuenta.
 */
export async function pedirEnlaceRecuperacion(email) {
  try {
    const { data } = await axios.post(`${AUTH}/olvide-mi-clave`, { email });
    return data.message;
  } catch (e) { throw err(e); }
}

/** Cambia la contraseña con el token que llegó por correo. */
export async function restablecerClave(token, password) {
  try {
    const { data } = await axios.post(`${AUTH}/restablecer`, { token, password });
    return data.message;
  } catch (e) { throw err(e); }
}

/** Vuelve a pedir el enlace para confirmar el correo. */
export async function reenviarVerificacion() {
  try {
    const { data } = await axios.post(`${API}/verificar-correo/reenviar`, {}, headers());
    return data.message;
  } catch (e) { throw err(e); }
}

/** Pide el código al celular que tiene en su perfil. */
export async function enviarCodigoCelular() {
  try {
    const { data } = await axios.post(`${API}/verificar-celular/enviar`, {}, headers());
    return data.message;
  } catch (e) { throw err(e); }
}

/** Confirma el celular con el código que le llegó. */
export async function confirmarCelular(codigo) {
  try {
    const { data } = await axios.post(`${API}/verificar-celular`, { codigo }, headers());
    return data.message;
  } catch (e) { throw err(e); }
}

/** Confirma el correo con el token del enlace. No necesita sesión. */
export async function confirmarCorreo(token) {
  try {
    const { data } = await axios.post(`${AUTH}/verificar-correo`, { token });
    return data.message;
  } catch (e) { throw err(e); }
}

/* ── Notificaciones ──
   Por dónde le escribimos y para qué. */

export async function getMisNotificaciones() {
  try { const { data } = await axios.get(`${API}/notificaciones`, headers()); return data; }
  catch (e) { throw err(e); }
}

export async function guardarNotificaciones(prefs) {
  try { const { data } = await axios.put(`${API}/notificaciones`, prefs, headers()); return data; }
  catch (e) { throw err(e); }
}

/* ── Acompañantes frecuentes ──
   La gente con la que el cliente suele viajar, para no escribir sus datos en
   cada compra. Son datos de terceros: solo lo que ya se escribe al comprar. */

export async function getMisAcompanantes() {
  try { const { data } = await axios.get(`${API}/acompanantes`, headers()); return data; }
  catch (e) { throw err(e); }
}

export async function guardarAcompanante(a) {
  try { const { data } = await axios.post(`${API}/acompanantes`, a, headers()); return data; }
  catch (e) { throw err(e); }
}

export async function borrarAcompanante(id) {
  try {
    const { data } = await axios.delete(`${API}/acompanantes/${id}`, headers());
    return data.message;
  } catch (e) { throw err(e); }
}

/* ── Documentos de viaje ──
   Varios por cliente: acá se viaja con DNI dentro del país y con pasaporte o
   CPF cuando se cruza a Brasil. */

export async function getMisDocumentos() {
  try { const { data } = await axios.get(`${API}/documentos`, headers()); return data; }
  catch (e) { throw err(e); }
}

export async function guardarDocumento(doc) {
  try { const { data } = await axios.post(`${API}/documentos`, doc, headers()); return data; }
  catch (e) { throw err(e); }
}

export async function borrarDocumento(id) {
  try {
    const { data } = await axios.delete(`${API}/documentos/${id}`, headers());
    return data.message;
  } catch (e) { throw err(e); }
}

/* ── Comprobantes ──
   Las boletas y facturas del cliente, con el enlace al PDF en Nubefact. */

export async function getMisComprobantes() {
  try { const { data } = await axios.get(`${API}/comprobantes`, headers()); return data; }
  catch (e) { throw err(e); }
}

/* ── Seguridad de la cuenta ── */

/**
 * Cambia la contraseña estando dentro.
 *
 * Hasta ahora, quien quería cambiarla tenía que pasar por "olvidé mi clave" y
 * esperar un correo: el camino largo, y el único que había.
 */
export async function cambiarClave(actual, nueva) {
  try {
    const { data } = await axios.post(`${API}/cambiar-clave`, { actual, nueva }, headers());
    return data.message;
  } catch (e) { throw err(e); }
}

/* ── Métodos de pago guardados ──
   Tarjetas y Yape llegan en un solo listado: para el cliente son lo mismo.
   Nunca viaja el token, solo lo justo para reconocer cada uno. */

export async function getMetodosDePago() {
  try { const { data } = await axios.get(`${API}/metodos-de-pago`, headers()); return data; }
  catch { return []; }
}

export async function quitarMetodoDePago(tipo, id) {
  try {
    const { data } = await axios.delete(`${API}/metodos-de-pago/${tipo.toLowerCase()}/${id}`, headers());
    return data.message;
  } catch (e) { throw err(e); }
}

export async function marcarPreferida(id) {
  try {
    const { data } = await axios.patch(`${API}/metodos-de-pago/${id}/preferida`, {}, headers());
    return data.message;
  } catch (e) { throw err(e); }
}
