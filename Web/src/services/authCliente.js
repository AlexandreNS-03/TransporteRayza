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
