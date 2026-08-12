// Servicio central de acceso a la API.
// - Agrega el token a cada petición
// - Detecta sesión expirada (JWT vencido o 401) y redirige al login
// - Convierte los errores del backend ({"message": ...}) en Error con mensaje legible

import { reportarError } from "./errores.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function token() {
    return localStorage.getItem("token");
}

export function usuarioActual() {
    try { return JSON.parse(localStorage.getItem("usuario")); }
    catch { return null; }
}

function tokenExpirado(t) {
    try {
        const payload = JSON.parse(atob(t.split(".")[1]));
        return payload.exp && payload.exp * 1000 < Date.now();
    } catch {
        return false;
    }
}

export function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/";
}

export async function apiFetch(url, opts = {}) {
    const t = token();

    // Sesión vencida: limpiar y volver al login antes de llamar al backend
    if (!t || tokenExpirado(t)) {
        cerrarSesion();
        throw new Error("Sesión expirada. Inicia sesión nuevamente.");
    }

    const res = await fetch(`${API}${url}`, {
        ...opts,
        headers: {
            "Authorization": `Bearer ${t}`,
            "Content-Type": "application/json",
            ...opts.headers
        }
    });

    if (res.status === 401) {
        cerrarSesion();
        throw new Error("Sesión expirada. Inicia sesión nuevamente.");
    }

    if (!res.ok) {
        let mensaje = "Error al procesar la solicitud";
        try {
            const data = await res.json();
            mensaje = data.message || data.error || data.mensaje || mensaje;
        } catch { /* respuesta sin cuerpo JSON */ }
        // El código va adjunto: hay pantallas que reaccionan distinto a un 404
        // (endpoint que todavía no existe) que a un error del servidor.
        const error = new Error(mensaje);
        error.status = res.status;
        throw error;
    }

    if (res.status === 204) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;

    // Se lee como texto y se convierte acá, en vez de res.json(), para poder decir
    // algo útil cuando la respuesta llega cortada o mezclada: con res.json() el
    // usuario veía el error crudo del navegador ("Expected ':' after property
    // name in JSON at position 1140995"), que no le dice nada a nadie.
    const texto = await res.text();
    try {
        return JSON.parse(texto);
    } catch (e) {
        reportarRespuestaRota(url, texto, e);
        throw new Error("La respuesta del servidor llegó incompleta o dañada. "
            + "Suele ser la conexión; vuelve a intentarlo. Ya se avisó al equipo.");
    }
}

/**
 * Manda el caso a Soporte con lo justo para poder diagnosticarlo: cuánto llegó y
 * qué había alrededor del punto donde se cortó. Sin esto solo queda "salió un
 * error raro" y no hay forma de saber qué pasó.
 */
function reportarRespuestaRota(url, texto, error) {
    try {
        const pos = Number(/position (\d+)/.exec(error.message)?.[1] ?? -1);
        const alrededor = pos >= 0
            ? texto.slice(Math.max(0, pos - 120), pos + 120)
            : texto.slice(0, 240);
        reportarError(`Respuesta JSON inválida en ${url}`,
            `${error.message}\n`
            + `Tamaño recibido: ${texto.length} caracteres\n`
            + `Termina en: ${JSON.stringify(texto.slice(-80))}\n`
            + `Alrededor del corte: ${JSON.stringify(alrededor)}`);
    } catch { /* el reporte nunca debe tapar el error original */ }
}

/**
 * Igual que apiFetch pero devuelve el archivo tal cual (ZIP, PDF). Se usa para el
 * respaldo, que no es JSON.
 */
export async function apiBlob(url) {
    const t = token();
    if (!t || tokenExpirado(t)) {
        cerrarSesion();
        throw new Error("Sesión expirada. Inicia sesión nuevamente.");
    }
    const res = await fetch(`${API}${url}`, { headers: { "Authorization": `Bearer ${t}` } });
    if (res.status === 401) {
        cerrarSesion();
        throw new Error("Sesión expirada. Inicia sesión nuevamente.");
    }
    if (!res.ok) {
        const error = new Error("No se pudo generar el archivo");
        error.status = res.status;
        throw error;
    }
    return res.blob();
}

/**
 * Saca el motivo real de una respuesta fallida.
 *
 * El backend explica qué pasó ("El asiento #12 acaba de ser tomado por otra
 * venta", "Solo puedes vender viajes de tu sucursal"), pero varias pantallas que
 * usan fetch directo tiraban ese mensaje y mostraban uno genérico. El empleado
 * quedaba sin saber qué hacer.
 *
 * @param res      la respuesta con error
 * @param respaldo qué decir si el servidor no explicó nada
 */
export async function motivoDelError(res, respaldo) {
    try {
        const datos = await res.json();
        const motivo = datos?.message || datos?.mensaje || datos?.error;
        if (motivo && String(motivo).trim()) return String(motivo);
    } catch { /* respuesta sin cuerpo legible */ }

    // Sin explicación del servidor, al menos se dice qué se puede hacer.
    if (res.status === 403) return "No tienes permiso para hacer esto. Consulta con el administrador.";
    if (res.status === 404) return `${respaldo}: no se encontró lo que se pedía. Actualiza la pantalla e intenta de nuevo.`;
    if (res.status >= 500)  return `${respaldo}. El servidor tuvo un problema; vuelve a intentarlo en un momento.`;
    return respaldo;
}

// Consultas RENIEC/SUNAT vía el proxy del backend
export async function consultarDni(dni) {
    return apiFetch(`/api/consulta/dni/${dni}`);
}

export async function consultarRuc(ruc) {
    return apiFetch(`/api/consulta/ruc/${ruc}`);
}

export default apiFetch;
