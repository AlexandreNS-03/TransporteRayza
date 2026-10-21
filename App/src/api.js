import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { token } from "./sesion";

/**
 * Cliente del backend.
 *
 * <p>La app no estrena API: usa exactamente los mismos endpoints que la web
 * (`/auth/cliente/*` y `/api/cliente/*`). Eso es a propósito — una regla de
 * negocio que vive en un solo lado no se puede contradecir a sí misma.
 *
 * <p><strong>Todo lo que se pide acá puede fallar por falta de señal</strong>, y
 * en el río eso no es el caso raro: es martes. Por eso los viajes se guardan en
 * el teléfono apenas llegan, y las pantallas saben dibujarse con lo guardado.
 */

/**
 * A qué servidor le habla la app.
 *
 * <p>En desarrollo se saca del propio servidor de Expo: `hostUri` trae la IP de
 * la máquina en la red local ("192.168.1.201:8081"), así que basta cambiarle el
 * puerto. Sin esto, probar en un teléfono de verdad no funciona nunca — para el
 * teléfono, `localhost` es el teléfono.
 *
 * <p>Para apuntar a otro lado, `RAYZA_API_URL` al generar la app, o
 * `extra.apiUrl` en app.json.
 */
function servidor() {
  const configurado = Constants.expoConfig?.extra?.apiUrl;
  if (configurado && !configurado.includes("localhost")) return configurado;

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:8080`;

  return configurado ?? "http://localhost:8080";
}

const BASE = servidor();

/** Si el servidor no contesta en este tiempo, se corta y se usa lo guardado. */
const ESPERA_MS = 12000;

class ErrorDeRed extends Error {
  constructor(mensaje) { super(mensaje); this.sinRed = true; }
}

async function pedir(ruta, opciones = {}, conSesion = true) {
  const cabeceras = { "Content-Type": "application/json", ...(opciones.headers ?? {}) };

  if (conSesion) {
    const t = await token();
    if (t) cabeceras.Authorization = `Bearer ${t}`;
  }

  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MS);

  let respuesta;
  try {
    respuesta = await fetch(BASE + ruta, { ...opciones, headers: cabeceras, signal: corte.signal });
  } catch {
    // Sin red, con el servidor caído o pasado el tiempo de espera: para quien
    // mira la pantalla las tres son lo mismo.
    throw new ErrorDeRed("No pudimos conectarnos. Revisa tu señal.");
  } finally {
    clearTimeout(reloj);
  }

  const texto = await respuesta.text();
  let cuerpo = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { /* no era JSON */ }

  if (!respuesta.ok) {
    // El backend contesta {"message": "..."} y esos mensajes están escritos
    // para que los lea un pasajero, así que se muestran tal cual.
    throw new Error(cuerpo?.message ?? "No se pudo completar la operación");
  }
  return cuerpo;
}

export function esFaltaDeSenal(e) {
  return !!e?.sinRed;
}

/* ── Cuenta ── */

export function ingresar(email, password) {
  return pedir("/auth/cliente/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, false);
}

export function perfil() {
  return pedir("/api/cliente/perfil");
}

/* ── Viajes ── */

const LLAVE_VIAJES = "rayza_viajes";

/**
 * Los viajes del cliente, guardándolos para cuando no haya señal.
 *
 * <p>El guardado ocurre siempre que la respuesta llega bien. No se guarda un
 * error ni una lista vacía por falta de red: el boleto de mañana tiene que
 * seguir estando aunque hoy se haya abierto la app en el medio del río.
 */
export async function misViajes() {
  const viajes = await pedir("/api/cliente/viajes");
  try {
    await AsyncStorage.setItem(LLAVE_VIAJES, JSON.stringify({
      guardadoAt: new Date().toISOString(),
      viajes,
    }));
  } catch { /* si no se pudo guardar, igual devolvemos lo que llegó */ }
  return viajes;
}

/** Lo último que se alcanzó a guardar, o null. */
export async function viajesGuardados() {
  try {
    const crudo = await AsyncStorage.getItem(LLAVE_VIAJES);
    return crudo ? JSON.parse(crudo) : null;
  } catch { return null; }
}

export function miWallet() {
  return pedir("/api/cliente/wallet");
}
