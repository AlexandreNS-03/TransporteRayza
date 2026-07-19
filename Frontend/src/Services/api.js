// Servicio central de acceso a la API.
// - Agrega el token a cada petición
// - Detecta sesión expirada (JWT vencido o 401) y redirige al login
// - Convierte los errores del backend ({"message": ...}) en Error con mensaje legible

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
        throw new Error(mensaje);
    }

    if (res.status === 204) return null;
    const contentType = res.headers.get("content-type") || "";
    return contentType.includes("application/json") ? res.json() : null;
}

// Consultas RENIEC/SUNAT vía el proxy del backend
export async function consultarDni(dni) {
    return apiFetch(`/api/consulta/dni/${dni}`);
}

export async function consultarRuc(ruc) {
    return apiFetch(`/api/consulta/ruc/${ruc}`);
}

export default apiFetch;
