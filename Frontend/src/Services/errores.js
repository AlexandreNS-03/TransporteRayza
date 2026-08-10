// Avisa al sistema cuando algo revienta en el navegador del personal.
//
// Va al mismo buzón público que la web del cliente: así el aviso sale aunque el
// error ocurra antes de iniciar sesión o justo cuando el token venció.

const API = (import.meta.env.VITE_API_URL || "http://localhost:8080") + "/api/public";

/** Un mismo error no se manda dos veces en la misma sesión. */
const yaEnviados = new Set();

export function reportarError(mensaje, detalle) {
    try {
        if (!mensaje) return;
        const huella = `${mensaje}|${location.pathname}`;
        if (yaEnviados.has(huella)) return;
        yaEnviados.add(huella);

        let quien = "";
        try {
            const u = JSON.parse(localStorage.getItem("usuario") || "null");
            if (u) quien = `Usuario: ${u.username} (${u.rol})\n`;
        } catch { /* sin sesión */ }

        fetch(`${API}/errores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mensaje: `[Sistema administrativo] ${String(mensaje).slice(0, 1900)}`,
                detalle: quien + (detalle ? String(detalle).slice(0, 1900) : ""),
                ruta: location.pathname + location.search,
                navegador: navigator.userAgent,
            }),
            keepalive: true,
        }).catch(() => { /* si no se puede avisar, no se insiste */ });
    } catch { /* el reporte de errores jamás debe romper nada */ }
}

/** Engancha los errores que nadie atrapó y las promesas rechazadas. */
export function escucharErrores() {
    window.addEventListener("error", (e) => {
        reportarError(e.message, `${e.filename || ""}:${e.lineno || 0}\n${e.error?.stack || ""}`);
    });
    window.addEventListener("unhandledrejection", (e) => {
        const r = e.reason;
        // Sesión vencida no es una falla: la app ya redirige al login.
        if (r?.message?.includes("Sesión expirada")) return;
        reportarError(r?.message || String(r), r?.stack || "");
    });
}
