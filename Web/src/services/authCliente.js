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
