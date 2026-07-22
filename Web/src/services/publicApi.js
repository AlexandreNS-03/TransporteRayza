// Acceso a la API pública del backend (sin login).
import axios from "axios";

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

// Busca viajes. origen/destino/fecha son opcionales.
export async function buscarViajes({ origen, destino, fecha } = {}) {
  try { const { data } = await http.get("/viajes", { params: { origen, destino, fecha } }); return data; }
  catch (e) { throw desempaquetarError(e); }
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

// Procesa el pago de una reserva con el token de Culqi.
export async function pagarReserva(reservaId, culqiToken, email) {
  try {
    const { data } = await http.post(`/reservas/${reservaId}/pagar`, { token: culqiToken, email });
    return data;
  } catch (e) { throw desempaquetarError(e); }
}

export function soles(n) {
  return "S/ " + Number(n || 0).toFixed(2);
}
